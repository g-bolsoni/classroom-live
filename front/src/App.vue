<template>
  <section class="w-screen h-screen flex items-center justify-center p-4">
    <div
      class="bg-gray-900 text-white w-full h-full rounded-2xl max-w-5xl p-6 flex flex-col gap-6"
    >
      <h1 class="text-2xl">{{ joinedRole }}</h1>
      <div v-if="joinedRole" class="flex flex-col gap-3 items-start">
        <p v-if="activeRoomCode" class="text-sm text-gray-300">
          Sala atual: {{ activeRoomCode }}
        </p>

        <p v-if="joinedRole" class="text-sm text-gray-300">
          Papel na sala: {{ joinedRole }}
        </p>

        <p v-if="displayName" class="text-sm text-gray-300">
          Nome: {{ displayName }}
        </p>

        <p class="text-sm text-gray-400">
          Status do socket: {{ isConnected ? "conectado" : "desconectado" }}
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

      <div
        v-else
        class="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]"
      >
        <section
          class="flex flex-col justify-between rounded-2xl border border-gray-800 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_rgba(17,24,39,1)_0%,_rgba(3,7,18,1)_100%)] p-8"
        >
          <div class="space-y-4">
            <p class="text-xs uppercase tracking-[0.3em] text-blue-300">
              Classroom Live
            </p>
            <h1 class="max-w-lg text-4xl font-semibold leading-tight">
              Escolha como você quer entrar na aula.
            </h1>
            <p class="max-w-xl text-sm text-gray-300">
              A criação da sala e a entrada agora ficam em fluxos separados. Em
              ambos os casos, o nome do participante é obrigatório.
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <button
              id="createModeButton"
              class="rounded-2xl border px-5 py-4 text-left transition hover:border-blue-400 hover:bg-blue-500/10"
              :class="
                viewMode === 'create'
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-900/70'
              "
              @click="setViewMode('create')"
            >
              <p class="text-lg font-semibold">Criar sala</p>
              <p class="mt-2 text-sm text-gray-300">
                Inicie uma nova sala como professor.
              </p>
            </button>

            <button
              id="joinModeButton"
              class="rounded-2xl border px-5 py-4 text-left transition hover:border-blue-400 hover:bg-blue-500/10"
              :class="
                viewMode === 'join'
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-900/70'
              "
              @click="setViewMode('join')"
            >
              <p class="text-lg font-semibold">Entrar em sala</p>
              <p class="mt-2 text-sm text-gray-300">
                Use o código da sala para participar como aluno.
              </p>
            </button>
          </div>
        </section>

        <section class="rounded-2xl border border-gray-800 bg-gray-950 p-6">
          <div class="space-y-2">
            <p class="text-xs uppercase tracking-[0.25em] text-gray-500">
              {{ viewMode === "create" ? "Criar sala" : "Entrar na sala" }}
            </p>
            <h2 class="text-2xl font-semibold">
              {{
                viewMode === "create"
                  ? "Informe seu nome para criar uma sala"
                  : "Informe seu nome e o código da sala"
              }}
            </h2>
          </div>

          <div class="mt-6 space-y-4">
            <label class="block space-y-2">
              <span class="text-sm text-gray-300">Seu nome</span>
              <input
                id="displayName"
                type="text"
                class="
                  w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-400
                  disabled:bg-gray-800/50 disabled:border-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed"
                :value="displayName"
                placeholder="Ex.: Ana Paula"
                :disabled="hasDataInSession"
                @input="handleDisplayNameInput"
                @keydown.enter="handlePrimaryAction"
              />
            </label>

            <label v-if="viewMode === 'join'" class="block space-y-2">
              <span class="text-sm text-gray-300">Código da sala</span>
              <input
                id="roomId"
                type="text"
                class="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-400"
                :value="roomCode"
                placeholder="Ex.: ROOM1"
                @input="handleRoomCodeInput"
                @keydown.enter="handlePrimaryAction"
              />
            </label>

            <button
              id="primaryActionButton"
              class="w-full rounded-xl bg-blue-500 px-4 py-3 font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-950"
              :disabled="!isConnected"
              @click="handlePrimaryAction"
            >
              {{ viewMode === "create" ? "Criar sala" : "Entrar na sala" }}
            </button>

            <p class="text-sm text-gray-400">
              Status do socket: {{ isConnected ? "conectado" : "desconectado" }}
            </p>

            <p v-if="errorMessage" class="text-sm text-red-400">
              {{ errorMessage }}
            </p>
          </div>
        </section>
      </div>

      <div v-if="joinedRole" class="grid flex-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside class="rounded-2xl border border-gray-800 bg-gray-950 p-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Participantes</h2>
            <span class="text-sm text-gray-400"
              >{{ participants.length }} online</span
            >
          </div>

          <ul class="mt-4 space-y-2">
            <li
              v-for="participant in participants"
              :key="participant.socketId"
              class="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2"
            >
              <p class="text-sm font-medium text-white">
                {{ participant.displayName }}
              </p>
              <p class="text-xs text-gray-500">
                {{ participant.socketId }}
              </p>
              <p class="text-xs uppercase tracking-wide text-gray-400">
                {{ participant.role }}
              </p>
            </li>
          </ul>
        </aside>

        <Chat
          ref="chatComponent"
          :current-display-name="displayName"
          :is-connected="isConnected"
          :room-code="activeRoomCode"
          :socket="socket"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { io, type Socket } from "socket.io-client";
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import Chat from "./components/Chat.vue";
import { SocketConfig, SocketEvent } from "./enums/socket";
import type { Participant } from "./types/room";

const socket = shallowRef<Socket | null>(null);

