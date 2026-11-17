import { v4 as uuidv4 } from 'uuid';
import { GraphOp, validateGraphOps, safeValidateGraphOps } from './schema';
import { DiagramProvider, BoardContext } from './aiTypes';

export interface LocalProviderOptions {
  modelId?: string;
  onProgress?: (report: { progress: number; text: string }) => void;
}

export const DEFAULT_LOCAL_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

export async function isWebGPUSupported(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown | null> } };
  if (!nav.gpu) return false;
  try {
    const adapter = await nav.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

const LOCAL_SYSTEM_PROMPT = `You are StudyBot, a diagram expert.
Generate a structured diagram using high-level operations.
You MUST output ONLY a valid JSON object matching this schema:
{
  "operations": [
    {
      "type": "add_node",
      "id": "node_id",
      "label": "Node Label",
      "style": { "shape": "rectangle", "color": "#3B82F6" }
    },
    {
      "type": "add_edge",
      "id": "edge_id",
      "from": "source_node_id",
      "to": "target_node_id",
      "label": "optional label",
      "style": { "arrowDirection": "forward" }
    }
  ]
}
RULES:
1. NEVER output pixel coordinates (x, y).
2. 'from' and 'to' in add_edge MUST match existing node IDs.
3. Shapes can be 'rectangle', 'circle', 'diamond', or 'hexagon'.
4. Output valid JSON only, no commentary.`;

export class LocalProvider implements DiagramProvider {
  public readonly name = 'local';
  private modelId: string;
  private engine: unknown = null;
  private isInitializing = false;
  private isReady = false;

  constructor(options?: LocalProviderOptions) {
    this.modelId = options?.modelId || DEFAULT_LOCAL_MODEL;
  }

  public getModelId(): string {
    return this.modelId;
  }

  public isLoaded(): boolean {
    return this.isReady && this.engine !== null;
  }

  public async init(onProgress?: (report: { progress: number; text: string }) => void): Promise<void> {
    if (this.isReady && this.engine) return;
    if (this.isInitializing) {
      // Wait for ongoing initialization
      while (this.isInitializing) {
        await new Promise(r => setTimeout(r, 100));
      }
      return;
    }

    const hasWebGPU = await isWebGPUSupported();
    if (!hasWebGPU) {
      throw new Error('WebGPU is not supported in this browser. Please use Chrome/Edge or switch to Cloud mode.');
    }

    this.isInitializing = true;
    try {
      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      const worker = new Worker(new URL('../workers/webllm.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.engine = await CreateWebWorkerMLCEngine(worker, this.modelId, {
        initProgressCallback: (report) => {
          onProgress?.({ progress: report.progress, text: report.text });
        },
      });

      this.isReady = true;
    } finally {
      this.isInitializing = false;
    }
  }

  public async generate(
    prompt: string,
    boardContext?: BoardContext,
    commandId: string = uuidv4(),
    onProgress?: (report: { progress: number; text: string }) => void
  ): Promise<GraphOp[]> {
    if (!this.isReady || !this.engine) {
      await this.init(onProgress);
    }

    const contextSummary = boardContext && boardContext.elementsCount > 0
      ? `Existing board has ${boardContext.elementsCount} elements.`
      : 'Board is empty.';

    const messages = [
      { role: 'system', content: LOCAL_SYSTEM_PROMPT },
      { role: 'user', content: `Context: ${contextSummary}\n\nTask: ${prompt}` },
    ];

    // Call local engine
    const rawOps = await this.callLocalEngine(messages, commandId);
    const validation = safeValidateGraphOps(rawOps);

    if (validation.success) {
      return validation.data;
    }

    // Single retry with error feedback if schema failed
    const errorMsg = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    console.warn(`[LocalProvider] Local output validation failed: ${errorMsg}. Retrying...`);

    messages.push({
      role: 'assistant',
      content: JSON.stringify({ operations: rawOps }),
    });
    messages.push({
      role: 'user',
      content: `Your previous JSON output had validation errors: ${errorMsg}. Please fix all errors and output strictly valid JSON operations.`,
    });

    const retriedOps = await this.callLocalEngine(messages, commandId);
    return validateGraphOps(retriedOps);
  }

  private async callLocalEngine(
    messages: unknown[],
    commandId: string
  ): Promise<GraphOp[]> {
    const engineAny = this.engine as {
      chat: {
        completions: {
          create: (opts: unknown) => Promise<{
            choices?: Array<{ message?: { content?: string } }>;
          }>;
        };
      };
    };

    const reply = await engineAny.chat.completions.create({
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1500,
    });

    const content = reply?.choices?.[0]?.message?.content || '';
    if (!content.trim()) {
      throw new Error('Local model returned empty response.');
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // Attempt extracting JSON substring if wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse JSON response from local model.');
      }
    }

    // Extract operations array
    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.operations)
      ? parsed.operations
      : Array.isArray(parsed.ops)
      ? parsed.ops
      : [];

    if (rawList.length === 0) {
      throw new Error('Local model response did not contain an operations list.');
    }

    const ops: GraphOp[] = [];
    for (const item of rawList) {
      if (typeof item !== 'object' || !item) continue;
      const opCandidate = {
        ...item,
        commandId,
        author: 'studybot',
      };
      ops.push(opCandidate as unknown as GraphOp);
    }

    return ops;
  }
}
