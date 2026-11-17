import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRoomStore, IRoomStore } from '../src/shared/roomStore';
import { DrawingElement, User } from '../src/types';

describe('RoomStore (Decoupled Server Board State)', () => {
  let store: IRoomStore;

  beforeEach(() => {
    store = new InMemoryRoomStore();
  });

  it('creates and retrieves rooms', async () => {
    const room = await store.getOrCreateRoom('room-alpha');
    expect(room.roomId).toBe('room-alpha');
    expect(room.elements).toHaveLength(0);

    const fetched = await store.getRoom('room-alpha');
    expect(fetched).not.toBeNull();
    expect(fetched?.roomId).toBe('room-alpha');
  });

  it('adds and retrieves elements in a room', async () => {
    const element: DrawingElement = {
      id: 'el-1',
      type: 'rectangle',
      points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
      color: '#000000',
      strokeWidth: 2,
      opacity: 1,
      created: Date.now(),
      updated: Date.now(),
      userId: 'user-1',
      commandId: 'cmd-user',
    };

    await store.addElement('room-1', element);

    const elements = await store.getElements('room-1');
    expect(elements).toHaveLength(1);
    expect(elements[0].id).toBe('el-1');
  });

  it('updates an existing element', async () => {
    const element: DrawingElement = {
      id: 'el-1',
      type: 'rectangle',
      points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
      color: '#000000',
      strokeWidth: 2,
      opacity: 1,
      created: 1000,
      updated: 1000,
      userId: 'user-1',
    };
    await store.addElement('room-1', element);

    const updatedElement = { ...element, color: '#FF0000', updated: 2000 };
    const success = await store.updateElement('room-1', updatedElement);
    expect(success).toBe(true);

    const elements = await store.getElements('room-1');
    expect(elements[0].color).toBe('#FF0000');
  });

  it('deletes an element by ID', async () => {
    const element: DrawingElement = {
      id: 'el-1',
      type: 'circle',
      points: [{ x: 0, y: 0 }],
      color: '#000000',
      strokeWidth: 1,
      opacity: 1,
      created: Date.now(),
      updated: Date.now(),
      userId: 'user-1',
    };
    await store.addElement('room-1', element);
    expect(await store.getElements('room-1')).toHaveLength(1);

    const deleted = await store.deleteElement('room-1', 'el-1');
    expect(deleted).toBe(true);
    expect(await store.getElements('room-1')).toHaveLength(0);
  });

  it('deletes elements by commandId for Undo AI', async () => {
    const elUser: DrawingElement = {
      id: 'user-stroke',
      type: 'pen',
      points: [{ x: 1, y: 1 }],
      color: '#000',
      strokeWidth: 2,
      opacity: 1,
      created: Date.now(),
      updated: Date.now(),
      userId: 'human',
      commandId: 'user-cmd',
    };
    const elAi1: DrawingElement = {
      id: 'ai-rect-1',
      type: 'rectangle',
      points: [{ x: 10, y: 10 }],
      color: '#3B82F6',
      strokeWidth: 2,
      opacity: 1,
      created: Date.now(),
      updated: Date.now(),
      userId: 'studybot',
      commandId: 'ai-cmd-42',
    };
    const elAi2: DrawingElement = {
      id: 'ai-text-1',
      type: 'text',
      points: [{ x: 20, y: 20 }],
      color: '#111',
      strokeWidth: 1,
      opacity: 1,
      text: 'Node 1',
      created: Date.now(),
      updated: Date.now(),
      userId: 'studybot',
      commandId: 'ai-cmd-42',
    };

    await store.addElement('room-1', elUser);
    await store.addElement('room-1', elAi1);
    await store.addElement('room-1', elAi2);

    expect(await store.getElements('room-1')).toHaveLength(3);

    // Undo AI command
    const deletedIds = await store.deleteElementsByCommandId('room-1', 'ai-cmd-42');
    expect(deletedIds).toEqual(['ai-rect-1', 'ai-text-1']);

    const remaining = await store.getElements('room-1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('user-stroke');
  });

  it('manages users per room and deletes room when empty', async () => {
    const user: User = {
      id: 'u-1',
      name: 'Alice',
      color: '#FF6B6B',
      isActive: true,
      joinedAt: Date.now(),
    };

    await store.addUser('room-1', user);
    expect(await store.getUsers('room-1')).toHaveLength(1);

    await store.removeUser('room-1', 'u-1');
    expect(await store.roomCount()).toBe(0);
  });
});

