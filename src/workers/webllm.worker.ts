import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Initialize the MLC Web Worker engine handler
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};

