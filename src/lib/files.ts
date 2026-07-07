import type { PlaygroundFile } from "./types";

const VALID_NAME = /^[A-Za-z0-9_\-./]+$/;

export function normalizeFileName(
  input: string,
  files: PlaygroundFile[],
  currentName?: string,
): { name: string } | { error: string } {
  let name = input.trim();
  if (name.length === 0) {
    return { error: "File name cannot be empty" };
  }
  if (!VALID_NAME.test(name)) {
    return {
      error:
        "File names may only contain letters, numbers, dashes, underscores, dots, and slashes",
    };
  }
  if (!name.endsWith(".ts") && !name.endsWith(".tsx")) {
    name = `${name}.ts`;
  }
  const taken = files.some(
    (file) => file.name === name && file.name !== currentName,
  );
  if (taken) {
    return { error: `A file named "${name}" already exists` };
  }
  return { name };
}

export function nextFileName(files: PlaygroundFile[]): string {
  let index = files.length + 1;
  let name = `file${index}.ts`;
  while (files.some((file) => file.name === name)) {
    index += 1;
    name = `file${index}.ts`;
  }
  return name;
}
