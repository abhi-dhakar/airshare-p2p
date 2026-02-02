import { useEffect, useMemo } from "react";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  Lock,
  Send,
  Smartphone,
  FileUp,
  File,
  X,
} from "lucide-react";
import QRCode from "react-qr-code";
import useAppStore from "@/store/useAppStore";
import { socket } from "@/services/socket";
import { rtcManager } from "@/services/webrtc";
import ProgressRing from "./ProgressRing";
import FileDropzone from "./FileDropzone";
import NetworkBadge from "./NetworkBadge";

export default function SenderView() {
  const {
    file,
    setFile,
    reset,
    resetTransfer,
    roomId,
    setRoomId,
    isConnected,
    setIsConnected,
    p2pStatus,
    setP2PStatus,
    transferProgress,
    transferStatus,
    connectionType,
  } = useAppStore();

  // Create a preview if the selected file is an image
  const filePreview = useMemo(() => {
    if (file && file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
      socket.emit("create_room");
    }

    // Room created by server
    socket.on("room_created", (id) => setRoomId(id));

    // Receiver found the room and joined
    socket.on("peer_joined", async () => {
      setIsConnected(true);
      setP2PStatus("connecting");
      // Use the current roomId from the store to start WebRTC handshake
      await rtcManager.initialize(useAppStore.getState().roomId, true);
    });

    // Handle WebRTC signaling messages
    socket.on("signal", (data) => rtcManager.handleSignal(data));

    return () => {
      socket.off("room_created");
      socket.off("peer_joined");
      socket.off("signal");
    };
  }, [setRoomId, setIsConnected, setP2PStatus]);

  const handleCancel = () => {
    rtcManager.close();
    socket.disconnect();
    reset();
  };

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
  };

  const handleSendFile = () => {
    if (file) {
      rtcManager.sendFile(file);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const renderCardContent = () => {
    // 1. Transfer in progress
    if (transferStatus === "transferring") {
      return (
        <div className="flex flex-col items-center animate-fade-in py-6">
          <div className="mb-6 scale-110">
            <ProgressRing progress={transferProgress} size={140} />
          </div>
          <p className="font-bold text-xl text-gray-800">Sending File...</p>
          <p className="text-gray-500 text-sm mt-2">Do not close this tab</p>
        </div>
      );
    }

    // 2. Transfer completed successfully
    if (transferStatus === "completed") {
      return (
        <div className="flex flex-col items-center animate-fade-in py-6">
          <div className="text-green-500 mb-6 scale-125">
            <CheckCircle size={80} />
          </div>
          <p className="font-bold text-2xl text-gray-800 mb-2">
            Sent Successfully!
          </p>
          <p className="text-gray-500 text-sm mb-6">Peer received the file.</p>

          <button
            onClick={resetTransfer}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30"
          >
            <FileUp size={20} /> Send Another File
          </button>
        </div>
      );
    }

    // 3. Peer connected, waiting for sender to pick a file
    if (file && transferStatus === "idle") {
      return (
        <div className="flex flex-col items-center animate-fade-in w-full">
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            Ready to Send
          </h3>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl w-full mb-6 flex flex-col items-center relative">
            <button
              onClick={handleRemoveFile}
              className="absolute top-2 right-2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 text-gray-600 transition"
            >
              <X size={16} />
            </button>

            <div className="mb-3">
              {filePreview ? (
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                  <File size={40} />
                </div>
              )}
            </div>

            <p className="font-semibold text-gray-800 text-center break-all px-2">
              {file.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>

          <button
            onClick={handleSendFile}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
          >
            <Send size={22} /> Send Now
          </button>
        </div>
      );
    }

    // 4. P2P Tunnel Established
    if (isConnected && p2pStatus === "connected") {
      return (
        <div className="w-full animate-fade-in">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-green-600 bg-green-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <Lock size={12} /> Secure Connection
            </div>
            <div className="mb-4">
              <NetworkBadge type={connectionType} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">
              Select file to send
            </h3>
          </div>
          <FileDropzone onFileSelect={handleFileSelect} />
        </div>
      );
    }

    // 5. Negotiating Handshake
    if (isConnected) {
      return (
        <div className="flex flex-col items-center animate-fade-in py-6">
          <Loader2 className="animate-spin text-blue-500 mb-6" size={64} />
          <p className="font-bold text-xl text-gray-800">Connecting...</p>
          <p className="text-gray-400 text-sm mt-2">Securing P2P Tunnel</p>
        </div>
      );
    }

    // 6. Default State: Show QR and Code for Pairing
    return (
      <div className="flex flex-col items-center py-2">
        <div className="bg-white p-2 rounded-lg mb-6">
          {roomId ? (
            <QRCode
              // Dynamically create a URL that opens the app and joins this room
              value={`${window.location.origin}/?join=${roomId}`}
              size={180}
            />
          ) : (
            <div className="w-44 h-44 bg-gray-200 animate-pulse rounded" />
          )}
        </div>
        <p className="text-gray-900 text-center font-bold text-5xl tracking-widest font-mono">
          {roomId || "..."}
        </p>
        <div className="mt-6 flex items-center gap-2 text-gray-400 text-sm bg-gray-50 px-4 py-2 rounded-full">
          <Smartphone size={16} />
          Scan to connect instantly
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md fade-in">
      <button
        onClick={handleCancel}
        className="self-start mb-6 text-gray-400 hover:text-white flex items-center gap-2"
      >
        <ArrowLeft size={20} /> Cancel
      </button>

      <div className="text-center mb-8 flex flex-col items-center w-full">
        <h2 className="text-2xl font-bold mb-2">
          {!isConnected
            ? "Pair Devices"
            : transferStatus === "completed"
              ? "Done"
              : "AirShare"}
        </h2>
      </div>

      <div className="bg-white p-6 rounded-2xl mb-6 shadow-xl w-full min-h-[400px] flex items-center justify-center">
        {renderCardContent()}
      </div>
    </div>
  );
}
