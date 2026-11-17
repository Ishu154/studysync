import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeUserPrompt, validateGraphOps, GraphOp } from './schema';
import { graphOpsToDrawingElements } from './layout';
import { IRoomStore } from './roomStore';
import { DiagramProvider, AIStatusPayload, ChatMessage, BoardContext } from './aiTypes';
import { DrawingElement, User } from '../types';

export interface RateLimitConfig {
  maxPerSocketPerMin: number;
  maxPerRoomPerMin: number;
}

export class RateLimiter {
  private socketWindows = new Map<string, number[]>();
  private roomWindows = new Map<string, number[]>();
  private readonly config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxPerSocketPerMin: config?.maxPerSocketPerMin || 5,
      maxPerRoomPerMin: config?.maxPerRoomPerMin || 10,
    };
  }

  public check(socketId: string, roomId: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const windowMs = 60 * 1000;

    // Check socket limit
    const socketTimestamps = (this.socketWindows.get(socketId) || []).filter(t => now - t < windowMs);
    if (socketTimestamps.length >= this.config.maxPerSocketPerMin) {
      return { allowed: false, reason: 'Rate limit exceeded for this connection. Please wait a minute.' };
    }
    socketTimestamps.push(now);
    this.socketWindows.set(socketId, socketTimestamps);

    // Check room limit
    const roomTimestamps = (this.roomWindows.get(roomId) || []).filter(t => now - t < windowMs);
    if (roomTimestamps.length >= this.config.maxPerRoomPerMin) {
      return { allowed: false, reason: 'Rate limit exceeded for this study room. Please wait a moment.' };
    }
    roomTimestamps.push(now);
    this.roomWindows.set(roomId, roomTimestamps);

    return { allowed: true };
  }

  public reset(): void {
    this.socketWindows.clear();
    this.roomWindows.clear();
  }
}

export interface QueuedCommand {
  commandId: string;
  roomId: string;
  prompt: string;
  socketId: string;
  userName: string;
  selectedIds?: string[];
  precompiledOps?: GraphOp[];
  isLocalMode?: boolean;
}

export class AICommandHandler {
  private activeRoomCommands = new Set<string>();
  private roomQueues = new Map<string, QueuedCommand[]>();
  private rateLimiter: RateLimiter;
  private roomStore: IRoomStore;
  private provider: DiagramProvider;
  private lastRoomCommandId = new Map<string, string>();
  private io?: Server;
  public stepDelayMs = 50; // Delay between drawing elements for smooth, fast live animation

  constructor(
    roomStore: IRoomStore,
    provider: DiagramProvider,
    io?: Server,
    rateLimiter?: RateLimiter
  ) {
    this.roomStore = roomStore;
    this.provider = provider;
    this.io = io;
    this.rateLimiter = rateLimiter || new RateLimiter();
  }

  public setIO(io: Server): void {
    this.io = io;
  }

  public setProvider(provider: DiagramProvider): void {
    this.provider = provider;
  }

  public getLastCommandId(roomId: string): string | undefined {
    return this.lastRoomCommandId.get(roomId);
  }

  public async handleCommand(
    socket: Socket | { id: string; emit: (ev: string, data: unknown) => void },
    roomId: string,
    rawPrompt: string,
    userName: string,
    selectedIds?: string[]
  ): Promise<{ success: boolean; commandId?: string; error?: string }> {
    const prompt = sanitizeUserPrompt(rawPrompt);
    if (!prompt) {
      return { success: false, error: 'Prompt cannot be empty.' };
    }

    // 1. Rate limiting check
    const rateCheck = this.rateLimiter.check(socket.id, roomId);
    if (!rateCheck.allowed) {
      this.emitStatus(roomId, {
        roomId,
        status: 'error',
        message: rateCheck.reason,
      });
      return { success: false, error: rateCheck.reason };
    }

    const commandId = `cmd-${uuidv4().slice(0, 8)}`;

    // 2. Broadcast user prompt to room chat: "X asked StudyBot: <prompt>"
    this.broadcastChatMessage(roomId, {
      id: uuidv4(),
      roomId,
      senderId: socket.id,
      senderName: userName || 'User',
      text: `${userName || 'Someone'} asked StudyBot: "${prompt}"`,
      timestamp: Date.now(),
      isSystem: true,
    });

    // Ensure StudyBot virtual participant presence is registered in the room
    await this.ensureStudyBotPresence(roomId);

    const queuedItem: QueuedCommand = {
      commandId,
      roomId,
      prompt,
      socketId: socket.id,
      userName,
      selectedIds,
    };

    // 3. Concurrency check: Process one command per room at a time
    if (this.activeRoomCommands.has(roomId)) {
      const queue = this.roomQueues.get(roomId) || [];
      if (queue.length >= 3) {
        this.emitStatus(roomId, {
          roomId,
          status: 'error',
          commandId,
          message: 'StudyBot is busy. Room queue is full, please wait a moment.',
        });
        return { success: false, error: 'Room queue full' };
      }
      queue.push(queuedItem);
      this.roomQueues.set(roomId, queue);

      this.emitStatus(roomId, {
        roomId,
        status: 'thinking',
        commandId,
        message: 'StudyBot is finishing previous drawing. Your command is queued...',
      });
      return { success: true, commandId };
    }

    // Process immediately
    this.processCommand(queuedItem).catch(err => {
      console.error(`[AICommandHandler] Error in processCommand for ${roomId}:`, err);
    });

    return { success: true, commandId };
  }

