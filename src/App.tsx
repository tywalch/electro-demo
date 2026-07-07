import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Monaco, OnMount } from "@monaco-editor/react";
import { Display, type DisplayFocus } from "./components/Display";
import { Editor, type QueryMarker } from "./components/Editor";
import { FileTabs } from "./components/FileTabs";
import { GithubCorner } from "./components/GithubCorner";
import { compileFiles } from "./lib/compile";
import { nextUntitledName, normalizeFileName } from "./lib/files";
import { buildHash, DEFAULT_FILE_NAME, parseHash, replaceLocationHash } from "./lib/hash";
import { initialCode } from "./lib/initialCode";
import { runProgram } from "./lib/runtime";
import type { OutputItem, PlaygroundFile, QueryOrigin } from "./lib/types";

type CodeEditor = Parameters<OnMount>[0];

const RUN_DEBOUNCE_MS = 900;

const initialFiles: PlaygroundFile[] = parseHash(location.hash) ?? [
  { name: DEFAULT_FILE_NAME, content: initialCode },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function App() {
  const [files, setFiles] = useState<PlaygroundFile[]>(initialFiles);
  const [activeFile, setActiveFile] = useState(initialFiles[0].name);
  const [output, setOutput] = useState<OutputItem[]>([
    { kind: "message", type: "info", html: "<h3>Loading the editor…</h3>" },
  ]);

  const [paramsFocus, setParamsFocus] = useState<DisplayFocus | null>(null);

  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<CodeEditor | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const runIdRef = useRef(0);
  const timerRef = useRef<number>();

  const run = useCallback(async () => {
    const monaco = monacoRef.current;
    if (!monaco) {
      return;
    }
    const runId = ++runIdRef.current;
    const snapshot = filesRef.current;
    try {
      const compiled = await compileFiles(monaco, snapshot);
      if (runId !== runIdRef.current) {
        return;
      }
      replaceLocationHash(buildHash(snapshot));
      const items = await runProgram(compiled);
      if (runId !== runIdRef.current) {
        return;
      }
      setOutput(items);
    } catch (err) {
      if (runId !== runIdRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setOutput([
        {
          kind: "message",
          type: "error",
          html: `<h3>${escapeHtml(message)}</h3>`,
        },
      ]);
    }
  }, []);

  const scheduleRun = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(run, RUN_DEBOUNCE_MS);
  }, [run]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handleReady = useCallback(
    (monaco: Monaco, editor: CodeEditor) => {
      monacoRef.current = monaco;
      editorRef.current = editor;
      void run();
    },
    [run],
  );

  // A glyph icon in the editor gutter was clicked: scroll the matching
  // params block into view on the right.
  const handleRevealParams = useCallback((index: number) => {
    setParamsFocus((previous) => ({
      index,
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }, []);

  // The icon on a params block was clicked: focus the query that created it.
  const handleRevealSource = useCallback((origin: QueryOrigin) => {
    setActiveFile(origin.file);
    // Allow the tab switch to swap the editor model before revealing.
    window.setTimeout(() => {
      const monaco = monacoRef.current;
      const editor = editorRef.current;
      if (!monaco || !editor) {
        return;
      }
      editor.revealLineInCenter(origin.line);
      editor.setPosition({ lineNumber: origin.line, column: origin.column });
      editor.focus();
      const model = editor.getModel();
      if (model && origin.line <= model.getLineCount()) {
        const ids = model.deltaDecorations(
          [],
          [
            {
              range: new monaco.Range(origin.line, 1, origin.line, 1),
              options: { isWholeLine: true, className: "query-line-flash" },
            },
          ],
        );
        window.setTimeout(() => model.deltaDecorations(ids, []), 1600);
      }
    }, 80);
  }, []);

  const queryMarkers = useMemo<QueryMarker[]>(
    () =>
      output.flatMap((item, index) =>
        item.kind === "params" && item.origin
          ? [
              {
                file: item.origin.file,
                line: item.origin.line,
                itemIndex: index,
              },
            ]
          : [],
      ),
    [output],
  );

  const handleChange = useCallback(
    (name: string, content: string) => {
      setFiles((current) =>
        current.map((file) => (file.name === name ? { ...file, content } : file)),
      );
      scheduleRun();
    },
    [scheduleRun],
  );

  const handleAdd = useCallback((): string => {
    const current = filesRef.current;
    const name = nextUntitledName(current);
    setFiles([...current, { name, content: "" }]);
    setActiveFile(name);
    scheduleRun();
    return name;
  }, [scheduleRun]);

  const handleRename = useCallback(
    (name: string, nextName: string): string | null => {
      const current = filesRef.current;
      const result = normalizeFileName(nextName, current, name);
      if ("error" in result) {
        return result.error;
      }
      if (result.name !== name) {
        setFiles(
          current.map((file) =>
            file.name === name ? { ...file, name: result.name } : file,
          ),
        );
        setActiveFile((active) => (active === name ? result.name : active));
        scheduleRun();
      }
      return null;
    },
    [scheduleRun],
  );

  const handleRemove = useCallback(
    (name: string) => {
      const current = filesRef.current;
      if (current.length <= 1) {
        return;
      }
      if (!window.confirm(`Delete ${name}?`)) {
        return;
      }
      const remaining = current.filter((file) => file.name !== name);
      setFiles(remaining);
      setActiveFile((active) => (active === name ? remaining[0].name : active));
      scheduleRun();
    },
    [scheduleRun],
  );

  return (
    <div className="container">
      <GithubCorner />
      <div className="gap"></div>
      <div className="header">
        <img src="/assets/logo.png" alt="ElectroDB" />
      </div>
      <div className="code">
        <FileTabs
          files={files}
          activeFile={activeFile}
          onSelect={setActiveFile}
          onAdd={handleAdd}
          onRename={handleRename}
          onRemove={handleRemove}
        />
        <div className="editor-pane">
          <Editor
            files={files}
            activeFile={activeFile}
            queryMarkers={queryMarkers}
            onChange={handleChange}
            onReady={handleReady}
            onRevealParams={handleRevealParams}
          />
        </div>
      </div>
      <div className="display">
        <Display
          items={output}
          focus={paramsFocus}
          onRevealSource={handleRevealSource}
        />
      </div>
      <footer>
        <h4>
          <a href="http://tinkertamper.com">© tinkertamper.com</a>
        </h4>
      </footer>
    </div>
  );
}
