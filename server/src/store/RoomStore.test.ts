import { describe, expect, it } from "vitest";
import type { Participant, Room } from "../Interfaces/global.js";
import { RoomStore } from "./RoomStore.js";

const createParticipant = (
  socketId: string,
  displayName = `user-${socketId}`,
  role: Participant["role"] = "student",
): Participant => ({
  socketId,
  displayName,
  role,
});

const createRoom = (overrides?: Partial<Room>): Room => ({
  roomCode: "ROOM1",
  teacherSocketId: "teacher-1",
  participants: [createParticipant("teacher-1", "Teacher One", "teacher")],
  ...overrides,
});

describe("RoomStore", () => {
  it("creates and retrieves a room by code", () => {
    const store = new RoomStore();
    const room = createRoom();

    const createdRoom = store.createRoom(room);

    expect(createdRoom).toBe(room);
    expect(store.getRoom(room.roomCode)).toBe(room);
  });

  it("returns undefined when the room code does not exist", () => {
    const store = new RoomStore();

    expect(store.getRoom("MISSING")).toBeUndefined();
  });

  it("finds a room by participant socket id", () => {
    const store = new RoomStore();
    const room = createRoom({
      roomCode: "ROOM2",
      participants: [
        createParticipant("teacher-2", "teacher"),
        createParticipant("student-2", "Student Two"),
      ],
    });

    store.createRoom(room);

    expect(store.getRoomBySocketId("student-2")).toBe(room);
  });

  it("returns null when no room contains the socket id", () => {
    const store = new RoomStore();
    store.createRoom(createRoom());

    expect(store.getRoomBySocketId("missing-socket")).toBeNull();
  });

  it("adds a participant to an existing room", () => {
    const store = new RoomStore();
    const room = createRoom();
    const participant = createParticipant("student-3", "Student Three");

    store.createRoom(room);

    const updatedRoom = store.addParticipant(room.roomCode, participant);

    expect(updatedRoom).toBe(room);
    expect(updatedRoom?.participants).toContainEqual(participant);
  });

  it("does not add the same socket twice to the same room", () => {
    const store = new RoomStore();
    const room = createRoom();

    store.createRoom(room);
    store.addParticipant(room.roomCode, createParticipant("student-3"));
    const updatedRoom = store.addParticipant(
      room.roomCode,
      createParticipant("student-3"),
    );

    expect(updatedRoom?.participants).toHaveLength(2);
  });

  it("returns null when adding a participant to a missing room", () => {
    const store = new RoomStore();

    expect(
      store.addParticipant(
        "MISSING",
        createParticipant("student-4", "Student Four"),
      ),
    ).toBe(null);
  });

  it("removes a participant from an existing room", () => {
    const store = new RoomStore();
    const room = createRoom({
      participants: [
        createParticipant("teacher-1", "Teacher One", "teacher"),
        createParticipant("student-5", "Student Five"),
      ],
    });

    store.createRoom(room);

    const updatedRoom = store.removeParticipant(room.roomCode, "student-5");

    expect(updatedRoom?.participants).toHaveLength(1);
    expect(updatedRoom?.participants[0]?.socketId).toBe("teacher-1");
  });

  it("returns null when removing a participant from a missing room", () => {
    const store = new RoomStore();

    expect(store.removeParticipant("MISSING", "student-6")).toBeNull();
  });

  it("keeps the room unchanged when removing an unknown participant", () => {
    const store = new RoomStore();
    const room = createRoom();

    store.createRoom(room);

    const updatedRoom = store.removeParticipant(
      room.roomCode,
      "missing-socket",
    );

    expect(updatedRoom?.participants).toHaveLength(1);
    expect(updatedRoom?.participants[0]?.socketId).toBe("teacher-1");
  });
});
