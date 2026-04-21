import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import Chat from "./Chat.vue";
import { SocketEvent } from "../enums/socket";
import { MockSocket } from "../test/socketIoMock";

describe("Chat", () => {
  it("shows connection status changes", async () => {
    const socket = new MockSocket();
    const wrapper = mount(Chat, {
      props: {
        currentDisplayName: "Ana",
        isConnected: false,
        roomCode: "ROOM1",
        socket,
      },
    });

    expect(wrapper.text()).toContain("Status: desconectado");

    await wrapper.setProps({ isConnected: true });
    await nextTick();
    expect(wrapper.text()).toContain("Status: conectado");

    await wrapper.setProps({ isConnected: false });
    await nextTick();
    expect(wrapper.text()).toContain("Status: desconectado");
  });

  it("appends welcome and chat messages from the server", async () => {
    const socket = new MockSocket();
    const wrapper = mount(Chat, {
      props: {
        currentDisplayName: "Ana",
        isConnected: true,
        roomCode: "ROOM1",
        socket,
      },
    });

    socket.trigger(SocketEvent.ServerWelcome, {
      id: "socket-1",
      message: "Welcome to the server!",
    });
    socket.trigger(SocketEvent.ChatMessage, {
      from: "Ana",
      text: "Hello class",
      at: "2026-04-21T10:00:00.000Z",
    });
    await nextTick();

    expect(wrapper.text()).toContain("server:");
    expect(wrapper.text()).toContain("Welcome to the server!");
    expect(wrapper.text()).toContain("Ana:");
    expect(wrapper.text()).toContain("Hello class");
    expect(wrapper.findAll(".message")[1]?.classes()).toContain("items-end");
  });

  it("emits chat messages only when connected and with non-empty text", async () => {
    const socket = new MockSocket();
    const wrapper = mount(Chat, {
      props: {
        currentDisplayName: "Ana",
        isConnected: false,
        roomCode: "ROOM1",
        socket,
      },
    });
    const input = wrapper.get("input");
    const button = wrapper.get("button");

    await input.setValue("   ");
    await button.trigger("click");
    expect(socket.emit).not.toHaveBeenCalledWith(SocketEvent.ChatMessage, "");

    await wrapper.setProps({ isConnected: true });

    await input.setValue("  hello world  ");
    await button.trigger("click");

    expect(socket.emit).toHaveBeenCalledWith(
      SocketEvent.ChatMessage,
      "hello world",
    );
    expect((input.element as HTMLInputElement).value).toBe("");
  });

  it("removes socket listeners when the component unmounts", () => {
    const socket = new MockSocket();
    const wrapper = mount(Chat, {
      props: {
        currentDisplayName: "Ana",
        isConnected: true,
        roomCode: "ROOM1",
        socket,
      },
    });

    wrapper.unmount();

    expect(socket.off).toHaveBeenCalled();
  });
});
