export const SocketConfig = {
  Url: "http://localhost:3001",
} as const;

export const SocketEvent = {
  Connect: "connect",
  Disconnect: "disconnect",
  ServerWelcome: "server:welcome",
  ChatMessage: "chat:message",
} as const;
