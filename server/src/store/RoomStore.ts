import type { Participant, Room } from "../Interfaces/global.js";

export class RoomStore {
  private rooms = new Map<string, Room>();

  clear() {
    this.rooms.clear();
  }

  createRoom(room: Room) {
    this.rooms.set(room.roomCode, room);
    return room;
  }

  getRoom(roomCode: string) {
    return this.rooms.get(roomCode);
  }

  getRoomBySocketId(socketId: string) {
    for (const room of this.rooms.values()) {
      const isParticipantInRoom = room.participants.some(
        (participant) => participant.socketId === socketId,
      );

      if (isParticipantInRoom) {
        return room;
      }
    }

    return null;
  }

  addParticipant(roomCode: string, participant: Participant) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return null;
    }

    const existingParticipant = room.participants.find(
      (currentParticipant) =>
        currentParticipant.socketId === participant.socketId,
    );

    if (existingParticipant) {
      return room;
    }

    room.participants.push(participant);
    return room;
  }

  removeParticipant(roomCode: string, socketId: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return null;
    }

    room.participants = room.participants.filter(
      (participant) => participant.socketId !== socketId,
    );

    return room;
  }
}

export const roomStore = new RoomStore();
