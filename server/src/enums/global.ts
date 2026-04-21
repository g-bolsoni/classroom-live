export const SocketEvent = {
  CreateRoom: "room:created",
  JoinRoom: "room:joined",
  Connect: "connect",
  Disconnect: "disconnect",
  ServerWelcome: "server:welcome",
  ChatMessage: "chat:message",
} as const;

export const Roles = {
  Teacher: "teacher",
  Student: "student",
} as const;
