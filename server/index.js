// server/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow mobile phones to connect
    methods: ["GET", "POST"],
  },
});

// Helper: Generate 6-digit code
const generateRoomId = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. SENDER: Create a Room
  socket.on("create_room", () => {
    let roomId = generateRoomId();
    // Ensure uniqueness (simple check)
    while (io.sockets.adapter.rooms.get(roomId)) {
      roomId = generateRoomId();
    }

    socket.join(roomId);
    socket.emit("room_created", roomId);
    console.log(`Room Created: ${roomId} by ${socket.id}`);
  });

  // 2. RECEIVER: Join a Room
  socket.on("join_room", (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);

    if (!room || room.size === 0) {
      socket.emit("error", "Room not found");
      return;
    }

    if (room.size >= 2) {
      socket.emit("error", "Room is full");
      return;
    }

    socket.join(roomId);

    // Notify BOTH users that they are connected
    io.to(roomId).emit("peer_joined");
    console.log(`User ${socket.id} joined room ${roomId}`);
  });
  
  // 3. SIGNALING RELAY (The "Dumb Pipe")
  // data = { type: "offer"|"answer"|"ice-candidate", payload: ..., roomId: ... }
  socket.on("signal", (data) => {
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(data.roomId).emit("signal", data);
    // Debug log (optional, remove in prod)
    // console.log(`Signal ${data.type} relayed in room ${data.roomId}`);
  });

  // Handle Disconnect
  socket.on("disconnecting", () => {
    // Notify others in the room
    socket.rooms.forEach((room) => {
      socket.to(room).emit("peer_disconnected");
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
