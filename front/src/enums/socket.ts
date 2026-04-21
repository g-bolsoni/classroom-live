export const SocketConfig = {
  Url: "http://localhost:3001",
} as const;

export const SocketEvent = {
  CreateRoom: "room:created",
  JoinRoom: "room:joined",
  RoomError: "room:error",
  RoomParticipants: "room:participants",
  ParticipantJoined: "participant:joined",
  ParticipantLeft: "participant:left",
  Connect: "connect",
  Disconnect: "disconnect",
  ServerWelcome: "server:welcome",
  ChatMessage: "chat:message",
} as const;
