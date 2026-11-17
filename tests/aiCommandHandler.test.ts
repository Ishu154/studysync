import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AICommandHandler, RateLimiter } from '../src/shared/aiCommandHandler';
import { InMemoryRoomStore } from '../src/shared/roomStore';
import { DiagramProvider, BoardContext } from '../src/shared/aiTypes';
import { GraphOp } from '../src/shared/schema';
import { CloudProvider } from '../src/shared/cloudProvider';
import { computeElementsBoundingBox, boxesOverlap } from '../src/shared/layout';

class MockDiagramProvider implements DiagramProvider {
  public name = 'mock';
  public callCount = 0;
  public lastPrompt = '';
  public lastBoardContext?: BoardContext;

  public async generate(
    prompt: string,
    boardContext?: BoardContext,
    commandId: string = 'cmd-test'
  ): Promise<GraphOp[]> {
    this.callCount++;
    this.lastPrompt = prompt;
    this.lastBoardContext = boardContext;

    return [
      {
        type: 'add_node',
        id: 'step1',
        label: 'Step 1: Start',
        style: { shape: 'rectangle', color: '#3B82F6' },
        commandId,
        author: 'studybot',
      },
      {
        type: 'add_node',
        id: 'step2',
        label: 'Step 2: Finish',
        style: { shape: 'circle', color: '#10B981' },
        commandId,
        author: 'studybot',
      },
      {
        type: 'add_edge',
        id: 'e1',
        from: 'step1',
        to: 'step2',
        label: 'Proceed',
        commandId,
        author: 'studybot',
      },
    ];
  }
}

