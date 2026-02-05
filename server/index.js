import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production" ? true : "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Store room data
const rooms = new Map();

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", rooms: rooms.size });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "../dist")));

  // Handle SPA routing - must be after other routes
  app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "../dist/index.html"));
  });
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  const { roomId, userId } = socket.handshake.query;

  if (!roomId || !userId) {
    socket.disconnect(true);
    return;
  }

  // Join room
  socket.join(roomId);

  // Initialize room if it doesn't exist
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      elements: [],
    });
  }

  const room = rooms.get(roomId);

  // Add user to room
  const user = {
    id: userId,
    socketId: socket.id,
    name: `User ${userId.slice(0, 6)}`,
    color: generateUserColor(),
    isActive: true,
    joinedAt: Date.now(),
  };

  room.users.set(userId, user);

  // Notify others about new user
  socket.to(roomId).emit("user-joined", user);

  // Send current state to new user
  socket.emit("elements-batch", room.elements);

  // Send current users to new user
  const currentUsers = Array.from(room.users.values());
  currentUsers.forEach((u) => {
    if (u.id !== userId) {
      socket.emit("user-joined", u);
    }
  });

  // Handle user cursor movement
  socket.on("user-cursor", (data) => {
    socket.to(roomId).emit("user-cursor", data);
  });

  // Handle element creation
  socket.on("element-created", (element) => {
    room.elements.push(element);
    socket.to(roomId).emit("element-created", element);
  });

  // Handle element updates
  socket.on("element-updated", (element) => {
    const index = room.elements.findIndex((el) => el.id === element.id);
    if (index !== -1) {
      room.elements[index] = element;
    }
    socket.to(roomId).emit("element-updated", element);
  });

  // Handle element deletion
  socket.on("element-deleted", (elementId) => {
    room.elements = room.elements.filter((el) => el.id !== elementId);
    socket.to(roomId).emit("element-deleted", elementId);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    if (room && room.users.has(userId)) {
      room.users.delete(userId);
      socket.to(roomId).emit("user-left", userId);

      // Clean up empty rooms
      if (room.users.size === 0) {
        rooms.delete(roomId);
      }
    }
  });
});

function generateUserColor() {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
