import { describe, it, expect } from 'vitest';
import {
  AddNodeOpSchema,
  AddEdgeOpSchema,
  AddTextOpSchema,
  HighlightOpSchema,
  ClearSelectionOpSchema,
  GraphOpSchema,
  GraphOpsBatchSchema,
  sanitizeUserPrompt,
  validateGraphOps,
  safeValidateGraphOps,
  MAX_OPS_PER_COMMAND,
} from '../src/shared/schema';

describe('Schema Validation', () => {
  describe('AddNodeOpSchema', () => {
    it('validates a minimal valid add_node op', () => {
      const op = {
        type: 'add_node',
        id: 'node-1',
        label: 'User Service',
        commandId: 'cmd-123',
        author: 'studybot',
      };
      const result = AddNodeOpSchema.parse(op);
      expect(result.id).toBe('node-1');
      expect(result.label).toBe('User Service');
      expect(result.commandId).toBe('cmd-123');
      expect(result.author).toBe('studybot');
    });

    it('validates add_node with full style configuration', () => {
      const op = {
        type: 'add_node',
        id: 'node-auth',
        label: 'Authentication Gateway',
        style: {
          shape: 'diamond',
          color: '#10B981',
          backgroundColor: '#ECFDF5',
          strokeWidth: 3,
          fontSize: 18,
          width: 220,
          height: 90,
        },
        commandId: 'cmd-999',
        author: 'studybot',
      };
      const result = AddNodeOpSchema.parse(op);
      expect(result.style?.shape).toBe('diamond');
      expect(result.style?.width).toBe(220);
      expect(result.style?.strokeWidth).toBe(3);
    });

    it('rejects add_node missing required fields', () => {
      expect(() =>
        AddNodeOpSchema.parse({
          type: 'add_node',
          id: 'node-1',
          // missing label, commandId, author
        })
      ).toThrow();
    });

    it('rejects add_node with pixel coordinates (enforcing LLM rule)', () => {
      expect(() =>
        AddNodeOpSchema.parse({
          type: 'add_node',
          id: 'node-1',
          label: 'Test',
          x: 100, // strict schema rejects unknown coordinate properties
          y: 200,
          commandId: 'cmd-1',
          author: 'studybot',
        })
      ).toThrow();
    });
  });

  describe('AddEdgeOpSchema', () => {
    it('validates a valid add_edge op', () => {
      const op = {
        type: 'add_edge',
        id: 'edge-1',
        from: 'node-1',
        to: 'node-2',
        label: 'HTTP Request',
        style: {
          color: '#6B7280',
          strokeWidth: 2,
          lineStyle: 'dashed',
          arrowDirection: 'forward',
        },
        commandId: 'cmd-1',
        author: 'studybot',
      };
      const result = AddEdgeOpSchema.parse(op);
      expect(result.from).toBe('node-1');
      expect(result.to).toBe('node-2');
      expect(result.style?.lineStyle).toBe('dashed');
    });

    it('rejects edge missing from or to', () => {
      expect(() =>
        AddEdgeOpSchema.parse({
          type: 'add_edge',
          id: 'edge-1',
          from: 'node-1',
          commandId: 'cmd-1',
          author: 'studybot',
        })
      ).toThrow();
    });
  });

  describe('AddTextOpSchema & HighlightOpSchema', () => {
    it('validates add_text op', () => {
      const op = {
        type: 'add_text',
        id: 'text-1',
        text: 'Notes: Flow starts with user login',
        nearNodeId: 'node-1',
        style: {
          fontSize: 14,
          color: '#374151',
          fontWeight: 'bold',
          textAlign: 'center',
        },
        commandId: 'cmd-1',
        author: 'studybot',
      };
      const result = AddTextOpSchema.parse(op);
      expect(result.text).toBe('Notes: Flow starts with user login');
      expect(result.style?.textAlign).toBe('center');
    });

    it('validates highlight op', () => {
      const op = {
        type: 'highlight',
        id: 'hl-1',
        targetId: 'node-auth',
        style: {
          color: '#FEF08A',
          opacity: 0.5,
          padding: 15,
        },
        commandId: 'cmd-1',
        author: 'studybot',
      };
      const result = HighlightOpSchema.parse(op);
      expect(result.targetId).toBe('node-auth');
      expect(result.style?.opacity).toBe(0.5);
    });

    it('validates clear_selection op', () => {
      const op = {
        type: 'clear_selection',
        commandId: 'cmd-1',
        author: 'studybot',
      };
      const result = ClearSelectionOpSchema.parse(op);
      expect(result.type).toBe('clear_selection');
    });
  });

  describe('Discriminated Union & Batch Validation', () => {
    it('validates mixed graph ops in a batch', () => {
      const ops = [
        {
          type: 'add_node',
          id: 'n1',
          label: 'Client',
          commandId: 'cmd-1',
          author: 'studybot',
        },
        {
          type: 'add_node',
          id: 'n2',
          label: 'Server',
          commandId: 'cmd-1',
          author: 'studybot',
        },
        {
          type: 'add_edge',
          id: 'e1',
          from: 'n1',
          to: 'n2',
          label: 'REST Call',
          commandId: 'cmd-1',
          author: 'studybot',
        },
        {
          type: 'highlight',
          id: 'h1',
          targetId: 'n2',
          commandId: 'cmd-1',
          author: 'studybot',
        },
      ];

      const validated = validateGraphOps(ops);
      expect(validated).toHaveLength(4);
      expect(validated[0].type).toBe('add_node');
      expect(validated[2].type).toBe('add_edge');

      // Direct schema checks
      expect(GraphOpSchema.parse(ops[0])).toBeDefined();
      expect(GraphOpsBatchSchema.parse(ops)).toHaveLength(4);
    });

    it('rejects batches exceeding maximum allowed operations limit', () => {
      const massiveBatch = Array.from({ length: MAX_OPS_PER_COMMAND + 5 }, (_, i) => ({
        type: 'add_node',
        id: `node-${i}`,
        label: `Node ${i}`,
        commandId: 'cmd-flood',
        author: 'malicious',
      }));

      const res = safeValidateGraphOps(massiveBatch);
      expect(res.success).toBe(false);
    });

    it('rejects empty batch', () => {
      expect(safeValidateGraphOps([]).success).toBe(false);
    });
  });

  describe('Prompt Sanitization', () => {
    it('trims leading/trailing whitespace and limits length', () => {
      const input = '   Draw a microservices architecture   ';
      expect(sanitizeUserPrompt(input)).toBe('Draw a microservices architecture');
    });

    it('strips non-printable ASCII control characters', () => {
      const input = 'Hello\x00\x07World\x1B!';
      expect(sanitizeUserPrompt(input)).toBe('HelloWorld!');
    });

    it('handles non-string inputs gracefully', () => {
      expect(sanitizeUserPrompt(null as unknown as string)).toBe('');
      expect(sanitizeUserPrompt(undefined as unknown as string)).toBe('');
    });
  });
});
