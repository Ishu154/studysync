import { v4 as uuidv4 } from 'uuid';
import { GraphOp, validateGraphOps, safeValidateGraphOps } from './schema';
import { DiagramProvider, BoardContext } from './aiTypes';

export interface CloudProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

const SYSTEM_PROMPT = `You are StudyBot, an expert diagram architect and educator in a collaborative whiteboard.
Your job is to generate clear, structured, beautiful educational diagrams, architecture diagrams, flowcharts, and mind maps based on user requests.

CRITICAL ARCHITECTURE RULES:
1. NEVER output pixel coordinates (x, y). All positioning is handled by the auto-layout engine.
2. ALWAYS call the provided tools to build the diagram:
   - add_node: Create entities, processes, systems, concepts, or steps.
   - add_edge: Connect nodes with directional or bidirectional flows.
   - add_text: Add annotations, titles, or notes.
   - highlight: Emphasize key focus nodes or central concepts.
3. Ensure every node has a clear, descriptive label.
4. Ensure every edge connects existing node IDs ('from' and 'to' must match an 'add_node' id).
5. For decisions use shape 'diamond'. For terminals/start/end use 'circle' or 'rectangle'. For processes use 'rectangle'.`;

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'create_diagram',
      description: 'Create a complete diagram consisting of all nodes, edges, text annotations, and highlights in one call.',
      parameters: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            description: 'List of all diagram operations (add_node, add_edge, add_text, highlight).',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['add_node', 'add_edge', 'add_text', 'highlight', 'clear_selection'] },
                id: { type: 'string', description: 'Unique element ID' },
                label: { type: 'string', description: 'Node label' },
                from: { type: 'string', description: 'Edge source node ID' },
                to: { type: 'string', description: 'Edge target node ID' },
                text: { type: 'string', description: 'Annotation text' },
                targetId: { type: 'string', description: 'Highlight target node ID' },
                style: {
                  type: 'object',
                  properties: {
                    shape: { type: 'string', enum: ['rectangle', 'circle', 'diamond', 'hexagon'] },
                    color: { type: 'string' },
                    backgroundColor: { type: 'string' },
                    strokeWidth: { type: 'number' },
                    lineStyle: { type: 'string', enum: ['solid', 'dashed'] },
                    arrowDirection: { type: 'string', enum: ['forward', 'both', 'none'] },
                    fontSize: { type: 'number' },
                  },
                },
              },
              required: ['type', 'id'],
            },
          },
        },
        required: ['operations'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_node',
      description: 'Add a concept, process, system, or step node to the diagram (NO coordinates).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier for the node (e.g. "auth_service", "step_1")' },
          label: { type: 'string', description: 'Readable label or title shown on the node' },
          style: {
            type: 'object',
            properties: {
              shape: { type: 'string', enum: ['rectangle', 'circle', 'diamond', 'hexagon'] },
              color: { type: 'string', description: 'Hex stroke/fill color (e.g. "#3B82F6", "#10B981")' },
              backgroundColor: { type: 'string' },
              width: { type: 'number' },
              height: { type: 'number' },
            },
          },
        },
        required: ['id', 'label'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_edge',
      description: 'Add a directed or undirected connection between two existing nodes.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique edge ID' },
          from: { type: 'string', description: 'Source node ID' },
          to: { type: 'string', description: 'Target node ID' },
          label: { type: 'string', description: 'Optional text label along the edge' },
          style: {
            type: 'object',
            properties: {
              color: { type: 'string' },
              strokeWidth: { type: 'number' },
              lineStyle: { type: 'string', enum: ['solid', 'dashed'] },
              arrowDirection: { type: 'string', enum: ['forward', 'both', 'none'] },
            },
          },
        },
        required: ['id', 'from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_text',
      description: 'Add an explanatory text annotation or note.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique text ID' },
          text: { type: 'string', description: 'The text content' },
          nearNodeId: { type: 'string', description: 'Optional ID of a node to anchor near' },
          style: {
            type: 'object',
            properties: {
              fontSize: { type: 'number' },
              color: { type: 'string' },
              fontWeight: { type: 'string', enum: ['normal', 'bold', '500', '600', '700'] },
            },
          },
        },
        required: ['id', 'text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight',
      description: 'Visually highlight a critical node or component.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique highlight ID' },
          targetId: { type: 'string', description: 'ID of the target node to highlight' },
          style: {
            type: 'object',
            properties: {
              color: { type: 'string' },
              opacity: { type: 'number' },
            },
          },
        },
        required: ['id', 'targetId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clear_selection',
      description: 'Clear active selections on canvas.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

export class CloudProvider implements DiagramProvider {
  public readonly name = 'cloud';
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private fetchFn: typeof fetch;

  constructor(options?: CloudProviderOptions) {
    this.apiKey = options?.apiKey || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.baseUrl = (options?.baseUrl || process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.model = options?.model || process.env.AI_MODEL || 'gpt-4o-mini';
    this.fetchFn = options?.fetchFn || globalThis.fetch;
  }

  async generate(
    prompt: string,
    boardContext?: BoardContext,
    commandId: string = uuidv4()
  ): Promise<GraphOp[]> {
    if (!this.apiKey) {
      // Fallback generator when API key is not configured in local environment
      return this.generateDeterministicFallback(prompt, commandId);
    }

    const contextSummary = boardContext && boardContext.elementsCount > 0
      ? `Existing board has ${boardContext.elementsCount} elements.` +
        (boardContext.selectedElements?.length ? ` User selected elements: ${JSON.stringify(boardContext.selectedElements)}` : '')
      : 'Board is currently empty.';

    const messages: Array<{ role: string; content?: string; tool_calls?: unknown[]; tool_call_id?: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Context: ${contextSummary}\n\nTask: ${prompt}` },
    ];

    try {
      // 1. Initial LLM Call
      const rawOps = await this.callLLM(messages, commandId);
      const validation = safeValidateGraphOps(rawOps);

      if (validation.success) {
        return validation.data;
      }

      // 2. Retry Once if validation failed, feeding back error
      const errorMsg = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      console.warn(`[CloudProvider] Validation failed: ${errorMsg}. Retrying once with error feedback...`);

      messages.push({
        role: 'user',
        content: `Your previous diagram operations failed schema validation: ${errorMsg}. Please fix all errors and call the tools again strictly adhering to the schema.`,
      });

      const retriedOps = await this.callLLM(messages, commandId);
      return validateGraphOps(retriedOps);
    } catch (err: unknown) {
      console.error('[CloudProvider] API error, falling back to deterministic layout:', err);
      return this.generateDeterministicFallback(prompt, commandId);
    }
  }

  private async callLLM(
    messages: unknown[],
    commandId: string
  ): Promise<GraphOp[]> {
    const url = `${this.baseUrl}/chat/completions`;
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      throw new Error('LLM did not return any diagram tool calls.');
    }

    const ops: GraphOp[] = [];

    for (const tc of toolCalls) {
      const name = tc.function?.name;
      let args: Record<string, unknown> = {};
      try {
        args = typeof tc.function?.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function?.arguments || {};
      } catch {
        continue;
      }

      // Handle batch create_diagram tool call
      if (name === 'create_diagram') {
        const batchList = Array.isArray(args.operations)
          ? args.operations
          : Array.isArray(args.ops)
          ? args.ops
          : [];

        for (const item of batchList) {
          if (typeof item === 'object' && item) {
            ops.push({
              ...item,
              commandId,
              author: 'studybot',
            } as unknown as GraphOp);
          }
        }
        continue;
      }

      // Inject server-managed metadata for individual tool calls
      const opCandidate = {
        ...args,
        type: name,
        commandId,
        author: 'studybot',
      };

      ops.push(opCandidate as unknown as GraphOp);
    }

    return ops;
  }

  /**
   * Generates a structured diagram when API key is not configured,
   * enabling end-to-end local testing and validation of the entire pipeline.
   */
  public generateDeterministicFallback(prompt: string, commandId: string): GraphOp[] {
    const lower = prompt.toLowerCase();
    const ops: GraphOp[] = [];

    if (lower.includes('auth') || lower.includes('login') || lower.includes('user')) {
      ops.push(
        { type: 'add_node', id: 'client', label: 'User Client', style: { shape: 'rectangle', color: '#3B82F6' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'gateway', label: 'API Gateway', style: { shape: 'rectangle', color: '#8B5CF6' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'auth_srv', label: 'Auth Service', style: { shape: 'rectangle', color: '#10B981' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'jwt_verify', label: 'Verify Credentials?', style: { shape: 'diamond', color: '#F59E0B' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'db', label: 'User Database', style: { shape: 'hexagon', color: '#6366F1' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'success', label: 'Issue JWT Token', style: { shape: 'rectangle', color: '#10B981' }, commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e1', from: 'client', to: 'gateway', label: 'POST /login', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e2', from: 'gateway', to: 'auth_srv', label: 'Forward', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e3', from: 'auth_srv', to: 'jwt_verify', label: 'Check Hash', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e4', from: 'jwt_verify', to: 'db', label: 'Query User', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e5', from: 'jwt_verify', to: 'success', label: 'Valid', commandId, author: 'studybot' },
        { type: 'highlight', id: 'hl-auth', targetId: 'auth_srv', commandId, author: 'studybot' },
        { type: 'add_text', id: 'txt-title', text: 'Authentication Flowchart', commandId, author: 'studybot' }
      );
    } else if (lower.includes('microservice') || lower.includes('system') || lower.includes('architecture')) {
      ops.push(
        { type: 'add_node', id: 'lb', label: 'Load Balancer (Nginx)', style: { shape: 'rectangle', color: '#3B82F6' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'app1', label: 'Web Service A', style: { shape: 'rectangle', color: '#10B981' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'app2', label: 'Web Service B', style: { shape: 'rectangle', color: '#10B981' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'queue', label: 'Message Queue (Kafka)', style: { shape: 'hexagon', color: '#EC4899' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'worker', label: 'Background Worker', style: { shape: 'rectangle', color: '#F59E0B' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'db_cluster', label: 'Database Cluster', style: { shape: 'hexagon', color: '#6366F1' }, commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e1', from: 'lb', to: 'app1', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e2', from: 'lb', to: 'app2', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e3', from: 'app1', to: 'queue', label: 'Produce Event', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e4', from: 'queue', to: 'worker', label: 'Consume', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e5', from: 'worker', to: 'db_cluster', label: 'Persist', commandId, author: 'studybot' },
        { type: 'highlight', id: 'hl-queue', targetId: 'queue', commandId, author: 'studybot' },
        { type: 'add_text', id: 'txt-arch', text: 'System Architecture Overview', commandId, author: 'studybot' }
      );
    } else {
      // General concept mind map
      const sanitized = prompt.trim() || 'Study Topic';
      ops.push(
        { type: 'add_node', id: 'center', label: sanitized, style: { shape: 'circle', color: '#8B5CF6' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'concept1', label: 'Core Principles', style: { shape: 'rectangle', color: '#3B82F6' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'concept2', label: 'Key Mechanisms', style: { shape: 'rectangle', color: '#10B981' }, commandId, author: 'studybot' },
        { type: 'add_node', id: 'concept3', label: 'Practical Applications', style: { shape: 'rectangle', color: '#F59E0B' }, commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e1', from: 'center', to: 'concept1', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e2', from: 'center', to: 'concept2', commandId, author: 'studybot' },
        { type: 'add_edge', id: 'e3', from: 'center', to: 'concept3', commandId, author: 'studybot' },
        { type: 'highlight', id: 'hl-center', targetId: 'center', commandId, author: 'studybot' },
        { type: 'add_text', id: 'txt-notes', text: `Study Guide: ${sanitized}`, commandId, author: 'studybot' }
      );
    }

    return ops;
  }
}

