import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import mime from "mime-types";

import { generateDevHtml } from "../exporter/build.js";
import { normalizeRoutePath } from "../exporter/route-mapper.js";
import { parseSchema } from "../runtime/schema-parser.js";

export interface HTTPServerOptions {
  rootDir: string;
  schemaPath: string;
  port: number;
  wsPort: number;
}

export class HTTPServer {
  private server = createServer((req, res) => {
    void this.handleRequest(req, res);
  });

  constructor(private readonly options: HTTPServerOptions) {}

  listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.options.port, () => {
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const url = new URL(req.url ?? "/", `http://localhost`);
      const pathname = decodeURIComponent(url.pathname);
      const filePath = path.join(this.options.rootDir, pathname);

      const fileStats = await stat(filePath).catch(() => null);

      if (fileStats?.isFile()) {
        const content = await readFile(filePath);
        const contentType = mime.lookup(filePath) || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
        return;
      }

      const schema = await parseSchema(this.options.schemaPath);
      const route = normalizeRoutePath(pathname);

      if (schema.pages[route]) {
        const html = await generateDevHtml(
          route,
          this.options.schemaPath,
          true,
          this.options.wsPort,
        );

        if (html) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
          return;
        }
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(error instanceof Error ? error.message : "Internal Server Error");
    }
  }
}
