import { prettifyError, type ZodError } from "zod";

export class NexoSchemaError extends Error {
  readonly filePath: string;

  constructor(filePath: string, message: string) {
    super(`[Nexo Schema Error] ${filePath}\n${message}`);
    this.name = "NexoSchemaError";
    this.filePath = filePath;
  }

  static fromZod(filePath: string, error: ZodError): NexoSchemaError {
    return new NexoSchemaError(filePath, prettifyError(error));
  }
}

export class ComponentNotFoundError extends Error {
  readonly componentName: string;
  readonly sourcePath: string;

  constructor(componentName: string, sourcePath: string) {
    super(
      `[Nexo Component Error] Component "${componentName}" not found at ${sourcePath}`,
    );
    this.name = "ComponentNotFoundError";
    this.componentName = componentName;
    this.sourcePath = sourcePath;
  }
}

export class ComponentMetaError extends Error {
  readonly metaPath: string;

  constructor(metaPath: string, message: string) {
    super(`[Nexo Component Meta Error] ${metaPath}\n${message}`);
    this.name = "ComponentMetaError";
    this.metaPath = metaPath;
  }

  static fromZod(metaPath: string, error: ZodError): ComponentMetaError {
    return new ComponentMetaError(metaPath, prettifyError(error));
  }
}
