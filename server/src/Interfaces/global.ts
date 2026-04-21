export interface Participant {
  socketId: string;
  role: "teacher" | "student";
}

export interface Room {
  roomCode: string;
  teacherSocketId: string;
  participants: Participant[];
}
