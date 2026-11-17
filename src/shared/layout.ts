import dagre from 'dagre';
import { v4 as uuidv4 } from 'uuid';
import { AddNodeOp, AddEdgeOp, AddTextOp, HighlightOp, GraphOp } from './schema';
import { DrawingElement, Point } from '../types';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface LayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  nodeSep?: number;
  rankSep?: number;
  origin?: Point;
  existingElements?: DrawingElement[];
  selectedIds?: string[];
  gap?: number;
  maxRowWidth?: number;
}

export interface LaidOutNode {
  id: string;
  label: string;
  x: number; // center x
  y: number; // center y
  topLeftX: number;
  topLeftY: number;
  width: number;
  height: number;
  shape: 'rectangle' | 'circle' | 'diamond' | 'hexagon';
  color: string;
  backgroundColor?: string;
  strokeWidth: number;
  fontSize: number;
  commandId: string;
  author: string;
}

export interface LaidOutEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  points: Point[];
  color: string;
  strokeWidth: number;
  lineStyle: 'solid' | 'dashed';
  arrowDirection: 'forward' | 'both' | 'none';
  commandId: string;
  author: string;
}

export interface LaidOutGraph {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

const DEFAULT_NODE_COLOR = '#3B82F6';
const DEFAULT_EDGE_COLOR = '#4B5563';
const DEFAULT_TEXT_COLOR = '#1F2937';

/**
 * Calculates node dimensions based on label length and style hints.
 */
export function estimateNodeDimensions(label: string, style?: AddNodeOp['style']): { width: number; height: number } {
  if (style?.width && style?.height) {
    return { width: style.width, height: style.height };
  }
  const lines = label.split('\n');
  const maxLineLen = Math.max(...lines.map(l => l.length), 1);
  const calculatedWidth = Math.max(120, Math.min(320, maxLineLen * 10 + 40));
  const calculatedHeight = Math.max(50, Math.min(200, lines.length * 24 + 26));

  return {
    width: style?.width ?? calculatedWidth,
    height: style?.height ?? calculatedHeight,
  };
}

/**
 * Runs dagre auto-layout on high-level nodes and edges.
 * Guarantees that no pixel coordinates are required from the LLM.
 */
export function layoutGraph(
  nodes: AddNodeOp[],
  edges: AddEdgeOp[],
  options?: LayoutOptions
): LaidOutGraph {
  const g = new dagre.graphlib.Graph();
  const direction = options?.direction || 'TB';
  const nodeSep = options?.nodeSep || 50;
  const rankSep = options?.rankSep || 60;
  const origin = options?.origin || { x: 120, y: 120 };

  g.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to Dagre
  for (const node of nodes) {
    const dims = estimateNodeDimensions(node.label, node.style);
    g.setNode(node.id, {
      width: dims.width,
      height: dims.height,
      label: node.label,
    });
  }

  // Add edges to Dagre (only if both endpoints exist in the graph)
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      g.setEdge(edge.from, edge.to);
    }
  }

  // Execute Dagre layout
  dagre.layout(g);

  // Compute graph bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const laidOutNodes: LaidOutNode[] = [];

  for (const node of nodes) {
    const dagreNode = g.node(node.id);
    if (!dagreNode) continue;

    const width = dagreNode.width;
    const height = dagreNode.height;
    // Dagre returns center coordinates (x, y)
    const centerX = dagreNode.x;
    const centerY = dagreNode.y;
    const topLeftX = centerX - width / 2;
    const topLeftY = centerY - height / 2;

    minX = Math.min(minX, topLeftX);
    minY = Math.min(minY, topLeftY);
    maxX = Math.max(maxX, topLeftX + width);
    maxY = Math.max(maxY, topLeftY + height);

    laidOutNodes.push({
      id: node.id,
      label: node.label,
      x: centerX,
      y: centerY,
      topLeftX,
      topLeftY,
      width,
      height,
      shape: node.style?.shape || 'rectangle',
      color: node.style?.color || DEFAULT_NODE_COLOR,
      backgroundColor: node.style?.backgroundColor,
      strokeWidth: node.style?.strokeWidth || 2,
      fontSize: node.style?.fontSize || 14,
      commandId: node.commandId,
      author: node.author,
    });
  }

  // Normalize coordinates relative to origin
  const shiftX = (isFinite(minX) ? origin.x - minX : origin.x);
  const shiftY = (isFinite(minY) ? origin.y - minY : origin.y);

  for (const node of laidOutNodes) {
    node.x += shiftX;
    node.y += shiftY;
    node.topLeftX += shiftX;
    node.topLeftY += shiftY;
  }

  const laidOutEdges: LaidOutEdge[] = [];
  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;

    const dagreEdge = g.edge(edge.from, edge.to);
    const points: Point[] = [];

    if (dagreEdge && Array.isArray(dagreEdge.points) && dagreEdge.points.length > 0) {
      for (const p of dagreEdge.points) {
        points.push({ x: p.x + shiftX, y: p.y + shiftY });
      }
    } else {
      // Fallback: direct line between centers
      const fromNode = laidOutNodes.find(n => n.id === edge.from);
      const toNode = laidOutNodes.find(n => n.id === edge.to);
      if (fromNode && toNode) {
        points.push({ x: fromNode.x, y: fromNode.y });
        points.push({ x: toNode.x, y: toNode.y });
      }
    }

    if (points.length >= 2) {
      laidOutEdges.push({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        points,
        color: edge.style?.color || DEFAULT_EDGE_COLOR,
        strokeWidth: edge.style?.strokeWidth || 2,
        lineStyle: edge.style?.lineStyle || 'solid',
        arrowDirection: edge.style?.arrowDirection || 'forward',
        commandId: edge.commandId,
        author: edge.author,
      });
    }
  }

  const finalMinX = isFinite(minX) ? minX + shiftX : origin.x;
  const finalMinY = isFinite(minY) ? minY + shiftY : origin.y;
  const finalMaxX = isFinite(maxX) ? maxX + shiftX : origin.x;
  const finalMaxY = isFinite(maxY) ? maxY + shiftY : origin.y;

  return {
    nodes: laidOutNodes,
    edges: laidOutEdges,
    bounds: {
      minX: finalMinX,
      minY: finalMinY,
      maxX: finalMaxX,
      maxY: finalMaxY,
      width: Math.max(0, finalMaxX - finalMinX),
      height: Math.max(0, finalMaxY - finalMinY),
    },
  };
}

