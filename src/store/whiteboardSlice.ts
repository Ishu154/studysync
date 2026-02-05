import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WhiteboardState, DrawingElement, User, DrawingTool, Point, PenType, PencilType, BrushType, EraserType, BackgroundType } from '../types';

const initialState: WhiteboardState = {
  elements: [],
  users: [],
  currentUser: null,
  canvas: {
    zoom: 1,
    pan: { x: 0, y: 0 },
    gridVisible: false,
    snapToGrid: false,
    gridSize: 20,
    selectedTool: 'select',
    selectedColor: '#000000',
    strokeWidth: 2,
    opacity: 1,
    selectedElements: [],
    isDrawing: false,
    currentPath: [],
    recentColors: ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'],
    penType: 'ballpoint',
    pencilType: 'HB',
    brushType: 'watercolor',
    eraserType: 'precision',
    eraserSize: 10,
    backgroundColor: '#FFFFFF',
    backgroundType: 'white',
    canvasWidth: 3000,
    canvasHeight: 3000,
    fontSize: 16,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    isEditingText: false,
    editingTextId: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    dragPreview: null,
  },
  history: {
    past: [],
    present: [],
    future: [],
  },
  isConnected: false,
  connectionStatus: 'disconnected',
  roomId: '',
  ui: {
    colorPaletteOpen: false,
    toolSettingsOpen: true,
    saveProgress: 0,
    isSaving: false,
    videoPanelOpen: false,
  },
};

