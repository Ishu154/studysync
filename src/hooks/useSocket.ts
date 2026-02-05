import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io, Socket } from "socket.io-client";
import { RootState } from "../store";
import {
  setConnected,
  setConnectionStatus,
  addUser,
  removeUser,
  updateUserCursor,
  addElement,
  updateElement,
  deleteElement,
  setElements,
} from "../store/whiteboardSlice";
import { DrawingElement, User, Point } from "../types";

export const useSocket = (roomId: string) => {
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);
  const currentUser = useSelector(
    (state: RootState) => state.whiteboard.currentUser
  );

  useEffect(() => {
    if (!roomId || !currentUser) return;

    dispatch(setConnectionStatus("connecting"));

    // Connect to socket server
    const socketUrl =
      process.env.NODE_ENV === "production"
        ? window.location.origin
        : "http://localhost:3001";
    socketRef.current = io(socketUrl, {
      query: { roomId, userId: currentUser.id },
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      dispatch(setConnectionStatus("connected"));
    });

    socket.on("disconnect", () => {
      dispatch(setConnectionStatus("disconnected"));
    });

    socket.on("connect_error", () => {
      dispatch(setConnectionStatus("disconnected"));
    });

    socket.on("reconnect", () => {
      dispatch(setConnectionStatus("connected"));
    });

    socket.on("reconnect_error", () => {
      dispatch(setConnectionStatus("disconnected"));
    });

    socket.on("user-joined", (user: User) => {
      dispatch(addUser(user));
    });

    socket.on("user-left", (userId: string) => {
      dispatch(removeUser(userId));
    });

    socket.on("user-cursor", (data: { userId: string; cursor: Point }) => {
      dispatch(updateUserCursor(data));
    });

    socket.on("element-created", (element: DrawingElement) => {
      dispatch(addElement(element));
    });

    socket.on("element-updated", (element: DrawingElement) => {
      dispatch(updateElement(element));
    });

    socket.on("element-deleted", (elementId: string) => {
      dispatch(deleteElement(elementId));
    });

    socket.on("elements-batch", (elements: DrawingElement[]) => {
      dispatch(setElements(elements));
    });

    return () => {
      socket.disconnect();
      dispatch(setConnectionStatus("disconnected"));
    };
  }, [roomId, currentUser, dispatch]);

  const emitCursor = (cursor: Point) => {
    if (socketRef.current && socketRef.current.connected && currentUser) {
      socketRef.current.emit("user-cursor", { userId: currentUser.id, cursor });
    }
  };

  const emitElementCreated = (element: DrawingElement) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("element-created", element);
    }
  };

  const emitElementUpdated = (element: DrawingElement) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("element-updated", element);
    }
  };

  const emitElementDeleted = (elementId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("element-deleted", elementId);
    }
  };

  return {
    socket: socketRef.current,
    emitCursor,
    emitElementCreated,
    emitElementUpdated,
    emitElementDeleted,
  };
};
