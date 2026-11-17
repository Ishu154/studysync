import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io, Socket } from "socket.io-client";
import { RootState } from "../store";
import {
  setConnectionStatus,
  addUser,
  removeUser,
  updateUserCursor,
  addElement,
  updateElement,
  deleteElement,
  setElements,
  setAIStatus,
  addChatMessage,
} from "../store/whiteboardSlice";
import { DrawingElement, User, Point } from "../types";
import { AIStatusPayload, ChatMessage } from "../shared/aiTypes";
import { v4 as uuidv4 } from "uuid";

let sharedSocket: Socket | null = null;
let currentSocketKey = "";
let activeConsumers = 0;

export const useSocket = (roomId: string) => {
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);
  const currentUser = useSelector(
    (state: RootState) => state.whiteboard.currentUser
  );

  useEffect(() => {
    if (!roomId || !currentUser) return;

    activeConsumers++;
    const socketKey = `${roomId}:${currentUser.id}`;

    // Initialize or reuse singleton socket connection across components
    if (!sharedSocket || currentSocketKey !== socketKey || !sharedSocket.connected) {
      if (sharedSocket) {
        sharedSocket.removeAllListeners();
        sharedSocket.disconnect();
      }
      currentSocketKey = socketKey;
      dispatch(setConnectionStatus("connecting"));

      const socketUrl =
        process.env.NODE_ENV === "production"
          ? window.location.origin
          : "http://localhost:3001";

      sharedSocket = io(socketUrl, {
        query: { roomId, userId: currentUser.id },
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      const s = sharedSocket;

      s.on("connect", () => {
        dispatch(setConnectionStatus("connected"));
      });

      s.on("disconnect", () => {
        dispatch(setConnectionStatus("disconnected"));
      });

      s.on("connect_error", () => {
        dispatch(setConnectionStatus("disconnected"));
      });

      s.on("reconnect", () => {
        dispatch(setConnectionStatus("connected"));
      });

      s.on("reconnect_error", () => {
        dispatch(setConnectionStatus("disconnected"));
      });

      s.on("user-joined", (user: User) => {
        dispatch(addUser(user));
      });

      s.on("user-left", (userId: string) => {
        dispatch(removeUser(userId));
      });

      s.on("user-cursor", (data: { userId: string; cursor: Point }) => {
        dispatch(updateUserCursor(data));
      });

      s.on("element-created", (element: DrawingElement) => {
        dispatch(addElement(element));
      });

      s.on("element-updated", (element: DrawingElement) => {
        dispatch(updateElement(element));
      });

      s.on("element-deleted", (elementId: string) => {
        dispatch(deleteElement(elementId));
      });

      s.on("elements-batch", (elements: DrawingElement[]) => {
        dispatch(setElements(elements));
      });

      s.on("ai:status", (payload: AIStatusPayload) => {
        dispatch(setAIStatus(payload));
      });

      s.on("chat:message", (message: ChatMessage) => {
        dispatch(addChatMessage(message));
      });
    } else {
      dispatch(setConnectionStatus(sharedSocket.connected ? "connected" : "connecting"));
    }

    socketRef.current = sharedSocket;

    return () => {
      activeConsumers = Math.max(0, activeConsumers - 1);
      // Only disconnect when all components referencing the socket unmount
      if (activeConsumers === 0 && sharedSocket) {
        sharedSocket.removeAllListeners();
        sharedSocket.disconnect();
        sharedSocket = null;
        currentSocketKey = "";
        dispatch(setConnectionStatus("disconnected"));
      }
    };
  }, [roomId, currentUser, dispatch]);

  const emitCursor = (cursor: Point) => {
    const s = sharedSocket || socketRef.current;
    if (s && s.connected && currentUser) {
      s.emit("user-cursor", { userId: currentUser.id, cursor });
    }
  };

  const emitElementCreated = (element: DrawingElement) => {
    const s = sharedSocket || socketRef.current;
    if (s && s.connected) {
      s.emit("element-created", element);
    }
  };

  const emitElementUpdated = (element: DrawingElement) => {
    const s = sharedSocket || socketRef.current;
    if (s && s.connected) {
      s.emit("element-updated", element);
    }
  };

  const emitElementDeleted = (elementId: string) => {
    const s = sharedSocket || socketRef.current;
    if (s && s.connected) {
      s.emit("element-deleted", elementId);
    }
  };

  const sendAICommand = (prompt: string, selectedIds?: string[]) => {
    const s = sharedSocket || socketRef.current;
    if (s && s.connected) {
      s.emit("ai:command", { roomId, prompt, selectedIds });
    }
  };

  const sendClientOps = (ops: unknown[], prompt: string, commandId?: string) => {
    const s = sharedSocket || socketRef.current;
    if (s && s.connected) {
      s.emit("ai:client-ops", { roomId, ops, prompt, commandId });
    }
  };

  const undoAI = (commandId?: string) => {
    const s = sharedSocket || socketRef.current;
    if (s && s.connected) {
      s.emit("undo-ai", { roomId, commandId });
    }
  };

  const sendChatMessage = (text: string) => {
    const s = sharedSocket || socketRef.current;
    if (s && s.connected && currentUser) {
      const msg: ChatMessage = {
        id: uuidv4(),
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        text,
        timestamp: Date.now(),
      };
      s.emit("chat:message", msg);
    }
  };

  return {
    socket: socketRef.current,
    emitCursor,
    emitElementCreated,
    emitElementUpdated,
    emitElementDeleted,
    sendAICommand,
    sendClientOps,
    undoAI,
    sendChatMessage,
  };
};
