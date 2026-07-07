import { useEffect, useRef } from "react";
import MonacoEditor, { type Monaco, type OnMount } from "@monaco-editor/react";
import electrodbTypes from "../assets/electrodb.d.ts?raw";
import { fileUri } from "../lib/compile";
import { ELECTRODB_THEME_NAME, electrodbTheme } from "../lib/monacoTheme";
import type { PlaygroundFile } from "../lib/types";

export interface EditorProps {
  files: PlaygroundFile[];
  activeFile: string;
  onChange(name: string, content: string): void;
  onReady(monaco: Monaco): void;
}

// Every editor file gets its own monaco model so the TypeScript language
// service can resolve imports between them; models are the source of truth
// for content once the editor has mounted.
function syncModels(monaco: Monaco, files: PlaygroundFile[]) {
  const keep = new Set(files.map((file) => fileUri(file.name)));
  for (const model of monaco.editor.getModels()) {
    const uri = model.uri.toString();
    if (
      uri.startsWith("file:///") &&
      !uri.includes("node_modules") &&
      !keep.has(uri)
    ) {
      model.dispose();
    }
  }
  for (const file of files) {
    const uri = monaco.Uri.parse(fileUri(file.name));
    const model = monaco.editor.getModel(uri);
    if (!model) {
      monaco.editor.createModel(file.content, "typescript", uri);
    } else if (model.getValue() !== file.content) {
      // On rename the editor wrapper can create an empty model at the new
      // path before this sync runs; restore the file's content from state.
      model.setValue(file.content);
    }
  }
}

export function Editor({ files, activeFile, onChange, onReady }: EditorProps) {
  const monacoRef = useRef<Monaco | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => {
    if (monacoRef.current) {
      syncModels(monacoRef.current, files);
    }
  }, [files]);

  const handleBeforeMount = (monaco: Monaco) => {
    monaco.editor.defineTheme(ELECTRODB_THEME_NAME, electrodbTheme);
    const ts = monaco.languages.typescript;
    // Without eager sync the TypeScript worker only knows about models that
    // have been attached to an editor, so imports of files whose tabs were
    // never opened report "Cannot find module".
    ts.typescriptDefaults.setEagerModelSync(true);
    ts.typescriptDefaults.setCompilerOptions({
      strict: true,
      noImplicitAny: true,
      esModuleInterop: true,
      allowNonTsExtensions: true,
      target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    });
    ts.typescriptDefaults.addExtraLib(
      electrodbTypes,
      "file:///node_modules/electrodb/index.d.ts",
    );
    syncModels(monaco, filesRef.current);
  };

  const handleMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;
    syncModels(monaco, filesRef.current);
    editor.focus();
    onReady(monaco);
  };

  return (
    <MonacoEditor
      theme={ELECTRODB_THEME_NAME}
      path={fileUri(activeFile)}
      defaultLanguage="typescript"
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      onChange={(value) => onChange(activeFile, value ?? "")}
      options={{
        fontSize: 14,
        fontFamily: "JetBrains Mono, monospace",
        automaticLayout: true,
        scrollBeyondLastLine: false,
      }}
    />
  );
}
