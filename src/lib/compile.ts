import type { Monaco } from "@monaco-editor/react";
import type { CompiledModule } from "./runtime";
import type { PlaygroundFile } from "./types";

export function fileUri(name: string): string {
  return `file:///${name}`;
}

export async function compileFiles(
  monaco: Monaco,
  files: PlaygroundFile[],
): Promise<CompiledModule[]> {
  const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
  const uris = files.map((file) => monaco.Uri.parse(fileUri(file.name)));
  const client = await getWorker(...uris);
  const compiled: CompiledModule[] = [];
  for (const file of files) {
    const output = await client.getEmitOutput(fileUri(file.name));
    const js = output.outputFiles.find((out) => out.name.endsWith(".js"))?.text;
    const map = output.outputFiles.find((out) =>
      out.name.endsWith(".js.map"),
    )?.text;
    if (js === undefined) {
      throw new Error(`Unable to compile ${file.name}`);
    }
    compiled.push({ name: file.name, js, map });
  }
  return compiled;
}
