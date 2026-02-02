import { create } from "zustand";

const useAppStore = create((set) => ({
  screen: "home",
  file: null,
  roomId: null,
  isConnected: false,
  p2pStatus: "disconnected",
  transferProgress: 0,
  transferStatus: "idle",
  receivedFile: null, // NEW: Stores { url, name, size }

  // Actions
  setScreen: (screen) => set({ screen }),
  setFile: (file) => set({ file }),
  setRoomId: (roomId) => set({ roomId }),
  setIsConnected: (status) => set({ isConnected: status }),
  setP2PStatus: (status) => set({ p2pStatus: status }),
  setTransferProgress: (progress) => set({ transferProgress: progress }),
  setTransferStatus: (status) => set({ transferStatus: status }),

  // NEW Action
  setReceivedFile: (fileData) => set({ receivedFile: fileData }),

  reset: () =>
    set({
      screen: "home",
      file: null,
      roomId: null,
      isConnected: false,
      p2pStatus: "disconnected",
      transferProgress: 0,
      transferStatus: "idle",
      receivedFile: null,
    }),

  // Reset for next file
  resetTransfer: () =>
    set((state) => {
      // Revoke old URL to free memory
      if (state.receivedFile?.url) {
        URL.revokeObjectURL(state.receivedFile.url);
      }
      return {
        file: null,
        transferProgress: 0,
        transferStatus: "idle",
        receivedFile: null,
      };
    }),
}));

export default useAppStore;
