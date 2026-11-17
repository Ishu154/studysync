import { GraphOp } from './schema';
import { CanvasOp } from './applyOp';

export type AIStatus = 'idle' | 'thinking' | 'drawing' | 'error';

export interface AIStatusPayload {
  roomId: string;
  status: AIStatus;
  commandId?: string;
  message?: string;
  progress?: number;
}

export interface AICommandPayload {
  roomId: string;
  prompt: string;
  selectedIds?: string[];
  provider?: 'cloud' | 'local';
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface BoardOpPayload {
  roomId: string;
  op: CanvasOp;
  commandId: string;
  isLast?: boolean;
}

export interface UndoAIPayload {
  roomId: string;
  commandId?: string;
}

export interface BoardContext {
  elementsCount: number;
  selectedElements?: Array<{
    id: string;
    type: string;
    text?: string;
    label?: string;
  }>;
  existingLabels?: string[];
}

export interface DiagramProvider {
  name: string;
  generate(
    prompt: string,
    boardContext?: BoardContext,
    commandId?: string
  ): Promise<GraphOp[]>;
}