const whiteboardSlice = createSlice({
  name: 'whiteboard',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      state.connectionStatus = action.payload ? 'connected' : 'disconnected';
    },
    setConnectionStatus: (state, action: PayloadAction<'connected' | 'disconnected' | 'connecting'>) => {
      state.connectionStatus = action.payload;
      state.isConnected = action.payload === 'connected';
    },
    setRoomId: (state, action: PayloadAction<string>) => {
      state.roomId = action.payload;
    },
    addUser: (state, action: PayloadAction<User>) => {
      const userIndex = state.users.findIndex(u => u.id === action.payload.id);
      if (userIndex === -1) {
        state.users.push(action.payload);
      } else {
        state.users[userIndex] = action.payload;
      }
    },
    removeUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(u => u.id !== action.payload);
    },
    updateUserCursor: (state, action: PayloadAction<{ userId: string; cursor: Point }>) => {
      const user = state.users.find(u => u.id === action.payload.userId);
      if (user) {
        user.cursor = action.payload.cursor;
      }
    },
    setSelectedTool: (state, action: PayloadAction<DrawingTool>) => {
      state.canvas.selectedTool = action.payload;
      state.canvas.selectedElements = [];
      state.canvas.isEditingText = false;
      state.canvas.editingTextId = null;
      state.canvas.isDragging = false;
      state.canvas.dragPreview = null;

      // Clear selection state from all elements
      state.elements.forEach(element => {
        element.isSelected = false;
        element.isDragging = false;
      });
    },
    setSelectedColor: (state, action: PayloadAction<string>) => {
      state.canvas.selectedColor = action.payload;
      if (!state.canvas.recentColors.includes(action.payload)) {
        state.canvas.recentColors = [action.payload, ...state.canvas.recentColors.slice(0, 9)];
      }
    },
    setStrokeWidth: (state, action: PayloadAction<number>) => {
      state.canvas.strokeWidth = action.payload;
    },
    setOpacity: (state, action: PayloadAction<number>) => {
      state.canvas.opacity = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.canvas.zoom = Math.max(0.25, Math.min(4, action.payload));
    },
    setPan: (state, action: PayloadAction<Point>) => {
      state.canvas.pan = action.payload;
    },
    toggleGrid: (state) => {
      state.canvas.gridVisible = !state.canvas.gridVisible;
    },
    toggleSnapToGrid: (state) => {
      state.canvas.snapToGrid = !state.canvas.snapToGrid;
    },
    setIsDrawing: (state, action: PayloadAction<boolean>) => {
      state.canvas.isDrawing = action.payload;
    },
    setCurrentPath: (state, action: PayloadAction<Point[]>) => {
      state.canvas.currentPath = action.payload;
    },
    setPenType: (state, action: PayloadAction<PenType>) => {
      state.canvas.penType = action.payload;
    },
    setPencilType: (state, action: PayloadAction<PencilType>) => {
      state.canvas.pencilType = action.payload;
    },
    setBrushType: (state, action: PayloadAction<BrushType>) => {
      state.canvas.brushType = action.payload;
    },
    setEraserType: (state, action: PayloadAction<EraserType>) => {
      state.canvas.eraserType = action.payload;
    },
    setEraserSize: (state, action: PayloadAction<number>) => {
      state.canvas.eraserSize = action.payload;
    },
    setBackgroundColor: (state, action: PayloadAction<string>) => {
      state.canvas.backgroundColor = action.payload;
    },
    setBackgroundType: (state, action: PayloadAction<BackgroundType>) => {
      state.canvas.backgroundType = action.payload;
    },
    setCanvasSize: (state, action: PayloadAction<{ width: number; height: number }>) => {
      state.canvas.canvasWidth = action.payload.width;
      state.canvas.canvasHeight = action.payload.height;
    },
    setFontSize: (state, action: PayloadAction<number>) => {
      state.canvas.fontSize = action.payload;
    },
    setFontFamily: (state, action: PayloadAction<string>) => {
      state.canvas.fontFamily = action.payload;
    },
    setFontWeight: (state, action: PayloadAction<string>) => {
      state.canvas.fontWeight = action.payload;
    },
    setFontStyle: (state, action: PayloadAction<string>) => {
      state.canvas.fontStyle = action.payload;
    },
    setTextAlign: (state, action: PayloadAction<'left' | 'center' | 'right'>) => {
      state.canvas.textAlign = action.payload;
    },
    setIsEditingText: (state, action: PayloadAction<boolean>) => {
      state.canvas.isEditingText = action.payload;
    },
    setEditingTextId: (state, action: PayloadAction<string | null>) => {
      state.canvas.editingTextId = action.payload;
    },
    toggleColorPalette: (state) => {
      state.ui.colorPaletteOpen = !state.ui.colorPaletteOpen;
    },
    setColorPaletteOpen: (state, action: PayloadAction<boolean>) => {
      state.ui.colorPaletteOpen = action.payload;
    },
    toggleToolSettings: (state) => {
      state.ui.toolSettingsOpen = !state.ui.toolSettingsOpen;
    },
    setSaveProgress: (state, action: PayloadAction<number>) => {
      state.ui.saveProgress = action.payload;
    },
    setIsSaving: (state, action: PayloadAction<boolean>) => {
      state.ui.isSaving = action.payload;
    },
    toggleVideoPanel: (state) => {
      state.ui.videoPanelOpen = !state.ui.videoPanelOpen;
    },
    setVideoPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.ui.videoPanelOpen = action.payload;
    },
    // Drag and Drop Actions
    setSelectedElements: (state, action: PayloadAction<string[]>) => {
      state.canvas.selectedElements = action.payload;

      // Update element selection state
      state.elements.forEach(element => {
        element.isSelected = action.payload.includes(element.id);
      });
    },
    setIsDragging: (state, action: PayloadAction<boolean>) => {
      state.canvas.isDragging = action.payload;

      // Update dragging state for selected elements
      state.elements.forEach(element => {
        if (element.isSelected) {
          element.isDragging = action.payload;
        }
      });
    },
    setDragOffset: (state, action: PayloadAction<Point>) => {
      state.canvas.dragOffset = action.payload;
    },
    setDragPreview: (state, action: PayloadAction<Point | null>) => {
      state.canvas.dragPreview = action.payload;
    },
    moveSelectedElements: (state, action: PayloadAction<Point>) => {
      const { x: deltaX, y: deltaY } = action.payload;

      // Add to history before making changes
      state.history.past.push([...state.elements]);
      state.history.future = [];

      // Move all selected elements
      state.elements.forEach(element => {
        if (element.isSelected) {
          element.points = element.points.map(point => ({
            x: point.x + deltaX,
            y: point.y + deltaY
          }));
          element.updated = Date.now();
        }
      });

      state.history.present = [...state.elements];
    },
    addElement: (state, action: PayloadAction<DrawingElement>) => {
      state.history.past.push([...state.elements]);
      state.history.future = [];

      state.elements.push(action.payload);
      state.history.present = [...state.elements];
    },
    updateElement: (state, action: PayloadAction<DrawingElement>) => {
      const index = state.elements.findIndex(el => el.id === action.payload.id);
      if (index !== -1) {
        state.elements[index] = action.payload;
        state.history.present = [...state.elements];
      }
    },
    deleteElement: (state, action: PayloadAction<string>) => {
      state.history.past.push([...state.elements]);
      state.history.future = [];

      state.elements = state.elements.filter(el => el.id !== action.payload);
      state.history.present = [...state.elements];
      state.canvas.selectedElements = state.canvas.selectedElements.filter(id => id !== action.payload);
    },
    setElements: (state, action: PayloadAction<DrawingElement[]>) => {
      state.elements = action.payload;
      state.history.present = [...action.payload];
    },
    undo: (state) => {
      if (state.history.past.length > 0) {
        const previous = state.history.past[state.history.past.length - 1];
        state.history.future.unshift([...state.elements]);
        state.history.past = state.history.past.slice(0, -1);
        state.elements = previous;
        state.history.present = [...previous];

        // Clear selections after undo
        state.canvas.selectedElements = [];
        state.elements.forEach(element => {
          element.isSelected = false;
          element.isDragging = false;
        });
      }
    },
    redo: (state) => {
      if (state.history.future.length > 0) {
        const next = state.history.future[0];
        state.history.past.push([...state.elements]);
        state.history.future = state.history.future.slice(1);
        state.elements = next;
        state.history.present = [...next];

        // Clear selections after redo
        state.canvas.selectedElements = [];
        state.elements.forEach(element => {
          element.isSelected = false;
          element.isDragging = false;
        });
      }
    },
    clearTemporaryElements: (state) => {
      state.elements = state.elements.filter(el => !el.isTemporary);
    },
  },
});

export const {
  setCurrentUser,
  setConnected,
  setConnectionStatus,
  setRoomId,
  addUser,
  removeUser,
  updateUserCursor,
  setSelectedTool,
  setSelectedColor,
  setStrokeWidth,
  setOpacity,
  setZoom,
  setPan,
  toggleGrid,
  toggleSnapToGrid,
  setIsDrawing,
  setCurrentPath,
  setPenType,
  setPencilType,
  setBrushType,
  setEraserType,
  setEraserSize,
  setBackgroundColor,
  setBackgroundType,
  setCanvasSize,
  setFontSize,
  setFontFamily,
  setFontWeight,
  setFontStyle,
  setTextAlign,
  setIsEditingText,
  setEditingTextId,
  toggleColorPalette,
  setColorPaletteOpen,
  toggleToolSettings,
  setSaveProgress,
  setIsSaving,
  toggleVideoPanel,
  setVideoPanelOpen,
  setSelectedElements,
  setIsDragging,
  setDragOffset,
  setDragPreview,
  moveSelectedElements,
  addElement,
  updateElement,
  deleteElement,
  setElements,
  undo,
  redo,
  clearTemporaryElements,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;