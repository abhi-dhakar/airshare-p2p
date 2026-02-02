import io from "socket.io-client";

// Connect to the backend
// Note: On a real phone, 'localhost' won't work. We will handle this in testing.
const SOCKET_URL = "http://localhost:3001";

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We connect manually when needed
});
