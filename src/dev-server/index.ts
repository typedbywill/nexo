import path from "node:path";

import { parseSchema } from "../runtime/schema-parser.js";
import { FileWatcher } from "./file-watcher.js";
import { HTTPServer } from "./http-server.js";
import type { HmrMessage } from "./hmr-handler.js";
import { WSServer } from "./ws-server.js";

export interface DevServerOptions {
  schemaPath: string;
  port?: number;
}

export interface DevServerHandle {
  port: number;
  wsPort: number;
  close: () => Promise<void>;
}

export async function startDevServer(
  options: DevServerOptions,
): Promise<DevServerHandle> {
  const schemaPath = path.resolve(options.schemaPath);
  const rootDir = path.dirname(schemaPath);
  const schema = await parseSchema(schemaPath);
  const port = options.port ?? schema.config.port ?? 3000;
  const wsPort = port + 1;

  const httpServer = new HTTPServer({
    rootDir,
    schemaPath,
    port,
    wsPort,
  });

  const wsServer = new WSServer();
  const fileWatcher = new FileWatcher();

  await httpServer.listen();
  wsServer.start(wsPort);

  fileWatcher.start({
    rootDir,
    onChange: (message: HmrMessage) => {
      wsServer.broadcast(message);
    },
  });

  const shutdown = async (): Promise<void> => {
    await fileWatcher.close();
    await wsServer.close();
    await httpServer.close();
  };

  const onSignal = (): void => {
    void shutdown().then(() => process.exit(0));
  };

  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  return {
    port,
    wsPort,
    close: shutdown,
  };
}
