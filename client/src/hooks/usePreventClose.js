import { useEffect } from "react";

export default function usePreventClose(shouldPrevent) {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (shouldPrevent) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    };

    if (shouldPrevent) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldPrevent]);
}
