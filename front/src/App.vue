<template>
  <section class="w-screen h-screen flex items-center justify-center p-4">
    <div
      class="bg-gray-900 text-white w-full h-full rounded-2xl max-w-4/6 p-6 flex flex-col gap-6"
    >
      <div class="flex flex-col gap-3 items-start">
        <button
          class="p-3 bg-blue-500 text-white rounded-lg"
          @click="handleCreateRoom"
        >
          Criar sala
        </button>

        <p v-if="activeRoomCode" class="text-sm text-gray-300">
          Sala atual: {{ activeRoomCode }}
        </p>

        <p v-if="joinedRole" class="text-sm text-gray-300">
          Papel na sala: {{ joinedRole }}
        </p>

        <a
          v-if="roomLink"
          :href="roomLink"
          class="text-sm text-blue-300 underline underline-offset-2"
        >
          {{ roomLink }}
        </a>

        <p v-if="errorMessage" class="text-sm text-red-400">
          {{ errorMessage }}
        </p>
      </div>

      <div class="p-4">
        <input
          type="text"
          name="roomId"
          id="roomId"
          class="p-3 border-t bg-white placeholder-gray-500 focus:outline-none flex-1 rounded-l-lg"
          :value="roomCode"
          @input="handleInput"
          @keydown.enter="handleSignInRoom"
        />
        <button
          class="p-3 bg-blue-500 text-white rounded-r-lg"
          @click="handleSignInRoom"
        >
          Entrar
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { io, type Socket } from "socket.io-client";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { SocketConfig, SocketEvent } from "./enums/socket";

let socket: Socket | null = null;

const roomCode = ref("");
const activeRoomCode = ref("");
const joinedRole = ref<"teacher" | "student" | "">("");
const errorMessage = ref("");
const roomLink = ref("");

const getRoomCodeFromPath = () => {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  return path;
};

const navigateToRoom = (nextRoomCode: string) => {
  const nextPath = `/${nextRoomCode}`;
  window.history.pushState({}, "", nextPath);
  activeRoomCode.value = nextRoomCode;
  roomLink.value = `${window.location.origin}${nextPath}`;
};

const joinRoom = (nextRoomCode: string) => {
  const normalizedRoomCode = nextRoomCode.trim();

  if (!normalizedRoomCode || !socket) {
    return;
  }

  errorMessage.value = "";
  socket.emit(SocketEvent.JoinRoom, { roomCode: normalizedRoomCode });
};

onMounted(() => {
  socket = io(SocketConfig.Url, {
    transports: ["websocket"],
  });

  const initialRoomCode = getRoomCodeFromPath();

  if (initialRoomCode) {
    roomCode.value = initialRoomCode;
    activeRoomCode.value = initialRoomCode;
    roomLink.value = `${window.location.origin}/${initialRoomCode}`;
  }

  socket.on(SocketEvent.CreateRoom, (p: { roomCode: string }) => {
    roomCode.value = p.roomCode;
    activeRoomCode.value = p.roomCode;
    joinedRole.value = "teacher";
    errorMessage.value = "";
    navigateToRoom(p.roomCode);
  });

  socket.on(
    SocketEvent.JoinRoom,
    (p: { roomCode: string; role?: "teacher" | "student" }) => {
      roomCode.value = p.roomCode;
      activeRoomCode.value = p.roomCode;
      joinedRole.value = p.role ?? "student";
      errorMessage.value = "";
      roomLink.value = `${window.location.origin}/${p.roomCode}`;
    },
  );

  socket.on(SocketEvent.RoomError, (p: { message: string }) => {
    errorMessage.value = p.message;
    joinedRole.value = "";
  });

  socket.on(SocketEvent.Connect, () => {
    const urlRoomCode = getRoomCodeFromPath();

    if (urlRoomCode) {
      joinRoom(urlRoomCode);
    }
  });

  window.addEventListener("popstate", handlePopState);
});

const handlePopState = () => {
  const urlRoomCode = getRoomCodeFromPath();

  roomCode.value = urlRoomCode;
  activeRoomCode.value = urlRoomCode;
  roomLink.value = urlRoomCode ? `${window.location.origin}/${urlRoomCode}` : "";

  if (urlRoomCode) {
    joinRoom(urlRoomCode);
  }
};

onBeforeUnmount(() => {
  window.removeEventListener("popstate", handlePopState);
  socket?.disconnect();
  socket = null;
});

const handleCreateRoom = () => {
  errorMessage.value = "";
  socket?.emit(SocketEvent.CreateRoom);
};

const handleSignInRoom = () => {
  const normalizedRoomCode = roomCode.value.trim();

  if (!normalizedRoomCode) return;

  navigateToRoom(normalizedRoomCode);
  joinRoom(normalizedRoomCode);
};

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  roomCode.value = target.value;
};
</script>
