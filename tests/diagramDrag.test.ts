import { describe, it, expect } from 'vitest';
import { isPointInElement, getElementsBoundingBox } from '../src/utils/canvas';
import { graphOpsToDrawingElements } from '../src/shared/layout';
import { GraphOp } from '../src/shared/schema';
import { DrawingElement } from '../src/types';

describe('Diagram Dragging & Hit-Testing', () => {
  const ops: GraphOp[] = [
    { type: 'add_node', id: 'n1', label: 'Node A', style: { shape: 'rectangle' }, commandId: 'cmd-diagram-1', author: 'studybot' },
    { type: 'add_node', id: 'n2', label: 'Node B', style: { shape: 'circle' }, commandId: 'cmd-diagram-1', author: 'studybot' },
    { type: 'add_edge', id: 'e1', from: 'n1', to: 'n2', commandId: 'cmd-diagram-1', author: 'studybot' },
  ];

  const elements = graphOpsToDrawingElements(ops, { origin: { x: 200, y: 200 } });

  it('generates elements that all share the same commandId for group dragging', () => {
    expect(elements.length).toBeGreaterThan(0);
    elements.forEach(el => {
      expect(el.commandId).toBe('cmd-diagram-1');
    });
  });

  it('correctly hit-tests inside a node rectangle using element.bounds', () => {
    const rectNode = elements.find(el => el.type === 'rectangle' && el.id.includes('node-shape-n1'))!;
    expect(rectNode).toBeDefined();
    expect(rectNode.bounds).toBeDefined();

    // Center point of the rectangle
    const centerPoint = {
      x: rectNode.bounds!.x + rectNode.bounds!.width / 2,
      y: rectNode.bounds!.y + rectNode.bounds!.height / 2,
    };

    expect(isPointInElement(centerPoint, rectNode)).toBe(true);

    // Far away point outside bounds
    const farPoint = { x: 10, y: 10 };
    expect(isPointInElement(farPoint, rectNode)).toBe(false);
  });

  it('correctly hit-tests inside a circle node', () => {
    const circleNode = elements.find(el => el.type === 'circle' && el.id.includes('node-shape-n2'))!;
    expect(circleNode).toBeDefined();

    // Center of circle
    const center = circleNode.points[0];
    expect(isPointInElement(center, circleNode)).toBe(true);

    // Point just inside the radius
    const edge = circleNode.points[1];
    const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
    const pointInside = { x: center.x + radius * 0.5, y: center.y };
    expect(isPointInElement(pointInside, circleNode)).toBe(true);
  });

  it('correctly hit-tests centered text labels', () => {
    const textNode = elements.find(el => el.type === 'text' && el.text === 'Node A')!;
    expect(textNode).toBeDefined();
    expect(textNode.textAlign).toBe('center');

    // Click right at the anchor point
    expect(isPointInElement(textNode.points[0], textNode)).toBe(true);

    // Click slightly to the left of center (which failed prior to the center alignment fix)
    const leftOfCenter = {
      x: textNode.points[0].x - 15,
      y: textNode.points[0].y - 5,
    };
    expect(isPointInElement(leftOfCenter, textNode)).toBe(true);
  });

  it('computes tight group bounding box over all elements in the diagram', () => {
    const groupBounds = getElementsBoundingBox(elements);
    expect(groupBounds).not.toBeNull();
    expect(groupBounds!.width).toBeGreaterThan(0);
    expect(groupBounds!.height).toBeGreaterThan(0);

    // All elements must fit within the group bounding box
    elements.forEach(el => {
      if (el.bounds) {
        expect(el.bounds.x).toBeGreaterThanOrEqual(groupBounds!.x);
        expect(el.bounds.y).toBeGreaterThanOrEqual(groupBounds!.y);
        expect(el.bounds.x + el.bounds.width).toBeLessThanOrEqual(groupBounds!.x + groupBounds!.width + 0.1);
        expect(el.bounds.y + el.bounds.height).toBeLessThanOrEqual(groupBounds!.y + groupBounds!.height + 0.1);
      }
      el.points.forEach(p => {
        expect(p.x).toBeGreaterThanOrEqual(groupBounds!.x);
        expect(p.y).toBeGreaterThanOrEqual(groupBounds!.y);
        expect(p.x).toBeLessThanOrEqual(groupBounds!.x + groupBounds!.width + 0.1);
        expect(p.y).toBeLessThanOrEqual(groupBounds!.y + groupBounds!.height + 0.1);
      });
    });
  });

  it('translates all diagram elements together with their points and bounds', () => {
    const delta = { x: 150, y: -75 };

    const movedElements: DrawingElement[] = elements.map(el => ({
      ...el,
      points: el.points.map(p => ({ x: p.x + delta.x, y: p.y + delta.y })),
      bounds: el.bounds ? {
        ...el.bounds,
        x: el.bounds.x + delta.x,
        y: el.bounds.y + delta.y,
      } : undefined,
    }));

    const originalBox = getElementsBoundingBox(elements)!;
    const movedBox = getElementsBoundingBox(movedElements)!;

    expect(movedBox.x).toBeCloseTo(originalBox.x + delta.x);
    expect(movedBox.y).toBeCloseTo(originalBox.y + delta.y);
    expect(movedBox.width).toBeCloseTo(originalBox.width);
    expect(movedBox.height).toBeCloseTo(originalBox.height);
  });
});

