import express from "express";
import http from "http";
import { Server } from "socket.io";
import { config } from "./config.js";
import type { Participant, Room } from "./Interfaces/global.js";
import { Roles } from "./enums/global.js";
import { RoomStore, roomStore } from "./store/RoomStore.js";

export const generateCode = (length = 5) => {
  const MAX_LENGTH = 5;
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const codeLength = Math.min(length, MAX_LENGTH);

  let result = "";
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
};

export const createExpressApp = () => {
  const app = express();

  app.use(express.json());
  app.get("/health", (req, res) => res.send({ status: "ok" }));

  return app;
};

const emitParticipants = (io: Server, room: Room) => {
  io.to(room.roomCode).emit("room:participants", room.participants);
};

const normalizeDisplayName = (value: string | undefined) => value?.trim() ?? "";

export const registerSocketHandlers = (io: Server, store: RoomStore) => {
  io.on("connection", (socket) => {
    socket.emit("server:welcome", {
      message: "Welcome to the server!",
      id: socket.id,
    });

    socket.on("client:ping", (data) => {
      socket.emit("server:pong", {
        received: data,
        at: new Date().toISOString(),
      });
    });

    socket.on("room:created", ({ displayName }: { displayName?: string }) => {
      const normalizedDisplayName = normalizeDisplayName(displayName);

      if (!normalizedDisplayName) {
        socket.emit("room:error", {
          message: "Name is required",
        });
        return;
      }

      const teacherSocketId = socket.id;
      const roomCode = generateCode(5);

      const room = {
        roomCode,
        teacherSocketId,
        participants: [
          {
            socketId: teacherSocketId,
            displayName: normalizedDisplayName,
            role: Roles.Teacher,
          },
        ],
      };

      store.createRoom(room);
      socket.join(roomCode);
      socket.emit("room:created", { roomCode });
      emitParticipants(io, room);
    });

    socket.on("room:joined",({ roomCode, displayName}: {roomCode: string; displayName?: string;}) => {
			const normalizedDisplayName = normalizeDisplayName(displayName);

			if (!normalizedDisplayName) {
				socket.emit("room:error", {
					message: "Name is required",
					roomCode,
				});
				return;
			}

			const room = store.getRoom(roomCode);

			if (!room) {
				socket.emit("room:error", {
					message: "Room not found",
					roomCode,
				});
				return;
			}

			const nextParticipant: Participant = {
				socketId: socket.id,
				displayName: normalizedDisplayName,
				role: Roles.Student,
			};
			const isNewParticipant = !room.participants.some(
				(participant) => participant.socketId === socket.id,
			);
			const updatedRoom = store.addParticipant(roomCode, nextParticipant);

			socket.join(roomCode);
			socket.emit("room:joined", {
				roomCode,
				role: nextParticipant.role,
			});

			if (updatedRoom && isNewParticipant) {
				socket.to(roomCode).emit("participant:joined", nextParticipant);
				emitParticipants(io, updatedRoom);
			}
		});

    socket.on("chat:message", (text: string) => {
      const room = store.getRoomBySocketId(socket.id);
      const normalizedText = text.trim();
      const participant = room?.participants.find(
        (currentParticipant) => currentParticipant.socketId === socket.id,
      );

      if (!room || !participant || normalizedText === "") {
        return;
      }

      io.to(room.roomCode).emit("chat:message", {
        from: participant.displayName,
        text: normalizedText,
        at: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      const room = store.getRoomBySocketId(socket.id);
      const participant = room?.participants.find(
        (currentParticipant) => currentParticipant.socketId === socket.id,
      );

      if (room && participant) {
        const updatedRoom = store.removeParticipant(room.roomCode, socket.id);

        socket.to(room.roomCode).emit("participant:left", participant);

        if (updatedRoom) {
          emitParticipants(io, updatedRoom);
        }
      }
    });
  });
};

export const createRealtimeServer = (store: RoomStore = roomStore) => {
  const app = createExpressApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.corsOrigin },
  });

  registerSocketHandlers(io, store);

  return { app, server, io, store };
};
