export interface PlaygroundFile {
  name: string;
  content: string;
}

/** The source position (1-based) of the call that generated a params block */
export interface QueryOrigin {
  file: string;
  line: number;
  column: number;
}

export type OutputItem =
  | { kind: "params"; label: string | null; json: string; origin?: QueryOrigin }
  | { kind: "message"; type: "info" | "error"; text: string };

export interface PlaygroundListener {
  onParams(event: {
    label: string | null;
    params: unknown;
    cache?: boolean;
    stack?: string;
  }): void;
  onMessage(event: { type: "info" | "error"; html: string; text: string }): void;
  onClear(): void;
}

export interface ElectroDBPlayground {
  Entity: unknown;
  Service: unknown;
  createSchema: unknown;
  createCustomAttribute: unknown;
  CustomAttributeType: unknown;
  configure(listener: Partial<PlaygroundListener>): () => void;
  clearScreen(): void;
  printMessage(type: string, message: string): void;
}

declare global {
  interface Window {
    ElectroDB?: ElectroDBPlayground;
    electroParams?: unknown[];
  }
}
