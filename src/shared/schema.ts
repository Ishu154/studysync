import { z } from 'zod';

// Style schemas
export const NodeShapeSchema = z.enum(['rectangle', 'circle', 'diamond', 'hexagon']).default('rectangle');
export type NodeShape = z.infer<typeof NodeShapeSchema>;

export const NodeStyleSchema = z.object({
  shape: NodeShapeSchema.optional(),
  color: z.string().max(50).optional(),
  backgroundColor: z.string().max(50).optional(),
  strokeWidth: z.number().min(1).max(20).optional(),
  fontSize: z.number().min(8).max(72).optional(),
  width: z.number().min(40).max(1000).optional(),
  height: z.number().min(30).max(800).optional(),
}).strict().optional();
export type NodeStyle = z.infer<typeof NodeStyleSchema>;

export const LineStyleSchema = z.enum(['solid', 'dashed']).default('solid');
export const ArrowDirectionSchema = z.enum(['forward', 'both', 'none']).default('forward');

export const EdgeStyleSchema = z.object({
  color: z.string().max(50).optional(),
  strokeWidth: z.number().min(1).max(20).optional(),
  lineStyle: LineStyleSchema.optional(),
  arrowDirection: ArrowDirectionSchema.optional(),
}).strict().optional();
export type EdgeStyle = z.infer<typeof EdgeStyleSchema>;

export const TextStyleSchema = z.object({
  fontSize: z.number().min(8).max(72).optional(),
  color: z.string().max(50).optional(),
  fontWeight: z.enum(['normal', 'bold', '500', '600', '700']).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
}).strict().optional();
export type TextStyle = z.infer<typeof TextStyleSchema>;

export const HighlightStyleSchema = z.object({
  color: z.string().max(50).optional(),
  opacity: z.number().min(0.05).max(1).optional(),
  padding: z.number().min(0).max(60).optional(),
}).strict().optional();
export type HighlightStyle = z.infer<typeof HighlightStyleSchema>;

// Operation Schemas
export const AddNodeOpSchema = z.object({
  type: z.literal('add_node'),
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(500),
  style: NodeStyleSchema,
  commandId: z.string().min(1).max(100),
  author: z.string().min(1).max(100),
}).strict();
export type AddNodeOp = z.infer<typeof AddNodeOpSchema>;

export const AddEdgeOpSchema = z.object({
  type: z.literal('add_edge'),
  id: z.string().min(1).max(100),
  from: z.string().min(1).max(100),
  to: z.string().min(1).max(100),
  label: z.string().max(200).optional(),
  style: EdgeStyleSchema,
  commandId: z.string().min(1).max(100),
  author: z.string().min(1).max(100),
}).strict();
export type AddEdgeOp = z.infer<typeof AddEdgeOpSchema>;

export const AddTextOpSchema = z.object({
  type: z.literal('add_text'),
  id: z.string().min(1).max(100),
  text: z.string().min(1).max(1000),
  nearNodeId: z.string().max(100).optional(),
  style: TextStyleSchema,
  commandId: z.string().min(1).max(100),
  author: z.string().min(1).max(100),
}).strict();
export type AddTextOp = z.infer<typeof AddTextOpSchema>;

export const HighlightOpSchema = z.object({
  type: z.literal('highlight'),
  id: z.string().min(1).max(100),
  targetId: z.string().min(1).max(100),
  style: HighlightStyleSchema,
  commandId: z.string().min(1).max(100),
  author: z.string().min(1).max(100),
}).strict();
export type HighlightOp = z.infer<typeof HighlightOpSchema>;

export const ClearSelectionOpSchema = z.object({
  type: z.literal('clear_selection'),
  commandId: z.string().min(1).max(100),
  author: z.string().min(1).max(100),
}).strict();
export type ClearSelectionOp = z.infer<typeof ClearSelectionOpSchema>;

// Discriminated union of all graph operations
export const GraphOpSchema = z.discriminatedUnion('type', [
  AddNodeOpSchema,
  AddEdgeOpSchema,
  AddTextOpSchema,
  HighlightOpSchema,
  ClearSelectionOpSchema,
]);
export type GraphOp = z.infer<typeof GraphOpSchema>;

// Batch schema with size limits for prompt-injection hygiene and DoS prevention
export const MAX_OPS_PER_COMMAND = 80;
export const GraphOpsBatchSchema = z.array(GraphOpSchema).min(1).max(MAX_OPS_PER_COMMAND);

// Input sanitization helpers
export const MAX_PROMPT_LENGTH = 1000;

export function sanitizeUserPrompt(raw: string): string {
  if (typeof raw !== 'string') return '';
  // Trim and limit length
  const trimmed = raw.trim().slice(0, MAX_PROMPT_LENGTH);
  // Strip control characters except basic newlines and tabs
  // eslint-disable-next-line no-control-regex
  return trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function validateGraphOp(data: unknown): GraphOp {
  return GraphOpSchema.parse(data);
}

export function validateGraphOps(data: unknown): GraphOp[] {
  return GraphOpsBatchSchema.parse(data);
}

export function safeValidateGraphOps(data: unknown) {
  return GraphOpsBatchSchema.safeParse(data);
}
