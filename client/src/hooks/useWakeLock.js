import { useEffect, useRef } from "react";

export default function useWakeLock(shouldLock) {
  const wakeLock = useRef(null);

  useEffect(() => {
    const requestLock = async () => {
      if (shouldLock && "wakeLock" in navigator) {
        try {
          wakeLock.current = await navigator.wakeLock.request("screen");
          console.log("Wake Lock active 💡");
        } catch (err) {
          console.error("Wake Lock failed:", err);
        }
      }
    };

    const releaseLock = async () => {
      if (wakeLock.current) {
        await wakeLock.current.release();
        wakeLock.current = null;
        console.log("Wake Lock released 🌑");
      }
    };

    if (shouldLock) {
      requestLock();
    } else {
      releaseLock();
    }

    // Re-acquire lock if tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && shouldLock) {
        requestLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      releaseLock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [shouldLock]);
}
