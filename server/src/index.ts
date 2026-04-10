import express from "express";
import http from "http";
import { Server } from "socket.io";
import { config } from "./config.js";

const app = express();
app.use(express.json());
app.get("/health", (req, res) => res.send({ status: "ok" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.corsOrigin },
});

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

  // Listen for a "chat:message" event from the client
  socket.on("chat:message", (text) => {
    io.emit("chat:message", {
      from: socket.id,
      text,
      at: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    console.log(`Client ${socket.id} disconnected`);
  });
});

server.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
