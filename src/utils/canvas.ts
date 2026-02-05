import { Point, DrawingElement, BackgroundType } from '../types';

export const snapToGrid = (point: Point, gridSize: number): Point => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
};

export const getCanvasPoint = (
  e: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement,
  zoom: number,
  pan: Point
): Point => {
  const rect = canvas.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  
  return {
    x: (clientX - rect.left) / zoom - pan.x,
    y: (clientY - rect.top) / zoom - pan.y,
  };
};

export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  backgroundColor: string,
  backgroundType: BackgroundType,
  gridSize: number,
  pan: Point,
  zoom: number,
  gridLineColor: string = '#e5e7eb',
  ruledLineColor: string = '#d1d5db'
) => {
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.save();
  
  // Fill background color
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  
  if (backgroundType === 'grid') {
    drawGrid(ctx, canvas, gridSize, pan, zoom, gridLineColor);
  } else if (backgroundType === 'lined') {
    drawLines(ctx, canvas, gridSize, pan, zoom, ruledLineColor);
  }
  
  ctx.restore();
};

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  gridSize: number,
  pan: Point,
  zoom: number,
  color: string = '#e5e7eb'
) => {
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  
  const startX = Math.floor(-pan.x / gridSize) * gridSize;
  const startY = Math.floor(-pan.y / gridSize) * gridSize;
  
  for (let x = startX; x < width / zoom - pan.x; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo((x + pan.x) * zoom, 0);
    ctx.lineTo((x + pan.x) * zoom, height);
    ctx.stroke();
  }
  
  for (let y = startY; y < height / zoom - pan.y; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, (y + pan.y) * zoom);
    ctx.lineTo(width, (y + pan.y) * zoom);
    ctx.stroke();
  }
  
  ctx.restore();
};

export const drawLines = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  lineSpacing: number,
  pan: Point,
  zoom: number,
  color: string = '#d1d5db'
) => {
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  
  const startY = Math.floor(-pan.y / lineSpacing) * lineSpacing;
  
  for (let y = startY; y < height / zoom - pan.y; y += lineSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, (y + pan.y) * zoom);
    ctx.lineTo(width, (y + pan.y) * zoom);
    ctx.stroke();
  }
  
  ctx.restore();
};

