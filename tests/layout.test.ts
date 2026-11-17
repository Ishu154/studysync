import { describe, it, expect } from 'vitest';
import {
  layoutGraph,
  graphOpsToDrawingElements,
  estimateNodeDimensions,
  computeElementsBoundingBox,
  computeNonOverlappingOrigin,
  boxesOverlap,
} from '../src/shared/layout';
import { AddNodeOp, AddEdgeOp, GraphOp } from '../src/shared/schema';
import { DrawingElement } from '../src/types';

describe('Auto-Layout with Dagre', () => {
  describe('estimateNodeDimensions', () => {
    it('uses style dimensions when provided', () => {
      const dims = estimateNodeDimensions('Test', { width: 300, height: 120 });
      expect(dims.width).toBe(300);
      expect(dims.height).toBe(120);
    });

    it('estimates dimensions dynamically based on label length', () => {
      const shortDims = estimateNodeDimensions('Hi');
      const longDims = estimateNodeDimensions('A very detailed microservice architecture label');
      expect(longDims.width).toBeGreaterThan(shortDims.width);
    });
  });

  describe('layoutGraph', () => {
    it('lays out a simple two-node graph with top-to-bottom (TB) ordering', () => {
      const nodes: AddNodeOp[] = [
        { type: 'add_node', id: 'start', label: 'Start Node', commandId: 'c1', author: 'bot' },
        { type: 'add_node', id: 'end', label: 'End Node', commandId: 'c1', author: 'bot' },
      ];
      const edges: AddEdgeOp[] = [
        { type: 'add_edge', id: 'e1', from: 'start', to: 'end', commandId: 'c1', author: 'bot' },
      ];

      const result = layoutGraph(nodes, edges, { direction: 'TB', origin: { x: 100, y: 100 } });

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);

      const startNode = result.nodes.find(n => n.id === 'start')!;
      const endNode = result.nodes.find(n => n.id === 'end')!;

      // In TB direction, start node y must be above end node y
      expect(startNode.y).toBeLessThan(endNode.y);

      // Edge points must connect from near start to near end
      const edge = result.edges[0];
      expect(edge.points.length).toBeGreaterThanOrEqual(2);
      expect(edge.points[0].y).toBeLessThan(edge.points[edge.points.length - 1].y);
    });

    it('lays out in left-to-right (LR) direction', () => {
      const nodes: AddNodeOp[] = [
        { type: 'add_node', id: 'a', label: 'Input', commandId: 'c1', author: 'bot' },
        { type: 'add_node', id: 'b', label: 'Output', commandId: 'c1', author: 'bot' },
      ];
      const edges: AddEdgeOp[] = [
        { type: 'add_edge', id: 'e1', from: 'a', to: 'b', commandId: 'c1', author: 'bot' },
      ];

      const result = layoutGraph(nodes, edges, { direction: 'LR', origin: { x: 100, y: 100 } });

      const nodeA = result.nodes.find(n => n.id === 'a')!;
      const nodeB = result.nodes.find(n => n.id === 'b')!;

      // In LR direction, nodeA x must be less than nodeB x
      expect(nodeA.x).toBeLessThan(nodeB.x);
    });

    it('handles disconnected nodes without throwing', () => {
      const nodes: AddNodeOp[] = [
        { type: 'add_node', id: 'n1', label: 'Isolated A', commandId: 'c1', author: 'bot' },
        { type: 'add_node', id: 'n2', label: 'Isolated B', commandId: 'c1', author: 'bot' },
      ];

      const result = layoutGraph(nodes, []);
      expect(result.nodes).toHaveLength(2);
      expect(result.bounds.width).toBeGreaterThan(0);
    });

    it('handles cyclic graphs gracefully', () => {
      const nodes: AddNodeOp[] = [
        { type: 'add_node', id: 'cycle1', label: 'Step 1', commandId: 'c1', author: 'bot' },
        { type: 'add_node', id: 'cycle2', label: 'Step 2', commandId: 'c1', author: 'bot' },
      ];
      const edges: AddEdgeOp[] = [
        { type: 'add_edge', id: 'e1', from: 'cycle1', to: 'cycle2', commandId: 'c1', author: 'bot' },
        { type: 'add_edge', id: 'e2', from: 'cycle2', to: 'cycle1', commandId: 'c1', author: 'bot' },
      ];

      expect(() => layoutGraph(nodes, edges)).not.toThrow();
    });
  });

  describe('graphOpsToDrawingElements', () => {
    it('converts graph operations into concrete StudySync DrawingElement primitives', () => {
      const ops: GraphOp[] = [
        {
          type: 'add_node',
          id: 'client',
          label: 'Client Browser',
          style: { shape: 'rectangle', color: '#3B82F6' },
          commandId: 'cmd-ai-1',
          author: 'studybot',
        },
        {
          type: 'add_node',
          id: 'server',
          label: 'App Server',
          style: { shape: 'circle', color: '#10B981' },
          commandId: 'cmd-ai-1',
          author: 'studybot',
        },
        {
          type: 'add_edge',
          id: 'conn',
          from: 'client',
          to: 'server',
          label: 'WebSocket',
          commandId: 'cmd-ai-1',
          author: 'studybot',
        },
        {
          type: 'highlight',
          id: 'hl1',
          targetId: 'server',
          commandId: 'cmd-ai-1',
          author: 'studybot',
        },
        {
          type: 'add_text',
          id: 'legend',
          text: 'Real-time WebSocket Flow',
          commandId: 'cmd-ai-1',
          author: 'studybot',
        },
      ];

      const elements = graphOpsToDrawingElements(ops, { origin: { x: 150, y: 150 } });

      // Verifications:
      expect(elements.length).toBeGreaterThan(4);

      // Every element must carry the commandId and author
      for (const el of elements) {
        expect(el.commandId).toBe('cmd-ai-1');
        expect(el.userId).toBe('studybot');
        expect(el.created).toBeDefined();
        expect(el.points.length).toBeGreaterThan(0);
      }

      // Check node shape elements
      const rectangle = elements.find(el => el.type === 'rectangle' && el.id.includes('client'));
      expect(rectangle).toBeDefined();
      expect(rectangle?.color).toBe('#3B82F6');

      const circle = elements.find(el => el.type === 'circle' && el.id.includes('server'));
      expect(circle).toBeDefined();
      expect(circle?.color).toBe('#10B981');

      // Check arrow element
      const arrow = elements.find(el => el.type === 'arrow');
      expect(arrow).toBeDefined();

      // Check edge label text
      const edgeLabel = elements.find(el => el.type === 'text' && el.text === 'WebSocket');
      expect(edgeLabel).toBeDefined();

      // Check highlight element
      const highlight = elements.find(el => el.id.startsWith('hl-'));
      expect(highlight).toBeDefined();
      expect(highlight?.opacity).toBeLessThan(1);
    });

    it('places subsequent diagrams at non-overlapping positions when existingElements are provided', () => {
      const ops1: GraphOp[] = [
        { type: 'add_node', id: 'n1', label: 'Node 1', commandId: 'c1', author: 'bot' },
        { type: 'add_node', id: 'n2', label: 'Node 2', commandId: 'c1', author: 'bot' },
        { type: 'add_edge', id: 'e1', from: 'n1', to: 'n2', commandId: 'c1', author: 'bot' },
      ];

      // Diagram 1
      const diag1Elements = graphOpsToDrawingElements(ops1);
      const box1 = computeElementsBoundingBox(diag1Elements)!;
      expect(box1).toBeDefined();

      // Diagram 2 - passed existingElements
      const ops2: GraphOp[] = [
        { type: 'add_node', id: 'n3', label: 'Node 3', commandId: 'c2', author: 'bot' },
        { type: 'add_node', id: 'n4', label: 'Node 4', commandId: 'c2', author: 'bot' },
        { type: 'add_edge', id: 'e2', from: 'n3', to: 'n4', commandId: 'c2', author: 'bot' },
      ];
      const diag2Elements = graphOpsToDrawingElements(ops2, { existingElements: diag1Elements });
      const box2 = computeElementsBoundingBox(diag2Elements)!;
      expect(box2).toBeDefined();

      // Verify that Diagram 2 does not overlap with Diagram 1!
      expect(boxesOverlap(box1, box2, 10)).toBe(false);
      // Diagram 2 should be placed to the right of Diagram 1
      expect(box2.minX).toBeGreaterThanOrEqual(box1.maxX);
    });
  });

  describe('Non-overlapping Diagram Placement', () => {
    it('computes accurate bounding box for elements with bounds and points', () => {
      const elements: DrawingElement[] = [
        {
          id: 'rect1',
          type: 'rectangle',
          points: [{ x: 100, y: 100 }, { x: 300, y: 250 }],
          bounds: { x: 100, y: 100, width: 200, height: 150 },
          color: '#3B82F6',
          strokeWidth: 2,
          opacity: 1,
          created: 1,
          updated: 1,
          userId: 'user',
        },
      ];

      const box = computeElementsBoundingBox(elements);
      expect(box).toEqual({
        minX: 100,
        minY: 100,
        maxX: 300,
        maxY: 250,
        width: 200,
        height: 150,
      });
    });

    it('wraps to a new row below when horizontal canvas row limit is exceeded', () => {
      // Simulate elements stretching up to x = 2300
      const existing: DrawingElement[] = [
        {
          id: 'wide-box',
          type: 'rectangle',
          points: [{ x: 120, y: 120 }, { x: 2300, y: 450 }],
          bounds: { x: 120, y: 120, width: 2180, height: 330 },
          color: '#3B82F6',
          strokeWidth: 2,
          opacity: 1,
          created: 1,
          updated: 1,
          userId: 'user',
        },
      ];

      const origin = computeNonOverlappingOrigin(existing, 400, 300, { maxRowWidth: 2400 });
      // Should wrap down to y >= 450 + gap
      expect(origin.x).toBe(120);
      expect(origin.y).toBeGreaterThanOrEqual(500);
    });
  });
});

