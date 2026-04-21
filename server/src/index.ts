import { config } from "./config.js";
import { createRealtimeServer } from "./app.js";

const { server } = createRealtimeServer();

server.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
