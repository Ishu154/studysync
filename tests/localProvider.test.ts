import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalProvider, isWebGPUSupported } from '../src/shared/localProvider';

describe('LocalProvider (WebLLM / WebGPU)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isWebGPUSupported', () => {
    it('returns false in non-browser Node test environment', async () => {
      const supported = await isWebGPUSupported();
      expect(supported).toBe(false);
    });

    it('returns true when navigator.gpu adapter is available', async () => {
      // Mock navigator.gpu
      const originalNav = globalThis.navigator;
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          gpu: {
            requestAdapter: async () => ({}),
          },
        },
        configurable: true,
      });

      const supported = await isWebGPUSupported();
      expect(supported).toBe(true);

      Object.defineProperty(globalThis, 'navigator', {
        value: originalNav,
        configurable: true,
      });
    });
  });

  describe('LocalProvider Generation with Mocked WebLLM Engine', () => {
    it('uses the specified small quantized model identifier', () => {
      const provider = new LocalProvider({ modelId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC' });
      expect(provider.getModelId()).toBe('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
      expect(provider.name).toBe('local');
    });

    it('parses valid JSON response into validated GraphOp items', async () => {
      const provider = new LocalProvider();

      // Inject a mocked engine that mimics WebWorkerMLCEngine
      const mockEngine = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      operations: [
                        {
                          type: 'add_node',
                          id: 'node_input',
                          label: 'User Input',
                          style: { shape: 'rectangle', color: '#3B82F6' },
                        },
                        {
                          type: 'add_node',
                          id: 'node_output',
                          label: 'Model Prediction',
                          style: { shape: 'circle', color: '#10B981' },
                        },
                        {
                          type: 'add_edge',
                          id: 'edge_flow',
                          from: 'node_input',
                          to: 'node_output',
                          label: 'Inference',
                        },
                      ],
                    }),
                  },
                },
              ],
            }),
          },
        },
      };

      // Set ready and inject mocked engine
      (provider as unknown as { isReady: boolean; engine: unknown }).isReady = true;
      (provider as unknown as { isReady: boolean; engine: unknown }).engine = mockEngine;

      const ops = await provider.generate('Draw inference pipeline', undefined, 'cmd-local-1');

      expect(ops).toHaveLength(3);
      expect(ops[0].type).toBe('add_node');
      expect(ops[0].commandId).toBe('cmd-local-1');
      expect(ops[0].author).toBe('studybot');
      expect(ops[2].type).toBe('add_edge');
    });

    it('retries with error feedback if initial JSON output fails Zod validation', async () => {
      const provider = new LocalProvider();
      let callCount = 0;

      const mockEngine = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              callCount++;
              if (callCount === 1) {
                // Invalid: missing required 'label' on node
                return {
                  choices: [
                    {
                      message: {
                        content: JSON.stringify({
                          operations: [{ type: 'add_node', id: 'broken' }],
                        }),
                      },
                    },
                  ],
                };
              }
              // Fixed on second call
              return {
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        operations: [{ type: 'add_node', id: 'fixed', label: 'Fixed Node' }],
                      }),
                    },
                  },
                ],
              };
            }),
          },
        },
      };

      (provider as unknown as { isReady: boolean; engine: unknown }).isReady = true;
      (provider as unknown as { isReady: boolean; engine: unknown }).engine = mockEngine;

      const ops = await provider.generate('Retry test', undefined, 'cmd-retry');

      expect(callCount).toBe(2);
      expect(ops).toHaveLength(1);
      expect((ops[0] as { label: string }).label).toBe('Fixed Node');
    });
  });
});

