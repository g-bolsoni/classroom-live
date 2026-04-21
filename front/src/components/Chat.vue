<template>
  <section class="chat h-screen flex flex-col bg-gray-800">
    <h1 class="text-2xl font-bold p-4 bg-gray-900 border-b">Chat</h1>
    <div class="chat-container flex flex-col h-full">
      <div class="messages flex-1 overflow-y-auto p-4 space-y-4">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message flex flex-col mb-2"
        >
          <span
            class="username text-start text-gray-300 text-sm font-semibold mb-1"
          >
            {{ message.from }}:
          </span>
          <span
            class="text bg-blue-500 text-white rounded-lg px-4 py-2 max-w-xs w-fit"
          >
            {{ message.text }}
          </span>
        </div>
        <p v-if="messages.length === 0" class="text-sm text-gray-400">
          Nenhuma mensagem ainda.
        </p>
      </div>
      <div class="flex p-4 bg-gray-900 border-t">
        <input
          class="p-3 border-t bg-white placeholder-gray-500 focus:outline-none flex-1 rounded-l-lg"
          type="text"
          placeholder="Type your message..."
          v-model="messageInput"
          @input="handleInput"
          @keydown.enter="sendMessage"
        />
        <button
          class="p-3 bg-blue-500 text-white rounded-r-lg"
          :disabled="!isConnected"
          @click="sendMessage"
        >
          Send
        </button>
      </div>
      <p class="px-4 pb-4 text-sm text-gray-400">
        Status: {{ isConnected ? "conectado" : "desconectado" }}
      </p>
    </div>
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { io, type Socket } from "socket.io-client";
import { SocketConfig, SocketEvent } from "../enums/socket.ts";
import type {
  ChatMessage,
  ChatMessagePayload,
  ServerWelcomePayload,
} from "../types/chat.ts";

const messageInput = ref("");
const messages = ref<ChatMessage[]>([]);
const isConnected = ref(false);

let socket: Socket | null = null;

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  messageInput.value = target.value;
};

const appendMessage = (message: ChatMessage) => {
  messages.value.push(message);
};

onMounted(() => {
  socket = io(SocketConfig.Url, {
    transports: ["websocket"],
  });

  socket.on(SocketEvent.Connect, () => (isConnected.value = true));

  socket.on(SocketEvent.Disconnect, () => (isConnected.value = false));

  socket.on(SocketEvent.ServerWelcome, (payload: ServerWelcomePayload) => {
    appendMessage({
      id: `welcome-${payload.id}`,
      from: "server",
      text: payload.message,
      at: new Date().toISOString(),
    });
  });

  socket.on(SocketEvent.ChatMessage, (payload: ChatMessagePayload) => {
    appendMessage({
      id: `${payload.from}-${payload.at}`,
      from: payload.from,
      text: payload.text,
      at: payload.at,
    });
  });
});

onBeforeUnmount(() => {
  socket?.disconnect();
  socket = null;
});

const sendMessage = () => {
  const text = messageInput.value.trim();

  if (text === "" || !socket || !isConnected.value) return;

  socket.emit(SocketEvent.ChatMessage, text);
  messageInput.value = "";
};
</script>
