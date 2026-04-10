export type ChatMessage = {
  id: string;
  from: string;
  text: string;
  at: string;
};

export type ServerWelcomePayload = {
  id: string;
  message: string;
};

export type ChatMessagePayload = {
  from: string;
  text: string;
  at: string;
};