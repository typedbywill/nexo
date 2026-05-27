import { WebSocketServer, type WebSocket } from "ws";

import type { HmrMessage } from "./hmr-handler.js";

export class WSServer {
  private server: WebSocketServer | null = null;
  private readonly clients = new Set<WebSocket>();

  start(port: number): void {
    this.server = new WebSocketServer({ port });

    this.server.on("connection", (socket) => {
      this.clients.add(socket);
      socket.on("close", () => {
        this.clients.delete(socket);
      });
    });
  }

  broadcast(message: HmrMessage): void {
    const payload = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  }

  async close(): Promise<void> {
    for (const client of this.clients) {
      client.close();
    }

    this.clients.clear();

    await new Promise<void>((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    this.server = null;
  }
}
