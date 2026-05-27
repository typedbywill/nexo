import chokidar, { type FSWatcher } from "chokidar";

import { clearComponentCache } from "../runtime/component-resolver.js";
import { resolveHmrMessage, type HmrMessage } from "./hmr-handler.js";

export interface FileWatcherOptions {
  rootDir: string;
  onChange: (message: HmrMessage, filePath: string) => void;
  debounceMs?: number;
  usePolling?: boolean;
}

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingPath: string | null = null;

  start(options: FileWatcherOptions): void {
    const schemaPath = `${options.rootDir}/schema.json`;
    const componentsGlob = `${options.rootDir}/components/**/*`;

    this.watcher = chokidar.watch([schemaPath, componentsGlob], {
      ignoreInitial: true,
      usePolling: options.usePolling ?? false,
    });

    const schedule = (filePath: string): void => {
      this.pendingPath = filePath;

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        if (!this.pendingPath) {
          return;
        }

        const path = this.pendingPath;
        this.pendingPath = null;
        const message = resolveHmrMessage(path, options.rootDir);

        if (message.type === "component-reload") {
          clearComponentCache();
        }

        options.onChange(message, path);
      }, options.debounceMs ?? 100);
    };

    this.watcher.on("change", schedule);
    this.watcher.on("add", schedule);
  }

  async close(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    await this.watcher?.close();
    this.watcher = null;
  }
}
