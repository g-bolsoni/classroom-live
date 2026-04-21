import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import HelloWorld from "./HelloWorld.vue";

describe("HelloWorld", () => {
  it("renders the starter content and increments the counter", async () => {
    const wrapper = mount(HelloWorld);
    const button = wrapper.get("button.counter");

    expect(wrapper.text()).toContain("Explore Vite");
    expect(button.text()).toContain("Count is 0");

    await button.trigger("click");

    expect(button.text()).toContain("Count is 1");
  });
});
