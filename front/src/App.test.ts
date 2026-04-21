import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import App from "./App.vue";
import { SocketEvent } from "./enums/socket";
import { getLastSocket, resetSocketMocks } from "./test/socketIoMock";

vi.mock("socket.io-client", async () => {
  const module = await import("./test/socketIoMock");
  return { io: module.createSocket };
});

describe("App", () => {
  beforeEach(() => {
    resetSocketMocks();
    window.history.replaceState({}, "", "http://localhost:3000/");
  });

  afterEach(() => {
    resetSocketMocks();
  });

  it("emits room creation with the participant name", async () => {
    const wrapper = mount(App);
    const socket = getLastSocket();
    const nameInput = wrapper.get("input#displayName");
    const submitButton = wrapper.get("button#primaryActionButton");

    socket.trigger(SocketEvent.Connect);
    await nameInput.setValue("Ana");
    await submitButton.trigger("click");

    expect(socket.emit).toHaveBeenCalledWith(SocketEvent.CreateRoom, {
      displayName: "Ana",
    });
  });

  it("updates the UI when the server confirms room creation", async () => {
    const wrapper = mount(App);
    const socket = getLastSocket();

    socket.trigger(SocketEvent.CreateRoom, { roomCode: "ROOM1" });
    socket.trigger(SocketEvent.RoomParticipants, [
      {
        socketId: "teacher-1",
        displayName: "Ana",
        role: "teacher",
      },
    ]);
    await nextTick();

    expect(wrapper.text()).toContain("Sala atual: ROOM1");
    expect(wrapper.text()).toContain("Papel na sala: teacher");
    expect(wrapper.text()).toContain("Ana");
    expect(wrapper.text()).toContain("1 online");
    expect(wrapper.html()).toContain("http://localhost:3000/ROOM1");
  });

  it("opens the join flow when there is a room code in the URL", async () => {
    window.location.pathname = "/ROOM2";
    const wrapper = mount(App);
    await nextTick();

    expect(wrapper.text()).toContain("Informe seu nome e o código da sala");
    expect(
      (wrapper.get("input#roomId").element as HTMLInputElement).value,
    ).toBe("ROOM2");
  });

  it("navigates and emits join with the participant name", async () => {
    const wrapper = mount(App);
    const socket = getLastSocket();

    await wrapper.get("button#joinModeButton").trigger("click");
    socket.trigger(SocketEvent.Connect);

    const nameInput = wrapper.get("input#displayName");
    const roomInput = wrapper.get("input#roomId");
    const submitButton = wrapper.get("button#primaryActionButton");

    await nameInput.setValue("Joao");
    await roomInput.setValue(" ROOM3 ");
    await submitButton.trigger("click");

    expect(socket.emit).toHaveBeenCalledWith(SocketEvent.JoinRoom, {
      roomCode: "ROOM3",
      displayName: "Joao",
    });
  });

  it("requires a name before creating a room", async () => {
    window.location.pathname = "/";
    const wrapper = mount(App);
    const socket = getLastSocket();
    await wrapper.get("button#createModeButton").trigger("click");
    const submitButton = wrapper.get("button#primaryActionButton");

    socket.trigger(SocketEvent.Connect);
    await nextTick();
    await submitButton.trigger("click");
    await nextTick();

    expect(socket.emit).not.toHaveBeenCalledWith(
      SocketEvent.CreateRoom,
      expect.anything(),
    );
    expect(wrapper.text()).toContain("Name is required");
  });

  it("shows room errors from the server", async () => {
    const wrapper = mount(App);
    const socket = getLastSocket();

    socket.trigger(SocketEvent.RoomError, { message: "Room not found" });
    await nextTick();

    expect(wrapper.text()).toContain("Room not found");
  });

  it("shows presence updates for participants joining and leaving", async () => {
    const wrapper = mount(App);
    const socket = getLastSocket();

    socket.trigger(SocketEvent.CreateRoom, { roomCode: "ROOM5" });
    socket.trigger(SocketEvent.ParticipantJoined, {
      socketId: "student-1",
      displayName: "Bruna",
      role: "student",
    });
    await nextTick();

    expect(wrapper.text()).toContain("Bruna entrou na sala");

    socket.trigger(SocketEvent.ParticipantLeft, {
      socketId: "student-1",
      displayName: "Bruna",
      role: "student",
    });
    await nextTick();

    expect(wrapper.text()).toContain("Bruna saiu da sala");
  });

  it("reacts to browser navigation changes outside a room", async () => {
    const wrapper = mount(App);

    window.location.pathname = "/ROOM4";
    window.dispatchEvent(new PopStateEvent("popstate"));
    await nextTick();

    expect(
      (wrapper.get("input#roomId").element as HTMLInputElement).value,
    ).toBe("ROOM4");
  });
});
