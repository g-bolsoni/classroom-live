import express from "express";
import http from "http";
import { Server } from "socket.io";
import { config } from "./config.js";
import { Roles } from "./enums/global.js";
import { roomStore } from "./store/RoomStore.js";

const app = express();
app.use(express.json());
app.get("/health", (req, res) => res.send({ status: "ok" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.corsOrigin },
});

const generateCode = (length = 5) => {
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

io.on("connection", (socket) => {
  // Send a welcome message to the client when they connect
  socket.emit("server:welcome", {
    message: "Welcome to the server!",
    id: socket.id,
  });

  // Listen for a "client:ping" event from the client
  socket.on("client:ping", (data) => {
    console.log("client:ping => ", data);
    socket.emit("server:pong", {
      received: data,
      at: new Date().toISOString(),
    });
  });

  socket.on("room:created", () => {
    const teacherSocketId = socket.id;
    const roomCode = generateCode(5);

    const room = {
      roomCode,
      teacherSocketId,
      participants: [
        {
          socketId: teacherSocketId,
          role: Roles.Teacher,
        },
      ],
    };

    roomStore.createRoom(room);
    socket.join(roomCode);
    socket.emit("room:created", { roomCode });
  });

  socket.on("room:joined", ({ roomCode }: { roomCode: string }) => {
    const room = roomStore.getRoom(roomCode);

    if (!room) {
      socket.emit("room:error", {
        message: "Room not found",
        roomCode,
      });
      return;
    }

    roomStore.addParticipant(roomCode, {
      socketId: socket.id,
      role: Roles.Student,
    });

    socket.join(roomCode);
    socket.emit("room:joined", {
      roomCode,
      role: Roles.Student,
    });
  });

  // Listen for a "chat:message" event from the client
  socket.on("chat:message", (text) => {
    io.emit("chat:message", {
      from: socket.id,
      text,
      at: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    const room = roomStore.getRoomBySocketId(socket.id);

    if (room) {
      roomStore.removeParticipant(room.roomCode, socket.id);
    }

    console.log(`Client ${socket.id} disconnected`);
  });
});

server.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
