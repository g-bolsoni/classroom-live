<template>
  <section class="chat flex h-full min-h-96 flex-col rounded-2xl bg-gray-800">
    <div class="border-b border-gray-700 bg-gray-900 p-4">
      <h1 class="text-2xl font-bold">Chat</h1>
      <p class="mt-1 text-sm text-gray-400">Sala {{ roomCode }}</p>
    </div>
    <div class="chat-container flex h-full flex-col">
      <div class="messages flex-1 overflow-y-auto p-4 space-y-4">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message mb-2 flex flex-col"
          :class="
            message.from === currentDisplayName ? 'items-end' : 'items-start'
          "
        >
          <span
            class="username mb-1 text-sm font-semibold text-gray-300"
            :class="
              message.from === currentDisplayName ? 'text-right' : 'text-left'
            "
          >
            {{ message.from }}:
          </span>
          <span
            class="text max-w-xs rounded-lg px-4 py-2 text-white"
            :class="
              message.from === currentDisplayName
                ? 'w-fit bg-emerald-500'
                : 'w-fit bg-blue-500'
            "
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
          class="flex-1 rounded-l-lg border-t bg-white p-3 text-gray-900 caret-gray-900 placeholder-gray-500 focus:outline-none"
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
import { onBeforeUnmount, ref, watch } from "vue";
import { SocketEvent } from "../enums/socket.ts";
import type {
  ChatMessage,
  ChatMessagePayload,
  ServerWelcomePayload,
} from "../types/chat.ts";

type ChatSocket = {
  emit: (event: string, ...args: unknown[]) => unknown;
  off: (event: string, handler?: (...args: any[]) => void) => unknown;
  on: (event: string, handler: (...args: any[]) => void) => unknown;
};

const props = defineProps<{
  currentDisplayName: string;
  isConnected: boolean;
  roomCode: string;
  socket: ChatSocket | null;
}>();

const messageInput = ref("");
const messages = ref<ChatMessage[]>([]);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  messageInput.value = target.value;
};

const appendMessage = (message: ChatMessage) => {
  messages.value.push(message);
};

const handleServerWelcome = (payload: ServerWelcomePayload) => {
  appendMessage({
    id: `welcome-${payload.id}`,
    from: "server",
    text: payload.message,
    at: new Date().toISOString(),
  });
};

const handleChatMessage = (payload: ChatMessagePayload) => {
  appendMessage({
    id: `${payload.from}-${payload.at}`,
    from: payload.from,
    text: payload.text,
    at: payload.at,
  });
};

const detachSocketListeners = (socket: ChatSocket | null | undefined) => {
  socket?.off(SocketEvent.ServerWelcome, handleServerWelcome);
  socket?.off(SocketEvent.ChatMessage, handleChatMessage);
};

watch(
  () => props.socket,
  (nextSocket, previousSocket) => {
    detachSocketListeners(previousSocket);

    nextSocket?.on(SocketEvent.ServerWelcome, handleServerWelcome);
    nextSocket?.on(SocketEvent.ChatMessage, handleChatMessage);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  detachSocketListeners(props.socket);
});

const sendMessage = () => {
  const text = messageInput.value.trim();

  if (text === "" || !props.socket || !props.isConnected) return;

  props.socket.emit(SocketEvent.ChatMessage, text);
  messageInput.value = "";
};
</script>