  public async handleClientGeneratedOps(
    socket: Socket | { id: string; emit: (ev: string, data: unknown) => void },
    roomId: string,
    rawOps: unknown,
    userName: string,
    rawPrompt: string,
    clientCommandId?: string
  ): Promise<{ success: boolean; commandId?: string; error?: string }> {
    const prompt = sanitizeUserPrompt(rawPrompt) || 'Diagram';
    const rateCheck = this.rateLimiter.check(socket.id, roomId);
    if (!rateCheck.allowed) {
      this.emitStatus(roomId, {
        roomId,
        status: 'error',
        message: rateCheck.reason,
      });
      return { success: false, error: rateCheck.reason };
    }

    let validatedOps: GraphOp[];
    try {
      validatedOps = validateGraphOps(rawOps);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Invalid client operations: ${msg}` };
    }

    const commandId = clientCommandId || `cmd-${uuidv4().slice(0, 8)}`;

    this.broadcastChatMessage(roomId, {
      id: uuidv4(),
      roomId,
      senderId: socket.id,
      senderName: userName || 'User',
      text: `${userName || 'Someone'} asked StudyBot (Local WebLLM): "${prompt}"`,
      timestamp: Date.now(),
      isSystem: true,
    });

    await this.ensureStudyBotPresence(roomId);

    const queuedItem: QueuedCommand = {
      commandId,
      roomId,
      prompt,
      socketId: socket.id,
      userName,
      precompiledOps: validatedOps,
      isLocalMode: true,
    };

    if (this.activeRoomCommands.has(roomId)) {
      const queue = this.roomQueues.get(roomId) || [];
      if (queue.length >= 3) {
        this.emitStatus(roomId, {
          roomId,
          status: 'error',
          commandId,
          message: 'StudyBot is busy. Room queue is full, please wait a moment.',
        });
        return { success: false, error: 'Room queue full' };
      }
      queue.push(queuedItem);
      this.roomQueues.set(roomId, queue);

      this.emitStatus(roomId, {
        roomId,
        status: 'thinking',
        commandId,
        message: 'StudyBot is finishing previous drawing. Your local diagram is queued...',
      });
      return { success: true, commandId };
    }

    this.processCommand(queuedItem).catch(err => {
      console.error(`[AICommandHandler] Error in processCommand for ${roomId}:`, err);
    });

    return { success: true, commandId };
  }

  private async processCommand(item: QueuedCommand): Promise<void> {
    const { roomId, commandId, prompt, selectedIds } = item;
    this.activeRoomCommands.add(roomId);

    try {
      this.emitStatus(roomId, {
        roomId,
        status: 'thinking',
        commandId,
        message: 'StudyBot is thinking and designing your diagram...',
      });

      // 1. Gather current board context
      const existingElements = await this.roomStore.getElements(roomId);
      const boardContext: BoardContext = {
        elementsCount: existingElements.length,
        selectedElements: selectedIds?.length
          ? existingElements
              .filter(el => selectedIds.includes(el.id))
              .map(el => ({ id: el.id, type: el.type, text: el.text }))
          : undefined,
        existingLabels: existingElements
          .map(el => el.text)
          .filter((t): t is string => Boolean(t)),
      };

      // 2. Generate or use precompiled high-level graph operations (No pixel coordinates)
      const graphOps = item.precompiledOps && item.precompiledOps.length > 0
        ? item.precompiledOps
        : await this.provider.generate(prompt, boardContext, commandId);

      // 3. Compute Auto-Layout (Dagre) and compile to DrawingElements
      // Automatically calculates a smart, non-overlapping canvas position based on existing board elements
      const compiledElements = graphOpsToDrawingElements(graphOps, {
        existingElements,
        selectedIds,
      });

      if (compiledElements.length === 0) {
        throw new Error('No diagram elements were generated.');
      }

      // 4. Set status to drawing
      this.emitStatus(roomId, {
        roomId,
        status: 'drawing',
        commandId,
        message: `StudyBot is drawing ${compiledElements.length} elements...`,
        progress: 0,
      });

      // 5. Emit elements one-by-one with ~150ms delay for live drawing effect
      for (let i = 0; i < compiledElements.length; i++) {
        const element = compiledElements[i];

        // Animate StudyBot cursor to the element's position
        const center = this.calculateElementCenter(element);
        this.emitCursor(roomId, center);

        // Save element into server room state
        await this.roomStore.addElement(roomId, element);

        // Broadcast board:op and element-created
        this.emitBoardOp(roomId, element, commandId, i === compiledElements.length - 1);

        if (this.stepDelayMs > 0 && i < compiledElements.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.stepDelayMs));
        }
      }

      this.lastRoomCommandId.set(roomId, commandId);

      // Done drawing
      this.emitStatus(roomId, {
        roomId,
        status: 'idle',
        commandId,
        message: 'StudyBot finished drawing.',
      });

      this.broadcastChatMessage(roomId, {
        id: uuidv4(),
        roomId,
        senderId: 'studybot',
        senderName: 'StudyBot 🤖',
        text: `Finished drawing diagram (${compiledElements.length} elements).`,
        timestamp: Date.now(),
        isSystem: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emitStatus(roomId, {
        roomId,
        status: 'error',
        commandId,
        message: `StudyBot error: ${msg}`,
      });
    } finally {
      this.activeRoomCommands.delete(roomId);

      // Check next item in room queue
      const queue = this.roomQueues.get(roomId) || [];
      if (queue.length > 0) {
        const next = queue.shift()!;
        this.roomQueues.set(roomId, queue);
        this.processCommand(next).catch(err => {
          console.error(`[AICommandHandler] Error in queued command for ${roomId}:`, err);
        });
      }
    }
  }

  public async handleUndoAI(roomId: string, targetCommandId?: string): Promise<{ success: boolean; deletedCount: number }> {
    const commandId = targetCommandId || this.lastRoomCommandId.get(roomId);
    if (!commandId) {
      return { success: false, deletedCount: 0 };
    }

    const deletedIds = await this.roomStore.deleteElementsByCommandId(roomId, commandId);

    if (this.io) {
      for (const id of deletedIds) {
        this.io.to(roomId).emit('element-deleted', id);
      }
    }

    this.lastRoomCommandId.delete(roomId);

    this.broadcastChatMessage(roomId, {
      id: uuidv4(),
      roomId,
      senderId: 'studybot',
      senderName: 'StudyBot 🤖',
      text: `Undid AI diagram (${deletedIds.length} elements removed).`,
      timestamp: Date.now(),
      isSystem: true,
    });

    return { success: true, deletedCount: deletedIds.length };
  }

  public async ensureStudyBotPresence(roomId: string): Promise<void> {
    const studyBotUser: User = {
      id: 'studybot',
      name: 'StudyBot 🤖',
      color: '#8B5CF6',
      isActive: true,
      joinedAt: 0,
    };
    await this.roomStore.addUser(roomId, studyBotUser);
    if (this.io) {
      this.io.to(roomId).emit('user-joined', studyBotUser);
    }
  }

  private calculateElementCenter(el: DrawingElement): { x: number; y: number } {
    if (el.bounds) {
      return {
        x: el.bounds.x + el.bounds.width / 2,
        y: el.bounds.y + el.bounds.height / 2,
      };
    }
    if (el.points.length >= 2) {
      return {
        x: (el.points[0].x + el.points[1].x) / 2,
        y: (el.points[0].y + el.points[1].y) / 2,
      };
    }
    if (el.points.length === 1) {
      return { x: el.points[0].x, y: el.points[0].y };
    }
    return { x: 200, y: 200 };
  }

  private emitCursor(roomId: string, cursor: { x: number; y: number }): void {
    if (this.io) {
      this.io.to(roomId).emit('user-cursor', {
        userId: 'studybot',
        cursor,
      });
    }
  }

  private emitBoardOp(roomId: string, element: DrawingElement, commandId: string, isLast: boolean): void {
    if (this.io) {
      this.io.to(roomId).emit('element-created', element);
      this.io.to(roomId).emit('board:op', {
        roomId,
        op: { type: 'add_element', element },
        commandId,
        isLast,
      });
    }
  }

  private emitStatus(roomId: string, payload: AIStatusPayload): void {
    if (this.io) {
      this.io.to(roomId).emit('ai:status', payload);
    }
  }

  private broadcastChatMessage(roomId: string, message: ChatMessage): void {
    if (this.io) {
      this.io.to(roomId).emit('chat:message', message);
    }
  }
}

