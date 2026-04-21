export type ParticipantRole = "teacher" | "student";

export type Participant = {
  socketId: string;
  displayName: string;
  role: ParticipantRole;
};
