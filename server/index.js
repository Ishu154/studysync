import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { InMemoryRoomStore } from "../src/shared/roomStore.ts";
import { CloudProvider } from "../src/shared/cloudProvider.ts";
import { AICommandHandler } from "../src/shared/aiCommandHandler.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables if .env exists
try {
  if (typeof process.loadEnvFile === "function") {
    const rootEnv = join(__dirname, "..", ".env");
    process.loadEnvFile(rootEnv);
  }
} catch {
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile();
    }
  } catch {
    // .env file is optional in local development
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production" ? true : "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Decoupled board & room storage
const roomStore = new InMemoryRoomStore();

// Cloud Diagram Provider & AI Command Handler
const cloudProvider = new CloudProvider();
const aiHandler = new AICommandHandler(roomStore, cloudProvider, io);

// Health check endpoint
app.get("/health", async (req, res) => {
  const roomsCount = await roomStore.roomCount();
  res.status(200).json({ status: "healthy", rooms: roomsCount });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "../dist")));

  // Handle SPA routing - must be after other routes
  app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "../dist/index.html"));
  });
}

io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.id}`);

  const { roomId, userId } = socket.handshake.query;

  if (!roomId || !userId) {
    socket.disconnect(true);
    return;
  }

  // Join room
  socket.join(roomId);

  // Initialize room and ensure StudyBot virtual participant presence
  await roomStore.getOrCreateRoom(roomId);
  await aiHandler.ensureStudyBotPresence(roomId);

  const user = {
    id: userId,
    socketId: socket.id,
    name: `User ${userId.slice(0, 6)}`,
    color: generateUserColor(),
    isActive: true,
    joinedAt: Date.now(),
  };

  await roomStore.addUser(roomId, user);

  // Notify others about new user
  socket.to(roomId).emit("user-joined", user);

  // Send current elements batch to new user
  const elements = await roomStore.getElements(roomId);
  socket.emit("elements-batch", elements);

  // Send current users (including StudyBot) to new user
  const currentUsers = await roomStore.getUsers(roomId);
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
  socket.on("element-created", async (element) => {
    await roomStore.addElement(roomId, element);
    socket.to(roomId).emit("element-created", element);
  });

  // Handle element updates
  socket.on("element-updated", async (element) => {
    await roomStore.updateElement(roomId, element);
    socket.to(roomId).emit("element-updated", element);
  });

  // Handle element deletion
  socket.on("element-deleted", async (elementId) => {
    await roomStore.deleteElement(roomId, elementId);
    socket.to(roomId).emit("element-deleted", elementId);
  });

  // Handle room chat messages
  socket.on("chat:message", (message) => {
    io.to(roomId).emit("chat:message", message);
  });

  // Handle Ask StudyBot command
  socket.on("ai:command", async (data) => {
    const targetRoomId = data?.roomId || roomId;
    const prompt = data?.prompt;
    const selectedIds = data?.selectedIds;

    const allUsers = await roomStore.getUsers(targetRoomId);
    const sender = allUsers.find((u) => u.id === userId);
    const userName = sender?.name || `User ${userId.slice(0, 6)}`;

    await aiHandler.handleCommand(
      socket,
      targetRoomId,
      prompt,
      userName,
      selectedIds
    );
  });

  // Handle client-generated ops from Local WebLLM
  socket.on("ai:client-ops", async (data) => {
    const targetRoomId = data?.roomId || roomId;
    const ops = data?.ops;
    const prompt = data?.prompt || "Local Diagram";
    const commandId = data?.commandId;

    const allUsers = await roomStore.getUsers(targetRoomId);
    const sender = allUsers.find((u) => u.id === userId);
    const userName = sender?.name || `User ${userId.slice(0, 6)}`;

    await aiHandler.handleClientGeneratedOps(
      socket,
      targetRoomId,
      ops,
      userName,
      prompt,
      commandId
    );
  });

  // Handle Undo AI (reverts all ops of the last command)
  socket.on("undo-ai", async (data) => {
    const targetRoomId = data?.roomId || roomId;
    const targetCommandId = data?.commandId;
    await aiHandler.handleUndoAI(targetRoomId, targetCommandId);
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.id}`);
    await roomStore.removeUser(roomId, userId);
    socket.to(roomId).emit("user-left", userId);
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
