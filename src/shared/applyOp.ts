import { Dispatch } from '@reduxjs/toolkit';
import { DrawingElement } from '../types';
import { GraphOp, validateGraphOps } from './schema';
import { graphOpsToDrawingElements, LayoutOptions } from './layout';
import {
  addElement,
  updateElement,
  deleteElement,
  addElementsBatch,
  deleteElementsByCommandId,
} from '../store/whiteboardSlice';

export type CanvasOp =
  | { type: 'add_element'; element: DrawingElement }
  | { type: 'update_element'; element: DrawingElement }
  | { type: 'delete_element'; elementId: string }
  | { type: 'delete_command'; commandId: string }
  | { type: 'batch_elements'; elements: DrawingElement[] }
  | { type: 'graph_ops'; ops: GraphOp[]; options?: LayoutOptions };

export interface ApplyOpCallbacks {
  emitElementCreated?: (element: DrawingElement) => void;
  emitElementUpdated?: (element: DrawingElement) => void;
  emitElementDeleted?: (elementId: string) => void;
  emitElementsBatch?: (elements: DrawingElement[]) => void;
}

export interface ApplyOpResult {
  success: boolean;
  type: string;
  affectedIds: string[];
  elements?: DrawingElement[];
  error?: string;
}

/**
 * Universal board change dispatcher:
 * Routes operations from any source (user interactions, AI generation, or socket events)
 * to the Redux whiteboard store and optional network sync.
 */
export function applyOp(
  op: CanvasOp,
  dispatch: Dispatch,
  callbacks?: ApplyOpCallbacks
): ApplyOpResult {
  switch (op.type) {
    case 'add_element': {
      dispatch(addElement(op.element));
      if (callbacks?.emitElementCreated) {
        callbacks.emitElementCreated(op.element);
      }
      return {
        success: true,
        type: op.type,
        affectedIds: [op.element.id],
        elements: [op.element],
      };
    }

    case 'update_element': {
      dispatch(updateElement(op.element));
      if (callbacks?.emitElementUpdated) {
        callbacks.emitElementUpdated(op.element);
      }
      return {
        success: true,
        type: op.type,
        affectedIds: [op.element.id],
        elements: [op.element],
      };
    }

    case 'delete_element': {
      dispatch(deleteElement(op.elementId));
      if (callbacks?.emitElementDeleted) {
        callbacks.emitElementDeleted(op.elementId);
      }
      return {
        success: true,
        type: op.type,
        affectedIds: [op.elementId],
      };
    }

    case 'delete_command': {
      dispatch(deleteElementsByCommandId(op.commandId));
      return {
        success: true,
        type: op.type,
        affectedIds: [op.commandId],
      };
    }

    case 'batch_elements': {
      dispatch(addElementsBatch(op.elements));
      if (callbacks?.emitElementsBatch) {
        callbacks.emitElementsBatch(op.elements);
      } else if (callbacks?.emitElementCreated) {
        for (const el of op.elements) {
          callbacks.emitElementCreated(el);
        }
      }
      return {
        success: true,
        type: op.type,
        affectedIds: op.elements.map(e => e.id),
        elements: op.elements,
      };
    }

    case 'graph_ops': {
      try {
        const validatedOps = validateGraphOps(op.ops);
        const compiledElements = graphOpsToDrawingElements(validatedOps, op.options);

        dispatch(addElementsBatch(compiledElements));

        if (callbacks?.emitElementsBatch) {
          callbacks.emitElementsBatch(compiledElements);
        } else if (callbacks?.emitElementCreated) {
          for (const el of compiledElements) {
            callbacks.emitElementCreated(el);
          }
        }

        return {
          success: true,
          type: op.type,
          affectedIds: compiledElements.map(e => e.id),
          elements: compiledElements,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          type: op.type,
          affectedIds: [],
          error: msg,
        };
      }
    }

    default: {
      const exhaustiveCheck: never = op;
      return {
        success: false,
        type: (exhaustiveCheck as { type: string }).type || 'unknown',
        affectedIds: [],
        error: 'Unsupported op type',
      };
    }
  }
}

