export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  type: 'pen' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'eraser' | 'triangle' | 'diamond' | 'star' | 'heart' | 'hexagon';
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  penType?: PenType;
  pencilType?: PencilType;
  brushType?: BrushType;
  eraserType?: EraserType;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  created: number;
  updated: number;
  userId: string;
  isTemporary?: boolean; // For laser pointer
  isSelected?: boolean; // For drag and drop
  isDragging?: boolean; // For drag state
  commandId?: string; // Grouping ID for AI commands and Undo AI
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
  isActive: boolean;
  joinedAt: number;
}

export type PenType = 'ballpoint' | 'felt-tip' | 'gel' | 'fountain' | 'laser';
export type PencilType = 'HB' | '2B' | '4B';
export type BrushType = 'watercolor' | 'marker';
export type EraserType = 'precision' | 'wide';
export type BackgroundType = 'white' | 'black' | 'grid' | 'lined' | 'custom';

export interface CanvasState {
  zoom: number;
  pan: Point;
  gridVisible: boolean;
  snapToGrid: boolean;
  gridSize: number;
  selectedTool: DrawingTool;
  selectedColor: string;
  strokeWidth: number;
  opacity: number;
  selectedElements: string[];
  isDrawing: boolean;
  currentPath: Point[];
  recentColors: string[];
  penType: PenType;
  pencilType: PencilType;
  brushType: BrushType;
  eraserType: EraserType;
  eraserSize: number;
  backgroundColor: string;
  backgroundType: BackgroundType;
  canvasWidth: number;
  canvasHeight: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: 'left' | 'center' | 'right';
  isEditingText: boolean;
  editingTextId: string | null;
  isDragging: boolean;
  dragOffset: Point;
  dragPreview: Point | null;
}

export interface WhiteboardState {
  elements: DrawingElement[];
  users: User[];
  currentUser: User | null;
  canvas: CanvasState;
  history: {
    past: DrawingElement[][];
    present: DrawingElement[];
    future: DrawingElement[][];
  };
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  roomId: string;
  ui: {
    colorPaletteOpen: boolean;
    toolSettingsOpen: boolean;
    saveProgress: number;
    isSaving: boolean;
    videoPanelOpen: boolean;
    studyBotPanelOpen: boolean;
  };
  ai: {
    status: 'idle' | 'thinking' | 'drawing' | 'error';
    providerMode: 'cloud' | 'local' | 'auto';
    activeBackend: 'cloud' | 'local';
    downloadProgress: number | null;
    lastCommandId: string | null;
    statusMessage: string | null;
  };
  chatMessages: Array<{
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
  }>;
}

export type DrawingTool = 'select' | 'pen' | 'pencil' | 'brush' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'triangle' | 'diamond' | 'star' | 'heart' | 'hexagon';

export interface SocketEvents {
  'user-joined': (user: User) => void;
  'user-left': (userId: string) => void;
  'user-cursor': (data: { userId: string; cursor: Point }) => void;
  'element-created': (element: DrawingElement) => void;
  'element-updated': (element: DrawingElement) => void;
  'element-deleted': (elementId: string) => void;
  'elements-batch': (elements: DrawingElement[]) => void;
  'ai:status': (payload: { roomId: string; status: 'idle' | 'thinking' | 'drawing' | 'error'; commandId?: string; message?: string; progress?: number }) => void;
  'chat:message': (message: { id: string; roomId: string; senderId: string; senderName: string; text: string; timestamp: number; isSystem?: boolean }) => void;
  'board:op': (data: { roomId: string; op: unknown; commandId: string; isLast?: boolean }) => void;
}