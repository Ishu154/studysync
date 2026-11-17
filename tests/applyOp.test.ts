import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import whiteboardReducer, { WhiteboardState } from '../src/store/whiteboardSlice';
import { applyOp } from '../src/shared/applyOp';
import { DrawingElement } from '../src/types';
import { GraphOp } from '../src/shared/schema';

describe('applyOp (Universal Canvas Dispatcher)', () => {
  let store: ReturnType<typeof configureStore<{ whiteboard: WhiteboardState }>>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        whiteboard: whiteboardReducer,
      },
    });
  });

  it('applies add_element op and updates Redux state', () => {
    const element: DrawingElement = {
      id: 'el-test-1',
      type: 'circle',
      points: [{ x: 50, y: 50 }],
      color: '#000000',
      strokeWidth: 2,
      opacity: 1,
      created: Date.now(),
      updated: Date.now(),
      userId: 'user-1',
    };

    let emittedCreated: DrawingElement | null = null;
    const res = applyOp({ type: 'add_element', element }, store.dispatch, {
      emitElementCreated: (el) => {
        emittedCreated = el;
      },
    });

    expect(res.success).toBe(true);
    expect(res.affectedIds).toEqual(['el-test-1']);
    expect(store.getState().whiteboard.elements).toHaveLength(1);
    expect(emittedCreated?.id).toBe('el-test-1');
  });

  it('applies update_element op', () => {
    const element: DrawingElement = {
      id: 'el-test-1',
      type: 'rectangle',
      points: [{ x: 10, y: 10 }],
      color: '#000000',
      strokeWidth: 2,
      opacity: 1,
      created: 10,
      updated: 10,
      userId: 'user-1',
    };
    applyOp({ type: 'add_element', element }, store.dispatch);

    const updated = { ...element, color: '#3B82F6', updated: 20 };
    const res = applyOp({ type: 'update_element', element: updated }, store.dispatch);

    expect(res.success).toBe(true);
    expect(store.getState().whiteboard.elements[0].color).toBe('#3B82F6');
  });

  it('applies delete_element op', () => {
    const element: DrawingElement = {
      id: 'el-test-del',
      type: 'line',
      points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      color: '#000',
      strokeWidth: 1,
      opacity: 1,
      created: 10,
      updated: 10,
      userId: 'user-1',
    };
    applyOp({ type: 'add_element', element }, store.dispatch);
    expect(store.getState().whiteboard.elements).toHaveLength(1);

    const res = applyOp({ type: 'delete_element', elementId: 'el-test-del' }, store.dispatch);
    expect(res.success).toBe(true);
    expect(store.getState().whiteboard.elements).toHaveLength(0);
  });

  it('applies delete_command op (Undo AI) removing all ops with that commandId', () => {
    const el1: DrawingElement = {
      id: 'e1',
      type: 'rectangle',
      points: [{ x: 0, y: 0 }],
      color: '#000',
      strokeWidth: 1,
      opacity: 1,
      created: 10,
      updated: 10,
      userId: 'studybot',
      commandId: 'cmd-ai-99',
    };
    const el2: DrawingElement = {
      id: 'e2',
      type: 'text',
      points: [{ x: 0, y: 0 }],
      color: '#000',
      strokeWidth: 1,
      opacity: 1,
      created: 10,
      updated: 10,
      userId: 'studybot',
      commandId: 'cmd-ai-99',
    };
    const userEl: DrawingElement = {
      id: 'e3',
      type: 'pen',
      points: [{ x: 0, y: 0 }],
      color: '#000',
      strokeWidth: 1,
      opacity: 1,
      created: 10,
      updated: 10,
      userId: 'user',
      commandId: 'cmd-user',
    };

    applyOp({ type: 'batch_elements', elements: [el1, el2, userEl] }, store.dispatch);
    expect(store.getState().whiteboard.elements).toHaveLength(3);

    const res = applyOp({ type: 'delete_command', commandId: 'cmd-ai-99' }, store.dispatch);
    expect(res.success).toBe(true);

    const remaining = store.getState().whiteboard.elements;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('e3');
  });

  it('applies graph_ops: runs auto-layout, validates, and adds compiled elements to board', () => {
    const graphOps: GraphOp[] = [
      {
        type: 'add_node',
        id: 'node-auth',
        label: 'Auth Service',
        commandId: 'ai-cmd-1',
        author: 'studybot',
      },
      {
        type: 'add_node',
        id: 'node-db',
        label: 'PostgreSQL DB',
        commandId: 'ai-cmd-1',
        author: 'studybot',
      },
      {
        type: 'add_edge',
        id: 'edge-1',
        from: 'node-auth',
        to: 'node-db',
        label: 'Query',
        commandId: 'ai-cmd-1',
        author: 'studybot',
      },
    ];

    const res = applyOp({ type: 'graph_ops', ops: graphOps }, store.dispatch);
    expect(res.success).toBe(true);
    expect(res.elements).toBeDefined();
    expect(res.elements!.length).toBeGreaterThanOrEqual(3);

    const elements = store.getState().whiteboard.elements;
    expect(elements.length).toBe(res.elements!.length);
    for (const el of elements) {
      expect(el.commandId).toBe('ai-cmd-1');
      expect(el.userId).toBe('studybot');
    }
  });
});

