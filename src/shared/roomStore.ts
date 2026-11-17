import { DrawingElement, User } from '../types';

export interface RoomState {
  roomId: string;
  users: Map<string, User>;
  elements: DrawingElement[];
  activeCommandId?: string | null;
  lastCommandId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface IRoomStore {
  getRoom(roomId: string): Promise<RoomState | null>;
  getOrCreateRoom(roomId: string): Promise<RoomState>;
  getElements(roomId: string): Promise<DrawingElement[]>;
  addElement(roomId: string, element: DrawingElement): Promise<void>;
  addElements(roomId: string, elements: DrawingElement[]): Promise<void>;
  updateElement(roomId: string, element: DrawingElement): Promise<boolean>;
  deleteElement(roomId: string, elementId: string): Promise<boolean>;
  deleteElementsByCommandId(roomId: string, commandId: string): Promise<string[]>;
  setElements(roomId: string, elements: DrawingElement[]): Promise<void>;
  addUser(roomId: string, user: User): Promise<void>;
  removeUser(roomId: string, userId: string): Promise<boolean>;
  getUsers(roomId: string): Promise<User[]>;
  roomCount(): Promise<number>;
  deleteRoom(roomId: string): Promise<boolean>;
  clear(): Promise<void>;
}

export class InMemoryRoomStore implements IRoomStore {
  private rooms = new Map<string, RoomState>();

  async getRoom(roomId: string): Promise<RoomState | null> {
    const room = this.rooms.get(roomId);
    return room || null;
  }

  async getOrCreateRoom(roomId: string): Promise<RoomState> {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        users: new Map(),
        elements: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  async getElements(roomId: string): Promise<DrawingElement[]> {
    const room = await this.getRoom(roomId);
    return room ? [...room.elements] : [];
  }

  async addElement(roomId: string, element: DrawingElement): Promise<void> {
    const room = await this.getOrCreateRoom(roomId);
    room.elements.push(element);
    room.updatedAt = Date.now();
  }

  async addElements(roomId: string, elements: DrawingElement[]): Promise<void> {
    if (elements.length === 0) return;
    const room = await this.getOrCreateRoom(roomId);
    room.elements.push(...elements);
    room.updatedAt = Date.now();
  }

  async updateElement(roomId: string, element: DrawingElement): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    const index = room.elements.findIndex(el => el.id === element.id);
    if (index !== -1) {
      room.elements[index] = element;
      room.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  async deleteElement(roomId: string, elementId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    const initialLength = room.elements.length;
    room.elements = room.elements.filter(el => el.id !== elementId);
    const deleted = room.elements.length < initialLength;
    if (deleted) {
      room.updatedAt = Date.now();
    }
    return deleted;
  }

  async deleteElementsByCommandId(roomId: string, commandId: string): Promise<string[]> {
    const room = await this.getRoom(roomId);
    if (!room) return [];

    const deletedIds: string[] = [];
    room.elements = room.elements.filter(el => {
      if (el.commandId === commandId) {
        deletedIds.push(el.id);
        return false;
      }
      return true;
    });

    if (deletedIds.length > 0) {
      room.updatedAt = Date.now();
    }
    return deletedIds;
  }

  async setElements(roomId: string, elements: DrawingElement[]): Promise<void> {
    const room = await this.getOrCreateRoom(roomId);
    room.elements = [...elements];
    room.updatedAt = Date.now();
  }

  async addUser(roomId: string, user: User): Promise<void> {
    const room = await this.getOrCreateRoom(roomId);
    room.users.set(user.id, user);
    room.updatedAt = Date.now();
  }

  async removeUser(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    const existed = room.users.delete(userId);
    if (existed) {
      room.updatedAt = Date.now();
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    return existed;
  }

  async getUsers(roomId: string): Promise<User[]> {
    const room = await this.getRoom(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  async roomCount(): Promise<number> {
    return this.rooms.size;
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    return this.rooms.delete(roomId);
  }

  async clear(): Promise<void> {
    this.rooms.clear();
  }
}

