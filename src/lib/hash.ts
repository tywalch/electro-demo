import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import type { PlaygroundFile } from "./types";

// Single-file hashes use the TypeScript playground's `#code/` format so that
// links shared before multi-file support (and links minted by the docs'
// "try it out" badges) continue to resolve.
const CODE_PREFIX = "#code/";
const FILES_PREFIX = "#files/";

export const DEFAULT_FILE_NAME = "index.ts";

interface FilesHashPayload {
  v: 1;
  files: PlaygroundFile[];
}

function isPlaygroundFile(value: unknown): value is PlaygroundFile {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const file = value as Partial<PlaygroundFile>;
  return typeof file.name === "string" && typeof file.content === "string";
}

export function parseHash(hash: string): PlaygroundFile[] | null {
  if (hash.startsWith(CODE_PREFIX)) {
    const content = decompressFromEncodedURIComponent(
      hash.slice(CODE_PREFIX.length),
    );
    if (typeof content === "string" && content.length > 0) {
      return [{ name: DEFAULT_FILE_NAME, content }];
    }
    return null;
  }
  if (hash.startsWith(FILES_PREFIX)) {
    try {
      const json = decompressFromEncodedURIComponent(
        hash.slice(FILES_PREFIX.length),
      );
      const payload = JSON.parse(json ?? "null") as FilesHashPayload | null;
      const files = payload?.files?.filter(isPlaygroundFile) ?? [];
      return files.length > 0 ? files : null;
    } catch (err) {
      console.error("unable to parse #files hash", err);
      return null;
    }
  }
  return null;
}

export function buildHash(files: PlaygroundFile[]): string {
  if (files.length === 1) {
    return CODE_PREFIX + compressToEncodedURIComponent(files[0].content);
  }
  const payload: FilesHashPayload = { v: 1, files };
  return FILES_PREFIX + compressToEncodedURIComponent(JSON.stringify(payload));
}

export function replaceLocationHash(hash: string) {
  const url = `${location.protocol}//${location.host}${location.pathname}${hash}`;
  if (url !== location.href) {
    window.history.replaceState({}, "", url);
  }
}
