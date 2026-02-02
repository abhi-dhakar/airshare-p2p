"use client";
import { useEffect, Suspense } from "react";
import { Send, Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import useAppStore from "@/store/useAppStore";
import SenderView from "@/components/SenderView";
import ReceiverView from "@/components/ReceiverView";
import useWakeLock from "@/hooks/useWakeLock";
import usePreventClose from "@/hooks/usePreventClose";

// We create a wrapper component to handle the SearchParams and Suspense requirement
export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
          <div className="animate-pulse">Loading AirShare...</div>
        </main>
      }
    >
      <AirShareApp />
    </Suspense>
  );
}

function AirShareApp() {
  const { screen, setScreen, transferStatus } = useAppStore();
  const searchParams = useSearchParams();

  // Detect if there is a 'join' code in the URL (e.g., ?join=123456)
  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode && screen === "home") {
      // If a code is detected, move to receiver screen automatically
      setScreen("receiver");
    }
  }, [searchParams, screen, setScreen]);

  const isActive = transferStatus === "transferring";
  useWakeLock(isActive);
  usePreventClose(isActive);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 text-white relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="absolute top-6 left-6 font-bold text-xl tracking-tighter flex items-center gap-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full" />
        AirShare
      </div>

      {/* HOME SCREEN */}
      {screen === "home" && (
        <div className="flex flex-col items-center gap-8 fade-in w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Share Instantly.
            </h1>
            <p className="text-gray-400 text-lg">
              No size limits. No servers. P2P encrypted.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            {/* SEND BUTTON */}
            <button
              onClick={() => setScreen("sender")}
              className="flex flex-col items-center justify-center gap-4 bg-blue-600 hover:bg-blue-500 text-white p-8 rounded-2xl transition-all hover:scale-105 shadow-lg shadow-blue-500/20 group"
            >
              <div className="bg-white/20 p-4 rounded-full group-hover:bg-white/30 transition-colors">
                <Send size={32} />
              </div>
              <span className="text-xl font-bold">Send</span>
            </button>

            {/* RECEIVE BUTTON */}
            <button
              onClick={() => setScreen("receiver")}
              className="flex flex-col items-center justify-center gap-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white p-8 rounded-2xl transition-all hover:scale-105 group"
            >
              <div className="bg-gray-700 p-4 rounded-full group-hover:bg-gray-600 transition-colors">
                <Download size={32} />
              </div>
              <span className="text-xl font-bold">Receive</span>
            </button>
          </div>
        </div>
      )}

      {screen === "sender" && <SenderView />}
      {screen === "receiver" && <ReceiverView />}
    </main>
  );
}
