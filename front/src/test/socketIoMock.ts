import { vi } from "vitest";

type EventHandler = (...args: any[]) => void;

export class MockSocket {
  id = "mock-socket-id";
  emitted: Array<[string, ...any[]]> = [];
  private handlers = new Map<string, EventHandler[]>();

  on = vi.fn((event: string, handler: EventHandler) => {
    const registeredHandlers = this.handlers.get(event) ?? [];
    registeredHandlers.push(handler);
    this.handlers.set(event, registeredHandlers);
    return this;
  });

  emit = vi.fn((event: string, ...args: any[]) => {
    this.emitted.push([event, ...args]);
    return this;
  });

  off = vi.fn((event: string, handler?: EventHandler) => {
    if (!handler) {
      this.handlers.delete(event);
      return this;
    }

    const registeredHandlers = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      registeredHandlers.filter(
        (registeredHandler) => registeredHandler !== handler,
      ),
    );
    return this;
  });

  disconnect = vi.fn(() => this);

  trigger(event: string, ...args: any[]) {
    const registeredHandlers = this.handlers.get(event) ?? [];

    for (const handler of registeredHandlers) {
      handler(...args);
    }
  }
}

const sockets: MockSocket[] = [];

export const createSocket = vi.fn(() => {
  const socket = new MockSocket();
  sockets.push(socket);
  return socket;
});

export const getLastSocket = () => {
  const socket = sockets.at(-1);

  if (!socket) {
    throw new Error("No socket instance was created");
  }

  return socket;
};

export const resetSocketMocks = () => {
  sockets.length = 0;
  createSocket.mockClear();
};
