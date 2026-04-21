import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { io as createClient, type Socket } from "socket.io-client";
import { createRealtimeServer } from "./app.js";
import { RoomStore } from "./store/RoomStore.js";

const waitForEvent = <TPayload>(socket: Socket, event: string) =>
  new Promise<TPayload>((resolve) => {
    socket.once(event, (payload: TPayload) => resolve(payload));
  });

const waitForNoEvent = async (
  socket: Socket,
  event: string,
  timeoutMs = 150,
) => {
  const noEvent = Symbol("no-event");
  const result = await Promise.race([
    waitForEvent(socket, event).then(() => "event"),
    new Promise<symbol>((resolve) => {
      setTimeout(() => resolve(noEvent), timeoutMs);
    }),
  ]);

  expect(result).toBe(noEvent);
};

const waitForCondition = async (
  predicate: () => boolean,
  timeoutMs = 1000,
  intervalMs = 20,
) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for condition");
};

describe("createRealtimeServer", () => {
  const clients: Socket[] = [];
  let currentServer: ReturnType<typeof createRealtimeServer> | null = null;

  const connectClient = async (url: string) => {
    const client = createClient(url, {
      autoConnect: false,
      forceNew: true,
      reconnection: false,
      transports: ["websocket"],
    });

    clients.push(client);

    const connected = waitForEvent<void>(client, "connect");
    client.connect();
    await connected;

    return client;
  };

  const startServer = async () => {
    currentServer = createRealtimeServer(new RoomStore());

    await new Promise<void>((resolve) => {
      currentServer?.server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = currentServer.server.address() as AddressInfo | null;

    if (!address) {
      throw new Error("Server address is not available");
    }

    return {
      ...currentServer,
      url: `http://127.0.0.1:${address.port}`,
    };
  };

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }

    if (currentServer) {
      await new Promise<void>((resolve) => {
        currentServer?.io.close();
        currentServer?.server.close(() => resolve());
      });
      currentServer = null;
    }
  });

  it("serves the health endpoint", async () => {
    const { url } = await startServer();

    const response = await fetch(`${url}/health`);

    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("welcomes a socket client on connection", async () => {
    const { url } = await startServer();
    const client = createClient(url, {
      autoConnect: false,
      forceNew: true,
      reconnection: false,
      transports: ["websocket"],
    });

    clients.push(client);

    const welcome = waitForEvent<{ message: string; id: string }>(
      client,
      "server:welcome",
    );
    const connected = waitForEvent<void>(client, "connect");

    client.connect();
    await connected;

    await expect(welcome).resolves.toMatchObject({
      message: "Welcome to the server!",
    });
  });

  it("responds to client ping with server pong", async () => {
    const { url } = await startServer();
    const client = await connectClient(url);

    const pong = waitForEvent<{ received: { value: string }; at: string }>(
      client,
      "server:pong",
    );

    client.emit("client:ping", { value: "hello" });

    await expect(pong).resolves.toMatchObject({
      received: { value: "hello" },
    });
  });

  it("creates a room and stores the teacher participant", async () => {
    const { store, url } = await startServer();
    const client = await connectClient(url);
    const roomCreated = waitForEvent<{ roomCode: string }>(
      client,
      "room:created",
    );
    const roomParticipants = waitForEvent<
      Array<{ socketId: string; role: string }>
    >(client, "room:participants");

    client.emit("room:created", { displayName: "Teacher One" });

    const payload = await roomCreated;
    const room = store.getRoom(payload.roomCode);

    expect(payload.roomCode).toHaveLength(5);
    expect(room).toMatchObject({
      roomCode: payload.roomCode,
      teacherSocketId: client.id,
    });
    expect(room?.participants).toContainEqual({
      socketId: client.id,
      displayName: "Teacher One",
      role: "teacher",
    });
    await expect(roomParticipants).resolves.toEqual([
      {
        socketId: client.id,
        displayName: "Teacher One",
        role: "teacher",
      },
    ]);
  });

  it("rejects room creation without a display name", async () => {
    const { url } = await startServer();
    const client = await connectClient(url);
    const roomError = waitForEvent<{ message: string }>(client, "room:error");

    client.emit("room:created", { displayName: "   " });

    await expect(roomError).resolves.toEqual({
      message: "Name is required",
    });
  });

  it("rejects joining an unknown room", async () => {
    const { url } = await startServer();
    const client = await connectClient(url);
    const roomError = waitForEvent<{ message: string; roomCode: string }>(
      client,
      "room:error",
    );

    client.emit("room:joined", { roomCode: "MISSING", displayName: "Ana" });

    await expect(roomError).resolves.toEqual({
      message: "Room not found",
      roomCode: "MISSING",
    });
  });

  it("rejects joining without a display name", async () => {
    const { url } = await startServer();
    const client = await connectClient(url);
    const roomError = waitForEvent<{ message: string; roomCode: string }>(
      client,
      "room:error",
    );

    client.emit("room:joined", { roomCode: "ROOM1", displayName: "  " });

    await expect(roomError).resolves.toEqual({
      message: "Name is required",
      roomCode: "ROOM1",
    });
  });

  it("joins an existing room as a student", async () => {
    const { store, url } = await startServer();
    const teacher = await connectClient(url);
    const student = await connectClient(url);
    const roomCreated = waitForEvent<{ roomCode: string }>(
      teacher,
      "room:created",
    );

    teacher.emit("room:created", { displayName: "Teacher One" });

    const { roomCode } = await roomCreated;
    const participantJoined = waitForEvent<{ socketId: string; role: string }>(
      teacher,
      "participant:joined",
    );
    const teacherParticipants = waitForEvent<
      Array<{ socketId: string; displayName: string; role: string }>
    >(teacher, "room:participants");
    const studentParticipants = waitForEvent<
      Array<{ socketId: string; displayName: string; role: string }>
    >(student, "room:participants");
    const roomJoined = waitForEvent<{ roomCode: string; role: string }>(
      student,
      "room:joined",
    );

    student.emit("room:joined", { roomCode, displayName: "Student One" });

    await expect(roomJoined).resolves.toEqual({
      roomCode,
      role: "student",
    });
    expect(store.getRoom(roomCode)?.participants).toContainEqual({
      socketId: student.id,
      displayName: "Student One",
      role: "student",
    });
    await expect(participantJoined).resolves.toEqual({
      socketId: student.id,
      displayName: "Student One",
      role: "student",
    });
    await expect(teacherParticipants).resolves.toContainEqual({
      socketId: student.id,
      displayName: "Student One",
      role: "student",
    });
    await expect(studentParticipants).resolves.toContainEqual({
      socketId: teacher.id,
      displayName: "Teacher One",
      role: "teacher",
    });
  });

  it("broadcasts chat messages only to clients in the same room", async () => {
    const { url } = await startServer();
    const teacher = await connectClient(url);
    const student = await connectClient(url);
    const outsider = await connectClient(url);
    const roomCreated = waitForEvent<{ roomCode: string }>(
      teacher,
      "room:created",
    );

    teacher.emit("room:created", { displayName: "Teacher One" });

    const { roomCode } = await roomCreated;
    const roomJoined = waitForEvent<{ roomCode: string; role: string }>(
      student,
      "room:joined",
    );

    student.emit("room:joined", { roomCode, displayName: "Student One" });
    await roomJoined;

    const senderMessage = waitForEvent<{
      from: string;
      text: string;
      at: string;
    }>(teacher, "chat:message");
    const receiverMessage = waitForEvent<{
      from: string;
      text: string;
      at: string;
    }>(student, "chat:message");

    teacher.emit("chat:message", "hello class");

    await expect(senderMessage).resolves.toMatchObject({
      from: "Teacher One",
      text: "hello class",
    });
    await expect(receiverMessage).resolves.toMatchObject({
      from: "Teacher One",
      text: "hello class",
    });
    await waitForNoEvent(outsider, "chat:message");
  });

  it("removes a participant from the room when the socket disconnects", async () => {
    const { store, url } = await startServer();
    const teacher = await connectClient(url);
    const student = await connectClient(url);
    const roomCreated = waitForEvent<{ roomCode: string }>(
      teacher,
      "room:created",
    );

    teacher.emit("room:created", { displayName: "Teacher One" });

    const { roomCode } = await roomCreated;
    const roomJoined = waitForEvent<{ roomCode: string; role: string }>(
      student,
      "room:joined",
    );
    const participantLeft = waitForEvent<{ socketId: string; role: string }>(
      teacher,
      "participant:left",
    );

    student.emit("room:joined", { roomCode, displayName: "Student One" });
    await roomJoined;

    const studentId = student.id;

    student.disconnect();

    await waitForCondition(
      () => store.getRoom(roomCode)?.participants.length === 1,
    );

    expect(store.getRoom(roomCode)?.participants).toContainEqual({
      socketId: teacher.id,
      displayName: "Teacher One",
      role: "teacher",
    });
    await expect(participantLeft).resolves.toEqual({
      socketId: studentId,
      displayName: "Student One",
      role: "student",
    });
  });
});