describe('AICommandHandler', () => {
  let roomStore: InMemoryRoomStore;
  let mockProvider: MockDiagramProvider;
  let handler: AICommandHandler;
  let emittedEvents: Array<{ event: string; room?: string; data: unknown }>;
  let mockIO: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    roomStore = new InMemoryRoomStore();
    mockProvider = new MockDiagramProvider();
    emittedEvents = [];

    mockIO = {
      to: (room: string) => ({
        emit: (event: string, data: unknown) => {
          emittedEvents.push({ event, room, data });
        },
      }),
      emit: (event: string, data: unknown) => {
        emittedEvents.push({ event, data });
      },
    };

    handler = new AICommandHandler(roomStore, mockProvider, mockIO);
    handler.stepDelayMs = 0; // 0ms delay for ultra-fast unit testing
  });

  it('successfully handles a command and streams live drawing events', async () => {
    const socket = { id: 'socket-123', emit: vi.fn() };
    const res = await handler.handleCommand(
      socket,
      'room-test',
      'Draw login process',
      'Alice'
    );

    expect(res.success).toBe(true);
    expect(res.commandId).toBeDefined();

    // Allow async execution to settle
    await new Promise((r) => setTimeout(r, 20));

    expect(mockProvider.callCount).toBe(1);
    expect(mockProvider.lastPrompt).toBe('Draw login process');

    // Verify Chat message "Alice asked StudyBot: ..." was broadcast
    const chatEvents = emittedEvents.filter((e) => e.event === 'chat:message');
    expect(chatEvents.length).toBeGreaterThanOrEqual(2);
    expect(
      (chatEvents[0].data as { text: string }).text
    ).toContain('Alice asked StudyBot: "Draw login process"');

    // Verify AI status transitions: thinking -> drawing -> idle
    const statusEvents = emittedEvents.filter((e) => e.event === 'ai:status');
    const statuses = statusEvents.map((s) => (s.data as { status: string }).status);
    expect(statuses).toContain('thinking');
    expect(statuses).toContain('drawing');
    expect(statuses).toContain('idle');

    // Verify StudyBot cursor movements were emitted
    const cursorEvents = emittedEvents.filter((e) => e.event === 'user-cursor');
    expect(cursorEvents.length).toBeGreaterThanOrEqual(3);
    expect((cursorEvents[0].data as { userId: string }).userId).toBe('studybot');

    // Verify elements were stored in RoomStore
    const elements = await roomStore.getElements('room-test');
    expect(elements.length).toBeGreaterThanOrEqual(3);
    for (const el of elements) {
      expect(el.commandId).toBe(res.commandId);
      expect(el.userId).toBe('studybot');
    }
  });

  it('enforces rate limits per socket and per room', async () => {
    const limiter = new RateLimiter({ maxPerSocketPerMin: 2, maxPerRoomPerMin: 10 });
    const limitedHandler = new AICommandHandler(roomStore, mockProvider, mockIO, limiter);
    limitedHandler.stepDelayMs = 0;

    const socket = { id: 'socket-spam', emit: vi.fn() };

    // Request 1: OK
    const r1 = await limitedHandler.handleCommand(socket, 'room-spam', 'P1', 'User');
    expect(r1.success).toBe(true);

    // Request 2: OK
    const r2 = await limitedHandler.handleCommand(socket, 'room-spam', 'P2', 'User');
    expect(r2.success).toBe(true);

    // Request 3: Exceeded socket limit
    const r3 = await limitedHandler.handleCommand(socket, 'room-spam', 'P3', 'User');
    expect(r3.success).toBe(false);
    expect(r3.error).toContain('Rate limit exceeded');
  });

  it('queues multiple concurrent commands for the same room', async () => {
    // Artificial delay to observe queueing
    handler.stepDelayMs = 50;

    const socket = { id: 'socket-user', emit: vi.fn() };

    // First command starts
    const r1 = await handler.handleCommand(socket, 'room-queue', 'Cmd 1', 'Alice');
    expect(r1.success).toBe(true);

    // Second command arrives while first is active
    const r2 = await handler.handleCommand(socket, 'room-queue', 'Cmd 2', 'Bob');
    expect(r2.success).toBe(true);

    // Check that a queue status was emitted
    const queueNotice = emittedEvents.find(
      (e) =>
        e.event === 'ai:status' &&
        (e.data as { message?: string }).message?.includes('queued')
    );
    expect(queueNotice).toBeDefined();

    // Wait for both to finish
    await new Promise((r) => setTimeout(r, 400));
    expect(mockProvider.callCount).toBe(2);
  });

  it('undoes the last AI command completely', async () => {
    const socket = { id: 'socket-undo', emit: vi.fn() };
    const res = await handler.handleCommand(socket, 'room-undo', 'Draw flow', 'Charlie');
    await new Promise((r) => setTimeout(r, 20));

    const elementsBefore = await roomStore.getElements('room-undo');
    expect(elementsBefore.length).toBeGreaterThan(0);

    // Call Undo AI
    const undoRes = await handler.handleUndoAI('room-undo', res.commandId);
    expect(undoRes.success).toBe(true);
    expect(undoRes.deletedCount).toBe(elementsBefore.length);

    // Verify elements are removed from room store
    const elementsAfter = await roomStore.getElements('room-undo');
    expect(elementsAfter.length).toBe(0);

    // Verify element-deleted events were emitted
    const deletedEvents = emittedEvents.filter((e) => e.event === 'element-deleted');
    expect(deletedEvents.length).toBe(undoRes.deletedCount);
  });

  it('handles client-generated ops from LocalProvider, auto-layouts and streams to all participants', async () => {
    const socket = { id: 'socket-local-user', emit: vi.fn() };
    const clientOps = [
      {
        type: 'add_node',
        id: 'n_local_1',
        label: 'Client Sensor',
        style: { shape: 'rectangle', color: '#10B981' },
        commandId: 'cmd-loc-42',
        author: 'studybot',
      },
      {
        type: 'add_node',
        id: 'n_local_2',
        label: 'Central Server',
        style: { shape: 'circle', color: '#3B82F6' },
        commandId: 'cmd-loc-42',
        author: 'studybot',
      },
      {
        type: 'add_edge',
        id: 'e_loc',
        from: 'n_local_1',
        to: 'n_local_2',
        label: 'Telemetry',
        commandId: 'cmd-loc-42',
        author: 'studybot',
      },
    ];

    const res = await handler.handleClientGeneratedOps(
      socket,
      'room-local',
      clientOps,
      'Dave',
      'Draw telemetry pipeline',
      'cmd-loc-42'
    );

    expect(res.success).toBe(true);
    expect(res.commandId).toBe('cmd-loc-42');

    await new Promise((r) => setTimeout(r, 20));

    // Chat message should indicate Local WebLLM
    const chatEvents = emittedEvents.filter((e) => e.event === 'chat:message');
    expect(
      (chatEvents[0].data as { text: string }).text
    ).toContain('Dave asked StudyBot (Local WebLLM): "Draw telemetry pipeline"');

    // Drawing elements should be auto-laid out and saved
    const elements = await roomStore.getElements('room-local');
    expect(elements.length).toBeGreaterThanOrEqual(3);

    // StudyBot cursor should have moved
    const cursorEvents = emittedEvents.filter((e) => e.event === 'user-cursor');
    expect(cursorEvents.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects malformed client-generated ops', async () => {
    const socket = { id: 'socket-bad', emit: vi.fn() };
    const badOps = [{ type: 'add_node', id: 'missing_label_and_command' }];

    const res = await handler.handleClientGeneratedOps(
      socket,
      'room-bad',
      badOps,
      'Attacker',
      'Bad payload'
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid client operations');
  });

  it('automatically positions a second diagram so it does not overlap the first diagram', async () => {
    const socket = { id: 'socket-user', emit: vi.fn() };

    // 1. First command
    const r1 = await handler.handleCommand(socket, 'room-multi', 'First diagram', 'Alice');
    expect(r1.success).toBe(true);
    await new Promise((r) => setTimeout(r, 20));

    const elements1 = await roomStore.getElements('room-multi');
    expect(elements1.length).toBeGreaterThan(0);

    // 2. Second command in the same room
    const r2 = await handler.handleCommand(socket, 'room-multi', 'Second diagram', 'Alice');
    expect(r2.success).toBe(true);
    await new Promise((r) => setTimeout(r, 20));

    const allElements = await roomStore.getElements('room-multi');
    const diag1Els = allElements.filter((e) => e.commandId === r1.commandId);
    const diag2Els = allElements.filter((e) => e.commandId === r2.commandId);

    expect(diag1Els.length).toBeGreaterThan(0);
    expect(diag2Els.length).toBeGreaterThan(0);

    // Calculate bounding boxes of diagram 1 and diagram 2
    const box1 = computeElementsBoundingBox(diag1Els)!;
    const box2 = computeElementsBoundingBox(diag2Els)!;

    expect(box1).toBeDefined();
    expect(box2).toBeDefined();

    // Verify that Diagram 2 does NOT overlap with Diagram 1!
    expect(boxesOverlap(box1, box2, 10)).toBe(false);
    // Diagram 2 should be positioned to the right of diagram 1
    expect(box2.minX).toBeGreaterThanOrEqual(box1.maxX);
  });
});

describe('CloudProvider (Tool Calling & Retry Logic)', () => {
  it('retries once with error feedback if first LLM response fails validation', async () => {
    let callIndex = 0;

    const mockFetch = vi.fn().mockImplementation(async () => {
      callIndex++;
      if (callIndex === 1) {
        // First response has invalid arguments (missing 'label' on node)
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  tool_calls: [
                    {
                      function: {
                        name: 'add_node',
                        arguments: JSON.stringify({ id: 'broken_node' }), // missing required label!
                      },
                    },
                  ],
                },
              },
            ],
          }),
        };
      }

      // Second response (after retry with feedback) returns valid schema
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      name: 'add_node',
                      arguments: JSON.stringify({ id: 'fixed_node', label: 'Correct Node' }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      };
    });

    const provider = new CloudProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const ops = await provider.generate('Fix this diagram', undefined, 'cmd-retry');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('add_node');
    expect((ops[0] as { label: string }).label).toBe('Correct Node');
  });

  it('falls back to deterministic layout if API key is missing', async () => {
    const provider = new CloudProvider({ apiKey: '' });
    const ops = await provider.generate('Draw an authentication architecture');
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.some((o) => o.type === 'add_node')).toBe(true);
  });
});