export const drawElement = (ctx: CanvasRenderingContext2D, element: DrawingElement, zoom: number, pan: Point) => {
  ctx.save();
  ctx.globalAlpha = element.opacity;
  ctx.strokeStyle = element.color;
  ctx.fillStyle = element.color;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Apply zoom and pan
  ctx.scale(zoom, zoom);
  ctx.translate(pan.x, pan.y);
  
  // Enhanced tool-specific styles with realism
  if (element.type === 'pen') {
    switch (element.penType) {
      case 'ballpoint':
        ctx.lineCap = 'round';
        ctx.lineWidth = element.strokeWidth * 0.8;
        break;
      case 'felt-tip':
        ctx.lineCap = 'square';
        ctx.lineWidth = element.strokeWidth * 1.2;
        break;
      case 'gel':
        ctx.shadowColor = element.color;
        ctx.shadowBlur = 1;
        ctx.globalAlpha = element.opacity * 0.9;
        break;
      case 'fountain':
        ctx.lineWidth = element.strokeWidth * 1.3;
        ctx.globalAlpha = element.opacity * 0.8;
        break;
      case 'laser':
        ctx.strokeStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 3;
        break;
    }
  } else if (element.type === 'pencil') {
    ctx.strokeStyle = element.color;
    ctx.globalAlpha = element.opacity * 0.7;
    switch (element.pencilType) {
      case 'HB':
        ctx.globalAlpha = element.opacity * 0.6;
        break;
      case '2B':
        ctx.lineWidth = element.strokeWidth * 1.1;
        ctx.globalAlpha = element.opacity * 0.7;
        break;
      case '4B':
        ctx.lineWidth = element.strokeWidth * 1.3;
        ctx.globalAlpha = element.opacity * 0.8;
        break;
    }
  } else if (element.type === 'brush') {
    switch (element.brushType) {
      case 'watercolor':
        ctx.globalAlpha = element.opacity * 0.5;
        ctx.lineWidth = element.strokeWidth * 2.5;
        ctx.shadowColor = element.color;
        ctx.shadowBlur = 3;
        break;
      case 'marker':
        ctx.lineCap = 'square';
        ctx.lineWidth = element.strokeWidth * 1.8;
        ctx.globalAlpha = element.opacity * 0.9;
        break;
    }
  } else if (element.type === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  }
  
  switch (element.type) {
    case 'pen':
    case 'pencil':
    case 'brush':
    case 'eraser':
      if (element.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(element.points[0].x, element.points[0].y);
        
        // Smooth curves for better drawing experience
        for (let i = 1; i < element.points.length - 1; i++) {
          const xc = (element.points[i].x + element.points[i + 1].x) / 2;
          const yc = (element.points[i].y + element.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(element.points[i].x, element.points[i].y, xc, yc);
        }
        
        if (element.points.length > 1) {
          const lastPoint = element.points[element.points.length - 1];
          ctx.lineTo(lastPoint.x, lastPoint.y);
        }
        
        ctx.stroke();
      }
      break;
      
    case 'rectangle':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.strokeRect(start.x, start.y, width, height);
      }
      break;
      
    case 'circle':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
      break;
      
    case 'line':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      break;
      
    case 'arrow':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const headLength = 15;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        
        // Draw arrowhead
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
      break;

    case 'triangle':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const width = end.x - start.x;
        const height = end.y - start.y;
        
        ctx.beginPath();
        ctx.moveTo(start.x + width / 2, start.y); // Top point
        ctx.lineTo(start.x, start.y + height); // Bottom left
        ctx.lineTo(start.x + width, start.y + height); // Bottom right
        ctx.closePath();
        ctx.stroke();
      }
      break;

    case 'diamond':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const width = Math.abs(end.x - start.x) / 2;
        const height = Math.abs(end.y - start.y) / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - height); // Top
        ctx.lineTo(centerX + width, centerY); // Right
        ctx.lineTo(centerX, centerY + height); // Bottom
        ctx.lineTo(centerX - width, centerY); // Left
        ctx.closePath();
        ctx.stroke();
      }
      break;

    case 'star':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const outerRadius = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) / 2;
        const innerRadius = outerRadius * 0.4;
        const spikes = 5;
        
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }
      break;

    case 'heart':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        const centerX = (start.x + end.x) / 2;
        const topY = Math.min(start.y, end.y);
        
        ctx.beginPath();
        ctx.moveTo(centerX, topY + height * 0.3);
        ctx.bezierCurveTo(centerX - width * 0.5, topY, centerX - width * 0.5, topY + height * 0.4, centerX, topY + height * 0.7);
        ctx.bezierCurveTo(centerX + width * 0.5, topY + height * 0.4, centerX + width * 0.5, topY, centerX, topY + height * 0.3);
        ctx.stroke();
      }
      break;

    case 'hexagon':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const radius = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) / 2;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }
      break;
      
    case 'text':
      if (element.text && element.points.length > 0) {
        ctx.font = `${element.fontStyle || 'normal'} ${element.fontWeight || 'normal'} ${element.fontSize || 16}px ${element.fontFamily || 'Arial'}`;
        ctx.textAlign = (element.textAlign || 'left') as CanvasTextAlign;
        ctx.fillText(element.text, element.points[0].x, element.points[0].y);
      }
      break;
  }
  
  ctx.restore();
};

export const drawCursor = (
  ctx: CanvasRenderingContext2D,
  cursor: Point,
  color: string,
  zoom: number,
  pan: Point
) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  
  const x = (cursor.x + pan.x) * zoom;
  const y = (cursor.y + pan.y) * zoom;
  
  // Enhanced cursor with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Draw cursor
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 12, y + 4);
  ctx.lineTo(x + 8, y + 8);
  ctx.lineTo(x + 4, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
};

