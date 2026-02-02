import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle,
  Lock,
  FileCheck,
  RefreshCw,
  Save,
} from "lucide-react";
import useAppStore from "@/store/useAppStore";
import { socket } from "@/services/socket";
import { rtcManager } from "@/services/webrtc";
import ProgressRing from "./ProgressRing";

export default function ReceiverView() {
  const {
    reset,
    resetTransfer,
    isConnected,
    setIsConnected,
    p2pStatus,
    setP2PStatus,
    transferProgress,
    transferStatus,
    receivedFile, // Get the file info from store
  } = useAppStore();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("peer_joined", () => {
      setLoading(false);
      setIsConnected(true);
      setP2PStatus("connecting");
    });

    socket.on("error", (msg) => {
      setLoading(false);
      setError(msg);
      rtcManager.close();
    });

    socket.on("signal", (data) => rtcManager.handleSignal(data));

    return () => {
      socket.off("peer_joined");
      socket.off("error");
      socket.off("signal");
    };
  }, [setIsConnected, setP2PStatus]);

  const handleCancel = () => {
    rtcManager.close();
    socket.disconnect();
    reset();
  };

const handleJoin = async () => {
  if (code.length !== 6) {
    setError("Code must be 6 digits");
    return;
  }
  setError("");
  setLoading(true);

  // Initialize first (Fetch TURN keys), THEN join
  await rtcManager.initialize(code, false);

  socket.emit("join_room", code);
};

  // NEW: Handle Manual Save
  const handleSaveFile = () => {
    if (receivedFile && receivedFile.url) {
      const a = document.createElement("a");
      a.href = receivedFile.url;
      a.download = receivedFile.name;
      document.body.appendChild(a); // Required for Firefox
      a.click();
      document.body.removeChild(a);
    }
  };

  const renderCardContent = () => {
    // 1. Transferring
    if (transferStatus === "transferring") {
      return (
        <div className="flex flex-col items-center animate-fade-in py-6">
          <div className="mb-6 scale-110">
            <ProgressRing progress={transferProgress} size={140} />
          </div>
          <p className="font-bold text-xl text-gray-800">Downloading...</p>
          <p className="text-gray-500 text-sm mt-2">Receiving data chunks</p>
        </div>
      );
    }

    // 2. Completed -> SHOW SAVE BUTTON
    if (transferStatus === "completed") {
      return (
        <div className="flex flex-col items-center animate-fade-in py-6 w-full">
          <div className="text-green-500 mb-4 scale-110">
            <CheckCircle size={80} />
          </div>
          <p className="font-bold text-2xl text-gray-800 mb-2">
            Transfer Complete
          </p>

          {/* File Info */}
          <div className="bg-gray-50 p-4 rounded-xl w-full mb-6 border border-gray-100">
            <p className="font-semibold text-gray-700 truncate text-center">
              {receivedFile?.name || "Unknown File"}
            </p>
            <p className="text-sm text-gray-400 text-center">
              {receivedFile?.size
                ? (receivedFile.size / 1024 / 1024).toFixed(2) + " MB"
                : ""}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            {/* PRIMARY BUTTON: SAVE */}
            <button
              onClick={handleSaveFile}
              className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
            >
              <Save size={24} /> Save to Device
            </button>

            {/* SECONDARY BUTTON: NEXT */}
            <button
              onClick={resetTransfer}
              className="w-full px-6 py-3 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} /> Receive Another
            </button>
          </div>
        </div>
      );
    }

    // 3. Connected
    if (isConnected) {
      return (
        <div className="flex flex-col items-center animate-fade-in py-6">
          {p2pStatus === "connected" ? (
            <>
              <div className="text-green-500 mb-6 scale-110">
                <CheckCircle size={80} />
              </div>
              <p className="text-gray-800 text-xl font-bold mb-2">Connected</p>
              <div className="flex items-center gap-2 text-green-700 bg-green-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <Lock size={12} /> Encrypted
              </div>
              <p className="text-gray-500 text-center">
                Waiting for sender to start...
              </p>
            </>
          ) : (
            <>
              <Loader2 className="animate-spin text-blue-500 mb-6" size={64} />
              <p className="text-gray-800 text-xl font-bold">Connecting...</p>
              <p className="text-gray-400 mt-2">Exchanging Keys</p>
            </>
          )}
        </div>
      );
    }

    // 4. Input State
    return (
      <div className="w-full py-4">
        <div className="w-full relative mb-8">
          <label className="block text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
            Pairing Code
          </label>
          <input
            type="number"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000 000"
            className="w-full bg-gray-100 border-2 border-transparent focus:border-blue-500 text-gray-900 text-4xl text-center py-6 rounded-xl outline-none tracking-widest placeholder-gray-300 font-mono transition-all"
          />
          {error && (
            <p className="text-red-500 text-sm mt-2 absolute font-medium">
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/30"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Download size={24} />
          )}
          {loading ? "Connecting..." : "Receive File"}
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md fade-in">
      <button
        onClick={handleCancel}
        className="self-start mb-6 text-gray-400 hover:text-white flex items-center gap-2"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <h2 className="text-2xl font-bold mb-6">
        {isConnected ? "Connection Status" : "Receive File"}
      </h2>

      <div className="w-full bg-white p-6 rounded-2xl shadow-xl min-h-[380px] flex items-center justify-center">
        {renderCardContent()}
      </div>
    </div>
  );
}
