import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { RootState } from '../store';
import {
  setIsDrawing,
  setCurrentPath,
  addElement,
  updateElement,
  deleteElement,
  setZoom,
  setPan,
  setIsEditingText,
  setEditingTextId,
  clearTemporaryElements,
  setSelectedElements,
  setIsDragging,
  setDragOffset,
  setDragPreview,
  moveSelectedElements,
} from '../store/whiteboardSlice';
import { useSocket } from '../hooks/useSocket';
import { DrawingElement, Point } from '../types';
import { 
  getCanvasPoint, 
  snapToGrid, 
  drawGrid, 
  drawElement, 
  drawCursor, 
  drawBackground,
  isPointInElement,
  drawSelectionBox,
  drawDragPreview,
  isValidDropZone,
  getBoundingBox
} from '../utils/canvas';
import TextEditor from './TextEditor';

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<Point>({ x: 0, y: 0 });
  const lastMousePointRef = useRef<Point | null>(null); // Track precise mouse position
  const laserTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pressureRef = useRef(0.5); // For pressure sensitivity
  const dragStartPointRef = useRef<Point | null>(null);
  
  // Touch handling refs
  const touchStartRef = useRef<{ [key: number]: Point }>({});
  const lastTouchDistanceRef = useRef<number>(0);
  const isTouchPanningRef = useRef(false);
  const touchPressureRef = useRef<{ [key: number]: number }>({});
  
  const dispatch = useDispatch();
  
  // State for grid and rule line colors
  const [gridLineColor, setGridLineColor] = useState('#e5e7eb');
  const [ruledLineColor, setRuledLineColor] = useState('#d1d5db');
  
  const {
    elements,
    users,
    currentUser,
    canvas: {
      zoom,
      pan,
      gridVisible,
      snapToGrid: shouldSnapToGrid,
      gridSize,
      selectedTool,
      selectedColor,
      strokeWidth,
      opacity,
      isDrawing,
      currentPath,
      penType,
      pencilType,
      brushType,
      eraserType,
      eraserSize,
      backgroundColor,
      backgroundType,
      canvasWidth,
      canvasHeight,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      textAlign,
      isEditingText,
      editingTextId,
      selectedElements,
      isDragging,
      dragOffset,
      dragPreview,
    },
  } = useSelector((state: RootState) => state.whiteboard);

  const { emitCursor, emitElementCreated, emitElementUpdated, emitElementDeleted } = useSocket('room-1');

  // Clear laser pointer marks periodically
  useEffect(() => {
    if (penType === 'laser') {
      const interval = setInterval(() => {
        dispatch(clearTemporaryElements());
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [penType, dispatch]);

  // Touch event utilities
  const getTouchPoint = (touch: Touch, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) / zoom - pan.x,
      y: (touch.clientY - rect.top) / zoom - pan.y,
    };
  };

  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchPressure = (touch: Touch): number => {
    // Use force if available (iOS Safari), otherwise simulate based on radiusX/Y
    if ('force' in touch && touch.force > 0) {
      return Math.min(touch.force, 1);
    }
    
    // Fallback: simulate pressure based on touch radius
    const radiusX = (touch as any).radiusX || 10;
    const radiusY = (touch as any).radiusY || 10;
    const avgRadius = (radiusX + radiusY) / 2;
    
    // Normalize radius to pressure (typical range 5-25px)
    return Math.max(0.2, Math.min(1, (avgRadius - 5) / 20));
  };

  // Enhanced drawing with pressure sensitivity and tool realism
  const getToolSpecificStyles = (ctx: CanvasRenderingContext2D, tool: string, subType?: string, pressure: number = 0.5) => {
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = tool === 'eraser' ? eraserSize : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (tool) {
      case 'pen':
        switch (subType) {
          case 'ballpoint':
            ctx.lineCap = 'round';
            ctx.lineWidth = (strokeWidth * 0.8) * (0.7 + pressure * 0.3);
            break;
          case 'felt-tip':
            ctx.lineCap = 'square';
            ctx.lineWidth = (strokeWidth * 1.2) * (0.8 + pressure * 0.4);
            break;
          case 'gel':
            ctx.shadowColor = selectedColor;
            ctx.shadowBlur = 1 + pressure;
            ctx.globalAlpha = opacity * (0.7 + pressure * 0.3);
            ctx.lineWidth = strokeWidth * (0.9 + pressure * 0.2);
            break;
          case 'fountain':
            // Enhanced pressure-sensitive fountain pen
            const pressureVariation = 0.3 + (pressure * 1.2);
            ctx.lineWidth = strokeWidth * pressureVariation;
            ctx.globalAlpha = opacity * (0.5 + pressure * 0.5);
            break;
          case 'laser':
            ctx.strokeStyle = '#ff0000';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15;
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = 3;
            break;
        }
        break;
      
      case 'pencil':
        ctx.globalAlpha = opacity * (0.5 + pressure * 0.3);
        ctx.strokeStyle = selectedColor; 
        switch (subType) {
          case 'HB':
            ctx.lineWidth = strokeWidth * (0.8 + pressure * 0.4);
            break;
          case '2B':
            ctx.lineWidth = strokeWidth * (0.9 + pressure * 0.6);
            ctx.globalAlpha = opacity * (0.6 + pressure * 0.3);
            break;
          case '4B':
            ctx.lineWidth = strokeWidth * (1.0 + pressure * 0.8);
            ctx.globalAlpha = opacity * (0.7 + pressure * 0.3);
            break;
        }
        break;
      
      case 'brush':
        switch (subType) {
          case 'watercolor':
            ctx.globalAlpha = opacity * (0.3 + pressure * 0.4);
            ctx.lineWidth = strokeWidth * (1.5 + pressure * 2.0);
            ctx.shadowColor = selectedColor;
            ctx.shadowBlur = 2 + pressure * 3;
            break;
          case 'marker':
            ctx.lineCap = 'square';
            ctx.lineWidth = strokeWidth * (1.2 + pressure * 1.2);
            ctx.globalAlpha = opacity * (0.8 + pressure * 0.2);
            break;
        }
        break;
      
      case 'eraser':
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = eraserSize * (0.8 + pressure * 0.4);
        break;
    }
  };

  // Enhanced eraser functionality that preserves geometric shapes
  const handleEraserAction = (point: Point, pressure: number = 0.5) => {
    const elementsToDelete: string[] = [];
    const effectiveSize = eraserSize * (0.8 + pressure * 0.4);
    
    elements.forEach((element) => {
      // Check if eraser intersects with any element
      if (isPointInElement(point, element, effectiveSize / 2)) {
        elementsToDelete.push(element.id);
      }
    });

    // Delete intersecting elements
    elementsToDelete.forEach(id => {
      dispatch(deleteElement(id));
      emitElementDeleted(id);
    });
  };

  // Simulate pressure sensitivity for fountain pen and touch
  const updatePressure = (e: React.MouseEvent | Touch, touchId?: number) => {
    if (selectedTool === 'pen' && penType === 'fountain') {
      if ('force' in e && e.force > 0) {
        // Use actual touch pressure if available
        pressureRef.current = Math.min(e.force, 1);
        if (touchId !== undefined) {
          touchPressureRef.current[touchId] = pressureRef.current;
        }
      } else if ('movementX' in e) {
        // Simulate pressure based on mouse movement speed for mouse events
        const speed = Math.abs(e.movementX) + Math.abs(e.movementY);
        pressureRef.current = Math.max(0.2, Math.min(1, 1 - (speed / 50)));
      } else {
        // Default pressure for touch without force
        pressureRef.current = 0.6;
        if (touchId !== undefined) {
          touchPressureRef.current[touchId] = pressureRef.current;
        }
      }
    }
  };

  // Find element at point for selection
  const findElementAtPoint = (point: Point): DrawingElement | null => {
    // Search in reverse order to find topmost element
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (isPointInElement(point, element)) {
        return element;
      }
    }
    return null;
  };

  // Handle element selection
  const handleElementSelection = (point: Point, isMultiSelect: boolean = false) => {
    const clickedElement = findElementAtPoint(point);
    
    if (clickedElement) {
      if (isMultiSelect) {
        // Toggle selection for multi-select
        const isAlreadySelected = selectedElements.includes(clickedElement.id);
        if (isAlreadySelected) {
          dispatch(setSelectedElements(selectedElements.filter(id => id !== clickedElement.id)));
        } else {
          dispatch(setSelectedElements([...selectedElements, clickedElement.id]));
        }
      } else {
        // Single selection
        dispatch(setSelectedElements([clickedElement.id]));
      }
    } else if (!isMultiSelect) {
      // Clear selection if clicking on empty space (and not multi-selecting)
      dispatch(setSelectedElements([]));
    }
  };

  // Start dragging selected elements
  const startDragging = (point: Point) => {
    if (selectedElements.length > 0) {
      dispatch(setIsDragging(true));
      dragStartPointRef.current = point;
      
      // Calculate offset from click point to first selected element
      const firstSelectedElement = elements.find(el => el.id === selectedElements[0]);
      if (firstSelectedElement && firstSelectedElement.points.length > 0) {
        const elementBounds = getBoundingBox(firstSelectedElement.points);
        if (elementBounds) {
          dispatch(setDragOffset({
            x: point.x - elementBounds.x,
            y: point.y - elementBounds.y
          }));
        }
      }
    }
  };

  // Update drag preview
  const updateDragPreview = (point: Point) => {
    if (isDragging && dragStartPointRef.current) {
      const deltaX = point.x - dragStartPointRef.current.x;
      const deltaY = point.y - dragStartPointRef.current.y;
      
      dispatch(setDragPreview({ x: deltaX, y: deltaY }));
    }
  };

  // Complete drag operation
  const completeDrag = (point: Point) => {
    if (isDragging && dragStartPointRef.current) {
      const deltaX = point.x - dragStartPointRef.current.x;
      const deltaY = point.y - dragStartPointRef.current.y;
      
      // Validate drop zone
      if (isValidDropZone(point, canvasWidth, canvasHeight)) {
        // Move selected elements
        dispatch(moveSelectedElements({ x: deltaX, y: deltaY }));
        
        // Emit updates for moved elements
        elements.forEach(element => {
          if (element.isSelected) {
            const updatedElement = {
              ...element,
              points: element.points.map(p => ({
                x: p.x + deltaX,
                y: p.y + deltaY
              })),
              updated: Date.now()
            };
            emitElementUpdated(updatedElement);
          }
        });
      }
      
      // Reset drag state
      dispatch(setIsDragging(false));
      dispatch(setDragPreview(null));
      dragStartPointRef.current = null;
    }
  };

  // Handle double click for text editing
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(e.nativeEvent, canvas, zoom, pan);
    const clickedElement = findElementAtPoint(point);

    if (clickedElement && clickedElement.type === 'text') {
      dispatch(setIsEditingText(true));
      dispatch(setEditingTextId(clickedElement.id));
    }
  };

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background with proper grid/line colors
    drawBackground(ctx, canvas, backgroundColor, backgroundType, gridSize, pan, zoom, gridLineColor, ruledLineColor);

    // Draw grid if visible and not using grid background
    if (gridVisible && backgroundType !== 'grid') {
      drawGrid(ctx, canvas, gridSize, pan, zoom, gridLineColor);
    }

    // Draw elements
    elements.forEach((element) => {
      // Skip selected elements if dragging (they'll be drawn as preview)
      if (isDragging && element.isSelected) return;
      
      drawElement(ctx, element, zoom, pan);
      
      // Draw selection box for selected elements
      if (element.isSelected && !isDragging) {
        drawSelectionBox(ctx, element, zoom, pan);
      }
    });

    // Draw drag preview
    if (isDragging && dragPreview) {
      drawDragPreview(ctx, elements, dragPreview, zoom, pan);
    }

    // Draw current drawing path with enhanced tool effects
    if (isDrawing && currentPath.length > 0) {
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(pan.x, pan.y);

      // Get current pressure for drawing
      const currentPressure = pressureRef.current;
      
      getToolSpecificStyles(ctx, selectedTool, 
        selectedTool === 'pen' ? penType :
        selectedTool === 'pencil' ? pencilType :
        selectedTool === 'brush' ? brushType :
        selectedTool === 'eraser' ? eraserType : undefined,
        currentPressure
      );

      if (selectedTool === 'pen' || selectedTool === 'pencil' || selectedTool === 'brush' || selectedTool === 'eraser') {
        if (currentPath.length > 1) {
          ctx.beginPath();
          ctx.moveTo(currentPath[0].x, currentPath[0].y);
          
          // Smooth curves for better drawing experience
          for (let i = 1; i < currentPath.length - 1; i++) {
            const xc = (currentPath[i].x + currentPath[i + 1].x) / 2;
            const yc = (currentPath[i].y + currentPath[i + 1].y) / 2;
            ctx.quadraticCurveTo(currentPath[i].x, currentPath[i].y, xc, yc);
          }
          
          if (currentPath.length > 1) {
            const lastPoint = currentPath[currentPath.length - 1];
            ctx.lineTo(lastPoint.x, lastPoint.y);
          }
          
          ctx.stroke();
        }
      } else if (['rectangle', 'circle', 'line', 'arrow', 'triangle', 'diamond', 'star', 'heart', 'hexagon'].includes(selectedTool)) {
        if (currentPath.length >= 2) {
          const [start, end] = currentPath;
          
          if (selectedTool === 'rectangle') {
            const width = end.x - start.x;
            const height = end.y - start.y;
            ctx.strokeRect(start.x, start.y, width, height);
          } else if (selectedTool === 'circle') {
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.beginPath();
            ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (selectedTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
          } else if (selectedTool === 'arrow') {
            const headLength = 15;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLength * Math.cos(angle - Math.PI / 6),
              end.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLength * Math.cos(angle + Math.PI / 6),
              end.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          // Add other shape drawing logic here as needed
        }
      }
      
      ctx.restore();
    }

    // Draw user cursors
    users.forEach((user) => {
      if (user.cursor && user.id !== currentUser?.id) {
        drawCursor(ctx, user.cursor, user.color, zoom, pan);
      }
    });
  }, [
    elements,
    users,
    currentUser,
    zoom,
    pan,
    gridVisible,
    gridSize,
    isDrawing,
    currentPath,
    selectedTool,
    selectedColor,
    strokeWidth,
    opacity,
    penType,
    pencilType,
    brushType,
    eraserType,
    eraserSize,
    backgroundColor,
    backgroundType,
    selectedElements,
    isDragging,
    dragPreview,
    gridLineColor,
    ruledLineColor,
  ]);

  // Set up canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redraw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [redraw]);

  // Redraw on state changes
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touches = Array.from(e.touches);
    
    if (touches.length === 1) {
      // Single touch - drawing or selection
      const touch = touches[0];
      const point = getTouchPoint(touch, canvas);
      const snappedPoint = shouldSnapToGrid ? snapToGrid(point, gridSize) : point;
      const pressure = getTouchPressure(touch);
      
      // Update last mouse position for touch
      lastMousePointRef.current = snappedPoint;
      
      touchStartRef.current[touch.identifier] = snappedPoint;
      touchPressureRef.current[touch.identifier] = pressure;
      updatePressure(touch, touch.identifier);

      if (selectedTool === 'select') {
        const clickedElement = findElementAtPoint(point);
        
        handleElementSelection(point, false);
        
        if (selectedElements.length > 0 || (clickedElement && !false)) {
          startDragging(point);
        } else {
          isTouchPanningRef.current = true;
        }
      } else if (selectedTool === 'text') {
        const clickedElement = findElementAtPoint(point);
        if (clickedElement && clickedElement.type === 'text') {
          // If clicking on an existing text element with text tool, edit it
          dispatch(setIsEditingText(true));
          dispatch(setEditingTextId(clickedElement.id));
        } else {
          // Otherwise, create a new text element
          const textElement: DrawingElement = {
            id: uuidv4(),
            type: 'text',
            points: [snappedPoint],
            color: selectedColor,
            strokeWidth,
            opacity,
            text: '',
            fontSize,
            fontFamily,
            fontWeight,
            fontStyle,
            created: Date.now(),
            updated: Date.now(),
            userId: currentUser?.id || 'anonymous',
          };
          dispatch(addElement(textElement));
          dispatch(setIsEditingText(true));
          dispatch(setEditingTextId(textElement.id));
          emitElementCreated(textElement);
        }
      } else if (selectedTool === 'eraser') {
        handleEraserAction(snappedPoint, pressure);
        dispatch(setIsDrawing(true));
        dispatch(setCurrentPath([snappedPoint]));
      } else {
        dispatch(setIsDrawing(true));
        dispatch(setCurrentPath([snappedPoint]));
      }
    } else if (touches.length === 2) {
      // Two finger touch - zoom/pan
      isTouchPanningRef.current = true;
      const distance = getTouchDistance(touches[0], touches[1]);
      lastTouchDistanceRef.current = distance;
      
      // Store both touch points
      touchStartRef.current[touches[0].identifier] = getTouchPoint(touches[0], canvas);
      touchStartRef.current[touches[1].identifier] = getTouchPoint(touches[1], canvas);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touches = Array.from(e.touches);

    if (touches.length === 1) {
      const touch = touches[0];
      const point = getTouchPoint(touch, canvas);
      const snappedPoint = shouldSnapToGrid ? snapToGrid(point, gridSize) : point;
      const pressure = getTouchPressure(touch);
      
      // Update last mouse position for touch
      lastMousePointRef.current = snappedPoint;
      
      touchPressureRef.current[touch.identifier] = pressure;
      updatePressure(touch, touch.identifier);

      // Emit cursor position
      emitCursor(snappedPoint);

      if (isTouchPanningRef.current) {
        // Single finger pan
        const startPoint = touchStartRef.current[touch.identifier];
        if (startPoint) {
          const deltaX = point.x - startPoint.x;
          const deltaY = point.y - startPoint.y;
          
          dispatch(setPan({
            x: pan.x + deltaX,
            y: pan.y + deltaY,
          }));
          
          touchStartRef.current[touch.identifier] = point;
        }
      } else if (isDragging) {
        updateDragPreview(snappedPoint);
      } else if (isDrawing) {
        if (selectedTool === 'eraser') {
          handleEraserAction(snappedPoint, pressure);
          dispatch(setCurrentPath([...currentPath, snappedPoint]));
        } else if (selectedTool === 'pen' || selectedTool === 'pencil' || selectedTool === 'brush') {
          dispatch(setCurrentPath([...currentPath, snappedPoint]));
        } else {
          dispatch(setCurrentPath([currentPath[0], snappedPoint]));
        }
      }
    } else if (touches.length === 2) {
      // Two finger zoom/pan
      const touch1 = touches[0];
      const touch2 = touches[1];
      const distance = getTouchDistance(touch1, touch2);
      
      if (lastTouchDistanceRef.current > 0) {
        // Zoom
        const zoomFactor = distance / lastTouchDistanceRef.current;
        const newZoom = Math.max(0.25, Math.min(4, zoom * zoomFactor));
        
        // Calculate center point between fingers
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const rect = canvas.getBoundingClientRect();
        const canvasCenterX = centerX - rect.left;
        const canvasCenterY = centerY - rect.top;
        
        // Zoom towards center point
        const zoomPoint = {
          x: (canvasCenterX / zoom - pan.x),
          y: (canvasCenterY / zoom - pan.y),
        };

        dispatch(setZoom(newZoom));
        dispatch(setPan({
          x: pan.x + zoomPoint.x * (1 - newZoom / zoom),
          y: pan.y + zoomPoint.y * (1 - newZoom / zoom),
        }));
      }
      
      lastTouchDistanceRef.current = distance;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touches = Array.from(e.touches);
    const changedTouches = Array.from(e.changedTouches);

    // Clean up ended touches
    changedTouches.forEach(touch => {
      delete touchStartRef.current[touch.identifier];
      delete touchPressureRef.current[touch.identifier];
    });

    if (touches.length === 0) {
      // All touches ended
      if (isTouchPanningRef.current) {
        isTouchPanningRef.current = false;
      } else if (isDragging) {
        // Use the last recorded touch position for precise drop
        if (lastMousePointRef.current) {
          completeDrag(lastMousePointRef.current);
        }
      } else if (isDrawing) {
        // Finish drawing
        if (currentPath.length > 0 && selectedTool !== 'eraser') {
          const isTemporary = selectedTool === 'pen' && penType === 'laser';
          
          const element: DrawingElement = {
            id: uuidv4(),
            type: selectedTool as any,
            points: [...currentPath],
            color: selectedColor,
            strokeWidth: selectedTool === 'eraser' ? eraserSize : strokeWidth,
            opacity,
            penType: selectedTool === 'pen' ? penType : undefined,
            pencilType: selectedTool === 'pencil' ? pencilType : undefined,
            brushType: selectedTool === 'brush' ? brushType : undefined,
            eraserType: selectedTool === 'eraser' ? eraserType : undefined,
            created: Date.now(),
            updated: Date.now(),
            userId: currentUser?.id || 'anonymous',
            isTemporary,
          };

          dispatch(addElement(element));
          emitElementCreated(element);

          if (isTemporary) {
            if (laserTimeoutRef.current) {
              clearTimeout(laserTimeoutRef.current);
            }
            laserTimeoutRef.current = setTimeout(() => {
              dispatch(clearTemporaryElements());
            }, 2000);
          }
        }

        dispatch(setIsDrawing(false));
        dispatch(setCurrentPath([]));
      }
      
      lastTouchDistanceRef.current = 0;
    } else if (touches.length === 1) {
      // One touch remaining after multi-touch
      lastTouchDistanceRef.current = 0;
    }
  };

  // Mouse event handlers (existing functionality)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(e.nativeEvent, canvas, zoom, pan);
    const snappedPoint = shouldSnapToGrid ? snapToGrid(point, gridSize) : point;

    // Update last mouse position
    lastMousePointRef.current = snappedPoint;

    updatePressure(e);

    if (selectedTool === 'select') {
      const isMultiSelect = e.ctrlKey || e.metaKey;
      
      // Handle element selection
      handleElementSelection(point, isMultiSelect);
      
      // Start dragging if we have selected elements
      if (selectedElements.length > 0 || (findElementAtPoint(point) && !isMultiSelect)) {
        startDragging(point);
      } else {
        // Start panning if no elements selected
        isPanningRef.current = true;
        lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      }
    } else if (selectedTool === 'text') {
      const clickedElement = findElementAtPoint(point);
      if (clickedElement && clickedElement.type === 'text') {
        // If clicking on an existing text element with text tool, edit it
        dispatch(setIsEditingText(true));
        dispatch(setEditingTextId(clickedElement.id));
      } else {
        // Otherwise, create a new text element
        const textElement: DrawingElement = {
          id: uuidv4(),
          type: 'text',
          points: [snappedPoint],
          color: selectedColor,
          strokeWidth,
          opacity,
          text: '',
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          created: Date.now(),
          updated: Date.now(),
          userId: currentUser?.id || 'anonymous',
        };

        dispatch(addElement(textElement));
        dispatch(setIsEditingText(true));
        dispatch(setEditingTextId(textElement.id));
        emitElementCreated(textElement);
      }
    } else if (selectedTool === 'eraser') {
      // Handle eraser action
      handleEraserAction(snappedPoint);
      dispatch(setIsDrawing(true));
      dispatch(setCurrentPath([snappedPoint]));
    } else {
      // Start drawing
      dispatch(setIsDrawing(true));
      dispatch(setCurrentPath([snappedPoint]));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(e.nativeEvent, canvas, zoom, pan);
    const snappedPoint = shouldSnapToGrid ? snapToGrid(point, gridSize) : point;

    // Always update last mouse position during movement
    lastMousePointRef.current = snappedPoint;

    updatePressure(e);

    // Emit cursor position
    emitCursor(snappedPoint);

    if (isPanningRef.current) {
      // Pan the canvas
      const deltaX = e.clientX - lastPanPointRef.current.x;
      const deltaY = e.clientY - lastPanPointRef.current.y;
      
      dispatch(setPan({
        x: pan.x + deltaX / zoom,
        y: pan.y + deltaY / zoom,
      }));
      
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    } else if (isDragging) {
      // Update drag preview
      updateDragPreview(snappedPoint);
    } else if (isDrawing) {
      if (selectedTool === 'eraser') {
        // Continue erasing
        handleEraserAction(snappedPoint);
        dispatch(setCurrentPath([...currentPath, snappedPoint]));
      } else if (selectedTool === 'pen' || selectedTool === 'pencil' || selectedTool === 'brush') {
        dispatch(setCurrentPath([...currentPath, snappedPoint]));
      } else {
        // For shapes, we only need start and end points
        dispatch(setCurrentPath([currentPath[0], snappedPoint]));
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
    } else if (isDragging) {
      // Use the precise last mouse position for drop
      if (lastMousePointRef.current) {
        completeDrag(lastMousePointRef.current);
      }
    } else if (isDrawing) {
      // Finish drawing (except for eraser which handles deletion in real-time)
      if (currentPath.length > 0 && selectedTool !== 'eraser') {
        const isTemporary = selectedTool === 'pen' && penType === 'laser';
        
        const element: DrawingElement = {
          id: uuidv4(),
          type: selectedTool as any,
          points: [...currentPath],
          color: selectedColor,
          strokeWidth: selectedTool === 'eraser' ? eraserSize : strokeWidth,
          opacity,
          penType: selectedTool === 'pen' ? penType : undefined,
          pencilType: selectedTool === 'pencil' ? pencilType : undefined,
          brushType: selectedTool === 'brush' ? brushType : undefined,
          eraserType: selectedTool === 'eraser' ? eraserType : undefined,
          created: Date.now(),
          updated: Date.now(),
          userId: currentUser?.id || 'anonymous',
          isTemporary,
        };

        dispatch(addElement(element));
        emitElementCreated(element);

        // Set timeout for laser pointer cleanup
        if (isTemporary) {
          if (laserTimeoutRef.current) {
            clearTimeout(laserTimeoutRef.current);
          }
          laserTimeoutRef.current = setTimeout(() => {
            dispatch(clearTemporaryElements());
          }, 2000);
        }
      }

      dispatch(setIsDrawing(false));
      dispatch(setCurrentPath([]));
    }
  };

  // Wheel event for zooming
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(4, zoom * zoomFactor));

    // Zoom towards mouse position
    const zoomPoint = {
      x: (mouseX / zoom - pan.x),
      y: (mouseY / zoom - pan.y),
    };

    dispatch(setZoom(newZoom));
    dispatch(setPan({
      x: pan.x + zoomPoint.x * (1 - newZoom / zoom),
      y: pan.y + zoomPoint.y * (1 - newZoom / zoom),
    }));
  };

  const getCursorStyle = () => {
    if (selectedTool === 'select') {
      if (isDragging) return 'grabbing';
      if (selectedElements.length > 0) return 'grab';
      return 'default';
    }
    if (selectedTool === 'eraser') return 'crosshair';
    if (selectedTool === 'text') return 'text';
    return 'crosshair';
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 canvas-container"
        style={{ cursor: getCursorStyle(), touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        role="img"
        aria-label="Collaborative whiteboard canvas"
        tabIndex={0}
      />
      
      {/* Text Editor */}
      {isEditingText && editingTextId && (
        <TextEditor
          elementId={editingTextId}
          onComplete={() => {
            dispatch(setIsEditingText(false));
            dispatch(setEditingTextId(null));
          }}
        />
      )}
    </>
  );
};

export default Canvas;