import { socket } from "./socket";
import useAppStore from "@/store/useAppStore";

const CHUNK_SIZE = 256 * 1024; // 256KB chunks (Much faster than 64KB)
const MAX_BUFFER_AMOUNT = 2 * 1024 * 1024; // 2MB Buffer (Keep the pipe full)

class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.roomId = null;
    this.incomingFile = {
      buffer: [],
      receivedSize: 0,
      meta: null,
    };
  }

  // Helper to fetch TURN servers
  async getIceServers() {
    // 1. If no keys are set, fallback to Google's free STUN
    const domain = process.env.NEXT_PUBLIC_METERED_DOMAIN;
    const apiKey = process.env.NEXT_PUBLIC_METERED_API_KEY;

    if (!domain || !apiKey) {
      console.warn("⚠️ Metered credentials missing. Using fallback STUN.");
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }

    // 2. Fetch from Metered API
    try {
      const response = await fetch(
        `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`,
      );
      const iceServers = await response.json();
      return iceServers;
    } catch (error) {
      console.error("❌ Failed to fetch TURN credentials:", error);
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  }

  // Initialize is now Async!
  async initialize(roomId, isInitiator) {
    this.roomId = roomId;
    if (this.peerConnection) this.close();

    // 1. Get ICE Config (STUN + TURN)
    const iceServers = await this.getIceServers();

    // 2. Create Connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: iceServers,
      iceCandidatePoolSize: 10,
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", {
          type: "ice-candidate",
          payload: event.candidate,
          roomId: this.roomId,
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log("WebRTC State:", this.peerConnection.connectionState);
    };

    if (isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel("file-transfer");
      this.setupDataChannelListeners();
      this.createOffer();
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannelListeners();
      };
    }
  }

  setupDataChannelListeners() {
    this.dataChannel.bufferedAmountLowThreshold = 0;

    this.dataChannel.onopen = () => {
      console.log("✅ DATA CHANNEL OPEN");
      useAppStore.getState().setP2PStatus("connected");
    };

    this.dataChannel.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };

    this.dataChannel.onerror = (error) => {
      console.error("Data Channel Error:", error);
    };
  }

  // --- SENDER LOGIC ---
  async sendFile(file) {
    const { setTransferStatus, setTransferProgress } = useAppStore.getState();
    setTransferStatus("transferring");

    // Send Metadata
    this.dataChannel.send(
      JSON.stringify({
        type: "metadata",
        name: file.name,
        size: file.size,
        fileType: file.type,
      }),
    );

    let offset = 0;

    const processNextChunk = async () => {
      // Check if we are done
      if (offset >= file.size) {
        this.dataChannel.send("EOF");
        setTransferStatus("completed");
        return;
      }

      // BACKPRESSURE: If buffer is full, wait.
      if (this.dataChannel.bufferedAmount > MAX_BUFFER_AMOUNT) {
        this.dataChannel.onbufferedamountlow = () => {
          this.dataChannel.onbufferedamountlow = null;
          processNextChunk();
        };
        return;
      }

      // Read chunk using modern Blob.arrayBuffer() - Faster than FileReader
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      try {
        const buffer = await chunk.arrayBuffer();
        this.dataChannel.send(buffer);

        offset += buffer.byteLength;

        // Update UI Progress
        const progress = Math.round((offset / file.size) * 100);
        setTransferProgress(progress);

        // Recursive call for next chunk
        processNextChunk();
      } catch (err) {
        console.error("Transfer Error:", err);
        setTimeout(processNextChunk, 100);
      }
    };

    processNextChunk();
  }

  // --- RECEIVER LOGIC ---
  handleIncomingMessage(data) {
    const { setTransferStatus, setTransferProgress } = useAppStore.getState();

    // 1. Metadata
    if (typeof data === "string" && data.includes('"type":"metadata"')) {
      const meta = JSON.parse(data);
      const safeName = meta.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      this.incomingFile.meta = { ...meta, name: safeName };
      this.incomingFile.buffer = [];
      this.incomingFile.receivedSize = 0;
      setTransferStatus("transferring");
      return;
    }

    // 2. EOF
    if (data === "EOF") {
      this.finalizeDownload();
      return;
    }

    // 3. Binary Chunk
    if (data instanceof ArrayBuffer) {
      this.incomingFile.buffer.push(data);
      this.incomingFile.receivedSize += data.byteLength;

      if (this.incomingFile.meta) {
        const progress = Math.round(
          (this.incomingFile.receivedSize / this.incomingFile.meta.size) * 100,
        );
        setTransferProgress(progress);
      }
    }
  }

  finalizeDownload() {
    const { setTransferStatus, setReceivedFile } = useAppStore.getState();
    const { meta, buffer } = this.incomingFile;

    const blob = new Blob(buffer, { type: meta.fileType });
    const url = URL.createObjectURL(blob);

    setReceivedFile({
      url: url,
      name: meta.name,
      size: meta.size,
    });

    this.incomingFile.buffer = [];
    setTransferStatus("completed");
  }

  // --- SIGNALING ---
  async createOffer() {
    if (!this.peerConnection) return;
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      socket.emit("signal", {
        type: "offer",
        payload: offer,
        roomId: this.roomId,
      });
    } catch (e) {
      console.error("Offer Error", e);
    }
  }

  async handleSignal(data) {
    if (!this.peerConnection) return;
    try {
      if (data.type === "offer") {
        await this.peerConnection.setRemoteDescription(data.payload);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        socket.emit("signal", {
          type: "answer",
          payload: answer,
          roomId: this.roomId,
        });
      } else if (data.type === "answer") {
        await this.peerConnection.setRemoteDescription(data.payload);
      } else if (data.type === "ice-candidate") {
        await this.peerConnection.addIceCandidate(data.payload);
      }
    } catch (e) {
      console.error("Signaling error", e);
    }
  }

  close() {
    if (this.dataChannel) this.dataChannel.close();
    if (this.peerConnection) this.peerConnection.close();
    this.peerConnection = null;
    this.dataChannel = null;
  }
}

export const rtcManager = new WebRTCManager();
