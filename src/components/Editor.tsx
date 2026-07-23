import { useCallback, useEffect, useRef } from "react";
import MonacoEditor, { type Monaco, type OnMount } from "@monaco-editor/react";
import electrodbTypes from "../assets/electrodb.d.ts?raw";
import { fileUri } from "../lib/compile";
import { ELECTRODB_THEME_NAME, electrodbTheme } from "../lib/monacoTheme";
import type { PlaygroundFile } from "../lib/types";

/** A line in an editor file that produced a params block in the output */
export interface QueryMarker {
  file: string;
  line: number;
  /** Index of the corresponding item in the output list */
  itemIndex: number;
}

export interface EditorProps {
  files: PlaygroundFile[];
  activeFile: string;
  queryMarkers: QueryMarker[];
  onChange(name: string, content: string): void;
  onReady(monaco: Monaco, editor: Parameters<OnMount>[0]): void;
  onRevealParams(itemIndex: number): void;
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

export function Editor({
  files,
  activeFile,
  queryMarkers,
  onChange,
  onReady,
  onRevealParams,
}: EditorProps) {
  const monacoRef = useRef<Monaco | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const markersRef = useRef(queryMarkers);
  markersRef.current = queryMarkers;
  const activeFileRef = useRef(activeFile);
  activeFileRef.current = activeFile;
  const onRevealParamsRef = useRef(onRevealParams);
  onRevealParamsRef.current = onRevealParams;
  const decorationIdsRef = useRef(new Map<string, string[]>());

  const applyQueryDecorations = useCallback(() => {
    const monaco = monacoRef.current;
    if (!monaco) {
      return;
    }
    const byFile = new Map<string, QueryMarker[]>();
    for (const marker of markersRef.current) {
      const markers = byFile.get(marker.file) ?? [];
      // One glyph per line; clicking navigates to the first params block.
      if (!markers.some((existing) => existing.line === marker.line)) {
        markers.push(marker);
      }
      byFile.set(marker.file, markers);
    }
    for (const model of monaco.editor.getModels()) {
      const uri = model.uri.toString();
      if (!uri.startsWith("file:///") || uri.includes("node_modules")) {
        continue;
      }
      const name = model.uri.path.replace(/^\//, "");
      const markers = byFile.get(name) ?? [];
      const previous = decorationIdsRef.current.get(uri) ?? [];
      const ids = model.deltaDecorations(
        previous,
        markers
          .filter((marker) => marker.line <= model.getLineCount())
          .map((marker) => ({
            range: new monaco.Range(marker.line, 1, marker.line, 1),
            options: {
              glyphMarginClassName: "query-glyph",
              glyphMarginHoverMessage: {
                value: "Show the generated parameters for this query",
              },
              stickiness:
                monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
          })),
      );
      decorationIdsRef.current.set(uri, ids);
    }
  }, []);

  useEffect(() => {
    if (monacoRef.current) {
      syncModels(monacoRef.current, files);
      applyQueryDecorations();
    }
  }, [files, applyQueryDecorations]);

  useEffect(() => {
    applyQueryDecorations();
  }, [queryMarkers, applyQueryDecorations]);

  const handleBeforeMount = (monaco: Monaco) => {
    monaco.editor.defineTheme(ELECTRODB_THEME_NAME, electrodbTheme);
    const ts = monaco.languages.typescript;
    // Without eager sync the TypeScript worker only knows about models that
    // have been attached to an editor, so imports of files whose tabs were
    // never opened report "Cannot find module".
    ts.typescriptDefaults.setEagerModelSync(true);
    // The runtime executes every module body inside an async wrapper, so
    // top-level await works in any editor file despite the CommonJS module
    // setting. Suppress the language-service errors that would forbid it:
    // 1375 ("'await' ... only allowed at the top level of a module") and
    // 1378 ("top-level 'await' ... requires module es2022/esnext/...").
    ts.typescriptDefaults.setDiagnosticsOptions({
      diagnosticCodesToIgnore: [1375, 1378],
    });
    ts.typescriptDefaults.setCompilerOptions({
      strict: true,
      noImplicitAny: true,
      esModuleInterop: true,
      allowNonTsExtensions: true,
      sourceMap: true,
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
    applyQueryDecorations();
    editor.onMouseDown((event) => {
      if (
        event.target.type ===
          monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        event.target.position
      ) {
        const line = event.target.position.lineNumber;
        const marker = markersRef.current.find(
          (candidate) =>
            candidate.file === activeFileRef.current && candidate.line === line,
        );
        if (marker) {
          onRevealParamsRef.current(marker.itemIndex);
        }
      }
    });
    editor.focus();
    onReady(monaco, editor);
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
        glyphMargin: true,
      }}
    />
  );
}
