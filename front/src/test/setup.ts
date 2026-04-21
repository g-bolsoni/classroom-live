import { afterEach } from "vitest";

afterEach(() => {
  window.history.replaceState({}, "", "http://localhost:3000/");
});