export const getBoundingBox = (points: Point[]) => {
  if (points.length === 0) return null;
  
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

// Drag and Drop Utility Functions
export const isPointInElement = (point: Point, element: DrawingElement, customTolerance?: number): boolean => {
  if (element.points.length === 0) return false;
  
  const tolerance = customTolerance !== undefined ? customTolerance : Math.max(element.strokeWidth || 2, 10); // Minimum 10px hit area
  
  switch (element.type) {
    case 'rectangle':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const minX = Math.min(start.x, end.x) - tolerance;
        const maxX = Math.max(start.x, end.x) + tolerance;
        const minY = Math.min(start.y, end.y) - tolerance;
        const maxY = Math.max(start.y, end.y) + tolerance;
        return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
      }
      break;
      
    case 'circle':
      if (element.points.length >= 2) {
        const [center, edge] = element.points;
        const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
        const distance = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
        return Math.abs(distance - radius) <= tolerance;
      }
      break;
      
    case 'line':
    case 'arrow':
      if (element.points.length >= 2) {
        const [start, end] = element.points;
        const distance = distanceToLineSegment(point, start, end);
        return distance <= tolerance;
      }
      break;
      
    case 'triangle':
    case 'diamond':
    case 'star':
    case 'heart':
    case 'hexagon':
      // For complex shapes, use bounding box with tolerance
      const bounds = getBoundingBox(element.points);
      if (bounds) {
        return point.x >= bounds.x - tolerance && 
               point.x <= bounds.x + bounds.width + tolerance &&
               point.y >= bounds.y - tolerance && 
               point.y <= bounds.y + bounds.height + tolerance;
      }
      break;
      
    case 'text':
      if (element.points.length > 0 && element.text) {
        const textPoint = element.points[0];
        const fontSize = element.fontSize || 16;
        const textWidth = (element.text.length * fontSize * 0.6); // Approximate text width
        return point.x >= textPoint.x - tolerance &&
               point.x <= textPoint.x + textWidth + tolerance &&
               point.y >= textPoint.y - fontSize - tolerance &&
               point.y <= textPoint.y + tolerance;
      }
      break;
      
    case 'pen':
    case 'pencil':
    case 'brush':
      // For freehand drawings, check if point is near any segment
      for (let i = 0; i < element.points.length - 1; i++) {
        const distance = distanceToLineSegment(point, element.points[i], element.points[i + 1]);
        if (distance <= tolerance) return true;
      }
      break;
  }
  
  return false;
};

export const distanceToLineSegment = (point: Point, start: Point, end: Point): number => {
  const A = point.x - start.x;
  const B = point.y - start.y;
  const C = end.x - start.x;
  const D = end.y - start.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Start and end are the same point
    return Math.sqrt(A * A + B * B);
  }
  
  let param = dot / lenSq;
  
  let xx, yy;
  
  if (param < 0) {
    xx = start.x;
    yy = start.y;
  } else if (param > 1) {
    xx = end.x;
    yy = end.y;
  } else {
    xx = start.x + param * C;
    yy = start.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

export const drawSelectionBox = (
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  zoom: number,
  pan: Point
) => {
  const bounds = getBoundingBox(element.points);
  if (!bounds) return;
  
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(pan.x, pan.y);
  
  // Selection box styling
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2 / zoom; // Adjust line width for zoom
  ctx.setLineDash([5 / zoom, 5 / zoom]);
  ctx.globalAlpha = 0.8;
  
  // Draw selection rectangle
  const padding = 5;
  ctx.strokeRect(
    bounds.x - padding,
    bounds.y - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2
  );
  
  // Draw corner handles
  ctx.setLineDash([]);
  ctx.fillStyle = '#3b82f6';
  ctx.globalAlpha = 1;
  
  const handleSize = 6 / zoom;
  const corners = [
    { x: bounds.x - padding, y: bounds.y - padding }, // Top-left
    { x: bounds.x + bounds.width + padding, y: bounds.y - padding }, // Top-right
    { x: bounds.x - padding, y: bounds.y + bounds.height + padding }, // Bottom-left
    { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding }, // Bottom-right
  ];
  
  corners.forEach(corner => {
    ctx.fillRect(
      corner.x - handleSize / 2,
      corner.y - handleSize / 2,
      handleSize,
      handleSize
    );
  });
  
  ctx.restore();
};

export const drawDragPreview = (
  ctx: CanvasRenderingContext2D,
  elements: DrawingElement[],
  previewPosition: Point,
  zoom: number,
  pan: Point
) => {
  ctx.save();
  ctx.globalAlpha = 0.5;
  
  elements.forEach(element => {
    if (element.isSelected) {
      // Create a preview element with offset position
      const previewElement = {
        ...element,
        points: element.points.map(point => ({
          x: point.x + previewPosition.x,
          y: point.y + previewPosition.y
        }))
      };
      
      drawElement(ctx, previewElement, zoom, pan);
    }
  });
  
  ctx.restore();
};

export const isValidDropZone = (point: Point, canvasWidth: number, canvasHeight: number): boolean => {
  // Simple validation - ensure the drop point is within canvas bounds
  // You can extend this with more complex validation logic
  return point.x >= 0 && point.x <= canvasWidth && point.y >= 0 && point.y <= canvasHeight;
};