const viewMode = ref<"create" | "join">("create");
const displayName = ref(sessionStorage.getItem("displayName") || '');
const hasDataInSession = ref(!!sessionStorage.getItem("displayName"));
const roomCode = ref("");
const activeRoomCode = ref("");
const joinedRole = ref<"teacher" | "student" | "">("");
const errorMessage = ref("");
const isConnected = ref(false);
const participants = ref<Participant[]>([]);
const roomLink = ref("");
const chatComponent = ref<InstanceType<typeof Chat> | null>(null);

const getRoomCodeFromPath = () => {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  return path;
};

const setViewMode = (nextMode: "create" | "join") => {
  errorMessage.value = "";
  viewMode.value = nextMode;
};

const navigateToRoom = (nextRoomCode: string) => {
  const nextPath = `/${nextRoomCode}`;
  window.history.pushState({}, "", nextPath);
  activeRoomCode.value = nextRoomCode;
  roomLink.value = `${window.location.origin}${nextPath}`;
};

const validateDisplayName = () => {
  const normalizedDisplayName = displayName.value.trim();

  if (!normalizedDisplayName) {
    errorMessage.value = "Name is required";
    return null;
  }

  return normalizedDisplayName;
};

const joinRoom = (nextRoomCode: string, nextDisplayName: string) => {
  const normalizedRoomCode = nextRoomCode.trim();

  if (!normalizedRoomCode || !socket.value) {
    return;
  }

  errorMessage.value = "";
  socket.value.emit(SocketEvent.JoinRoom, {
    roomCode: normalizedRoomCode,
    displayName: nextDisplayName,
  });
};

const createRoom = (nextDisplayName: string) => {
  errorMessage.value = "";
  socket.value?.emit(SocketEvent.CreateRoom, { displayName: nextDisplayName });
};

onMounted(() => {
  socket.value = io(SocketConfig.Url, {
    transports: ["websocket"],
  });

  const initialRoomCode = getRoomCodeFromPath();

  if (initialRoomCode) {
    viewMode.value = "join";
    roomCode.value = initialRoomCode;
    activeRoomCode.value = initialRoomCode;
    roomLink.value = `${window.location.origin}/${initialRoomCode}`;
  }

  socket.value.on(SocketEvent.CreateRoom, (p: { roomCode: string }) => {
    roomCode.value = p.roomCode;
    activeRoomCode.value = p.roomCode;
    joinedRole.value = "teacher";
    errorMessage.value = "";
    navigateToRoom(p.roomCode);
  });

  socket.value.on(
    SocketEvent.JoinRoom,
    (p: { roomCode: string; role?: "teacher" | "student" }) => {
      roomCode.value = p.roomCode;
      activeRoomCode.value = p.roomCode;
      joinedRole.value = p.role ?? "student";
      errorMessage.value = "";
      roomLink.value = `${window.location.origin}/${p.roomCode}`;
    },
  );

  socket.value.on(SocketEvent.RoomError, (p: { message: string }) => {
    errorMessage.value = p.message;
    joinedRole.value = "";
    participants.value = [];
  });

  socket.value.on(
    SocketEvent.RoomParticipants,
    (nextParticipants: Participant[]) => {
      participants.value = nextParticipants;
    },
  );

  socket.value.on(SocketEvent.ParticipantJoined, (participant: Participant) => {
    chatComponent.value?.appendMessage({
      id: `presence-${participant.socketId}`,
      from: "server",
      text: `${participant.displayName} entrou na sala`,
      at: new Date().toISOString(),
    });
  });

  socket.value.on(SocketEvent.ParticipantLeft, (participant: Participant) => {
    chatComponent.value?.appendMessage({
      id: `presence-${participant.socketId}`,
      from: "server",
      text: `${participant.displayName} saiu da sala`,
      at: new Date().toISOString(),
    });
  });

  socket.value.on(SocketEvent.Connect, () => {
    isConnected.value = true;
  });

  socket.value.on(SocketEvent.Disconnect, () => {
    isConnected.value = false;
  });

  window.addEventListener("popstate", handlePopState);
});

const handlePopState = () => {
  const urlRoomCode = getRoomCodeFromPath();

  roomCode.value = urlRoomCode;
  activeRoomCode.value = urlRoomCode;
  roomLink.value = urlRoomCode
    ? `${window.location.origin}/${urlRoomCode}`
    : "";

  if (!joinedRole.value) {
    viewMode.value = urlRoomCode ? "join" : "create";
  }
};

onBeforeUnmount(() => {
  window.removeEventListener("popstate", handlePopState);
  socket.value?.disconnect();
  socket.value = null;
});

const handleCreateRoom = () => {
  errorMessage.value = "";
  const normalizedDisplayName = validateDisplayName();
  if (!normalizedDisplayName) return;

  sessionStorage.setItem("displayName", normalizedDisplayName);
  createRoom(normalizedDisplayName);
};

const handleSignInRoom = () => {
  const normalizedDisplayName = validateDisplayName();
  const normalizedRoomCode = roomCode.value.trim();
  if (!normalizedDisplayName) return;
  if (!normalizedRoomCode) {
    errorMessage.value = "Room code is required";
    return;
  }

  sessionStorage.setItem("displayName", normalizedDisplayName);

  navigateToRoom(normalizedRoomCode);
  joinRoom(normalizedRoomCode, normalizedDisplayName);
};

const handlePrimaryAction = () => {
  if (viewMode.value === "create") {
    handleCreateRoom();
    return;
  }

  handleSignInRoom();
};

const handleDisplayNameInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  displayName.value = target.value;
};

const handleRoomCodeInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  roomCode.value = target.value;
};
</script>