/**
 * Computes the tight axis-aligned bounding box covering a list of DrawingElements.
 */
export function computeElementsBoundingBox(elements: DrawingElement[]): BoundingBox | null {
  if (!elements || elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasValid = false;

  for (const el of elements) {
    if (el.bounds && typeof el.bounds.x === 'number' && typeof el.bounds.y === 'number') {
      const w = el.bounds.width || 0;
      const h = el.bounds.height || 0;
      minX = Math.min(minX, el.bounds.x);
      minY = Math.min(minY, el.bounds.y);
      maxX = Math.max(maxX, el.bounds.x + w);
      maxY = Math.max(maxY, el.bounds.y + h);
      hasValid = true;
    }
    if (Array.isArray(el.points) && el.points.length > 0) {
      for (const p of el.points) {
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
          hasValid = true;
        }
      }
    }
  }

  if (!hasValid || !isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

/**
 * Checks if two bounding boxes intersect, with an optional safety margin.
 */
export function boxesOverlap(a: BoundingBox, b: BoundingBox, padding = 20): boolean {
  return !(
    a.maxX + padding <= b.minX ||
    a.minX - padding >= b.maxX ||
    a.maxY + padding <= b.minY ||
    a.minY - padding >= b.maxY
  );
}

/**
 * Computes a smart, non-overlapping canvas origin for a new diagram.
 * Places diagrams in clean horizontal bands (left-to-right), wrapping to new rows
 * when canvas width limit is approached, and guarantees zero overlaps with existing content.
 */
export function computeNonOverlappingOrigin(
  existingElements: DrawingElement[],
  diagramWidth: number,
  diagramHeight: number,
  options?: {
    selectedIds?: string[];
    gap?: number;
    maxRowWidth?: number;
    defaultOrigin?: Point;
  }
): Point {
  const defaultOrigin: Point = options?.defaultOrigin || { x: 120, y: 120 };
  const gap = options?.gap ?? 100;
  const maxRowWidth = options?.maxRowWidth ?? 2400;

  if (!existingElements || existingElements.length === 0) {
    return defaultOrigin;
  }

  const overallBox = computeElementsBoundingBox(existingElements);
  if (!overallBox) {
    return defaultOrigin;
  }

  // 1. If specific elements are selected, try placing adjacent to the selection
  if (options?.selectedIds && options.selectedIds.length > 0) {
    const selected = existingElements.filter(el => options.selectedIds!.includes(el.id));
    const selBox = computeElementsBoundingBox(selected);
    if (selBox) {
      // Candidate A: Place directly to the right of selection
      const rightCandidate: BoundingBox = {
        minX: selBox.maxX + gap,
        minY: selBox.minY,
        maxX: selBox.maxX + gap + diagramWidth,
        maxY: selBox.minY + diagramHeight,
        width: diagramWidth,
        height: diagramHeight,
      };

      const collidesWithExisting = existingElements.some(el => {
        const elBox = computeElementsBoundingBox([el]);
        return elBox ? boxesOverlap(rightCandidate, elBox, 20) : false;
      });

      if (!collidesWithExisting && rightCandidate.maxX <= maxRowWidth) {
        return { x: rightCandidate.minX, y: rightCandidate.minY };
      }

      // Candidate B: Place directly below selection
      const belowCandidate: BoundingBox = {
        minX: selBox.minX,
        minY: selBox.maxY + gap,
        maxX: selBox.minX + diagramWidth,
        maxY: selBox.maxY + gap + diagramHeight,
        width: diagramWidth,
        height: diagramHeight,
      };

      const collidesBelow = existingElements.some(el => {
        const elBox = computeElementsBoundingBox([el]);
        return elBox ? boxesOverlap(belowCandidate, elBox, 20) : false;
      });

      if (!collidesBelow) {
        return { x: belowCandidate.minX, y: belowCandidate.minY };
      }
    }
  }

  // 2. Identify the bottom-most band of elements (current row)
  const rowThreshold = Math.max(overallBox.minY, overallBox.maxY - 350);
  const bottomBandElements = existingElements.filter(el => {
    const b = computeElementsBoundingBox([el]);
    return b && b.maxY >= rowThreshold;
  });

  let bottomRowMaxX = overallBox.minX;
  let bottomRowMinY = overallBox.minY;

  if (bottomBandElements.length > 0) {
    const bottomBandBox = computeElementsBoundingBox(bottomBandElements);
    if (bottomBandBox) {
      bottomRowMaxX = bottomBandBox.maxX;
      bottomRowMinY = bottomBandBox.minY;
    }
  }

  // Candidate 1: Place horizontally to the right of the bottom row
  const rightCandidateX = bottomRowMaxX + gap;
  const rightCandidateY = bottomRowMinY;

  if (rightCandidateX + diagramWidth <= maxRowWidth) {
    const candidateBox: BoundingBox = {
      minX: rightCandidateX,
      minY: rightCandidateY,
      maxX: rightCandidateX + diagramWidth,
      maxY: rightCandidateY + diagramHeight,
      width: diagramWidth,
      height: diagramHeight,
    };

    const hasCollision = existingElements.some(el => {
      const elBox = computeElementsBoundingBox([el]);
      return elBox ? boxesOverlap(candidateBox, elBox, 20) : false;
    });

    if (!hasCollision) {
      return { x: rightCandidateX, y: rightCandidateY };
    }
  }

  // Candidate 2: Row is full or collides -> wrap to a new row below all existing elements
  const nextRowX = defaultOrigin.x;
  const nextRowY = overallBox.maxY + gap;

  return { x: nextRowX, y: nextRowY };
}

/**
 * Compiles high-level graph operations into concrete StudySync DrawingElement primitives.
 * All created elements are assigned the commandId for single-click "Undo AI".
 */
export function graphOpsToDrawingElements(
  ops: GraphOp[],
  options?: LayoutOptions
): DrawingElement[] {
  const nodes: AddNodeOp[] = [];
  const edges: AddEdgeOp[] = [];
  const texts: AddTextOp[] = [];
  const highlights: HighlightOp[] = [];

  for (const op of ops) {
    switch (op.type) {
      case 'add_node':
        nodes.push(op);
        break;
      case 'add_edge':
        edges.push(op);
        break;
      case 'add_text':
        texts.push(op);
        break;
      case 'highlight':
        highlights.push(op);
        break;
      case 'clear_selection':
        break;
    }
  }

  let effectiveOrigin = options?.origin;

  if (!effectiveOrigin && options?.existingElements && options.existingElements.length > 0) {
    // 1. Run preliminary layout at (0, 0) to obtain diagram dimensions
    const prelimLayout = layoutGraph(nodes, edges, { ...options, origin: { x: 0, y: 0 } });
    const diagramWidth = prelimLayout.bounds.width;
    const diagramHeight = prelimLayout.bounds.height;

    // 2. Compute non-overlapping origin
    effectiveOrigin = computeNonOverlappingOrigin(
      options.existingElements,
      diagramWidth,
      diagramHeight,
      {
        selectedIds: options.selectedIds,
        gap: options.gap,
        maxRowWidth: options.maxRowWidth,
      }
    );
  }

  const layout = layoutGraph(nodes, edges, {
    ...options,
    origin: effectiveOrigin || options?.origin || { x: 120, y: 120 },
  });
  const elements: DrawingElement[] = [];
  const now = Date.now();

  const nodeMap = new Map<string, LaidOutNode>();
  for (const node of layout.nodes) {
    nodeMap.set(node.id, node);
  }

  // 1. Render Highlights (rendered behind shapes)
  for (const hl of highlights) {
    const targetNode = nodeMap.get(hl.targetId);
    if (targetNode) {
      const padding = hl.style?.padding ?? 10;
      const x = targetNode.topLeftX - padding;
      const y = targetNode.topLeftY - padding;
      const width = targetNode.width + padding * 2;
      const height = targetNode.height + padding * 2;

      elements.push({
        id: `hl-${hl.id}-${uuidv4().slice(0, 8)}`,
        type: 'rectangle',
        points: [
          { x, y },
          { x: x + width, y: y + height },
        ],
        color: hl.style?.color || '#FDE047',
        strokeWidth: 3,
        opacity: hl.style?.opacity ?? 0.4,
        bounds: { x, y, width, height },
        created: now,
        updated: now,
        userId: hl.author,
        commandId: hl.commandId,
      });
    }
  }

  // 2. Render Nodes (Shapes + Text)
  for (const node of layout.nodes) {
    const shapeId = `node-shape-${node.id}`;
    const textId = `node-text-${node.id}`;

    // A. Shape primitive
    if (node.shape === 'circle') {
      const radius = Math.min(node.width, node.height) / 2;
      elements.push({
        id: shapeId,
        type: 'circle',
        points: [
          { x: node.x, y: node.y },
          { x: node.x + radius, y: node.y },
        ],
        color: node.color,
        strokeWidth: node.strokeWidth,
        opacity: 1,
        created: now,
        updated: now,
        userId: node.author,
        commandId: node.commandId,
        bounds: {
          x: node.x - radius,
          y: node.y - radius,
          width: radius * 2,
          height: radius * 2,
        },
      });
    } else if (node.shape === 'diamond') {
      elements.push({
        id: shapeId,
        type: 'diamond',
        points: [
          { x: node.topLeftX, y: node.topLeftY },
          { x: node.topLeftX + node.width, y: node.topLeftY + node.height },
        ],
        color: node.color,
        strokeWidth: node.strokeWidth,
        opacity: 1,
        created: now,
        updated: now,
        userId: node.author,
        commandId: node.commandId,
        bounds: {
          x: node.topLeftX,
          y: node.topLeftY,
          width: node.width,
          height: node.height,
        },
      });
    } else if (node.shape === 'hexagon') {
      elements.push({
        id: shapeId,
        type: 'hexagon',
        points: [
          { x: node.topLeftX, y: node.topLeftY },
          { x: node.topLeftX + node.width, y: node.topLeftY + node.height },
        ],
        color: node.color,
        strokeWidth: node.strokeWidth,
        opacity: 1,
        created: now,
        updated: now,
        userId: node.author,
        commandId: node.commandId,
        bounds: {
          x: node.topLeftX,
          y: node.topLeftY,
          width: node.width,
          height: node.height,
        },
      });
    } else {
      // Default: rectangle
      elements.push({
        id: shapeId,
        type: 'rectangle',
        points: [
          { x: node.topLeftX, y: node.topLeftY },
          { x: node.topLeftX + node.width, y: node.topLeftY + node.height },
        ],
        color: node.color,
        strokeWidth: node.strokeWidth,
        opacity: 1,
        created: now,
        updated: now,
        userId: node.author,
        commandId: node.commandId,
        bounds: {
          x: node.topLeftX,
          y: node.topLeftY,
          width: node.width,
          height: node.height,
        },
      });
    }

    // B. Text primitive centered inside the shape
    elements.push({
      id: textId,
      type: 'text',
      points: [{ x: node.x, y: node.y + (node.fontSize / 3) }],
      color: DEFAULT_TEXT_COLOR,
      strokeWidth: 1,
      opacity: 1,
      text: node.label,
      fontSize: node.fontSize,
      fontFamily: 'Arial',
      fontWeight: '500',
      textAlign: 'center',
      created: now,
      updated: now,
      userId: node.author,
      commandId: node.commandId,
    });
  }

  // 3. Render Edges (Arrows)
  for (const edge of layout.edges) {
    if (edge.points.length < 2) continue;

    const start = edge.points[0];
    const end = edge.points[edge.points.length - 1];

    elements.push({
      id: `edge-${edge.id}`,
      type: edge.arrowDirection === 'none' ? 'line' : 'arrow',
      points: [start, end],
      color: edge.color,
      strokeWidth: edge.strokeWidth,
      opacity: 1,
      created: now,
      updated: now,
      userId: edge.author,
      commandId: edge.commandId,
    });

    // Optional edge label
    if (edge.label) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2 - 10;
      elements.push({
        id: `edge-label-${edge.id}`,
        type: 'text',
        points: [{ x: midX, y: midY }],
        color: edge.color,
        strokeWidth: 1,
        opacity: 1,
        text: edge.label,
        fontSize: 12,
        fontFamily: 'Arial',
        textAlign: 'center',
        created: now,
        updated: now,
        userId: edge.author,
        commandId: edge.commandId,
      });
    }
  }

  // 4. Render Standalone Texts
  for (const t of texts) {
    let x = layout.bounds.minX;
    let y = layout.bounds.maxY + 30;

    if (t.nearNodeId && nodeMap.has(t.nearNodeId)) {
      const near = nodeMap.get(t.nearNodeId)!;
      x = near.topLeftX;
      y = near.topLeftY + near.height + 25;
    }

    elements.push({
      id: `text-${t.id}`,
      type: 'text',
      points: [{ x, y }],
      color: t.style?.color || DEFAULT_TEXT_COLOR,
      strokeWidth: 1,
      opacity: 1,
      text: t.text,
      fontSize: t.style?.fontSize || 16,
      fontFamily: 'Arial',
      fontWeight: t.style?.fontWeight || 'normal',
      textAlign: t.style?.textAlign || 'left',
      created: now,
      updated: now,
      userId: t.author,
      commandId: t.commandId,
    });
  }

  return elements;
}

