export interface PlaygroundFile {
  name: string;
  content: string;
}

export type OutputItem =
  | { kind: "params"; label: string | null; json: string }
  | { kind: "message"; type: "info" | "error"; html: string };

export interface PlaygroundListener {
  onParams(event: { label: string | null; params: unknown; cache?: boolean }): void;
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
