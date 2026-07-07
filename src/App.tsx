import { useCallback, useEffect, useRef, useState } from "react";
import type { Monaco } from "@monaco-editor/react";
import { Display } from "./components/Display";
import { Editor } from "./components/Editor";
import { FileTabs } from "./components/FileTabs";
import { GithubCorner } from "./components/GithubCorner";
import { compileFiles } from "./lib/compile";
import { nextFileName, normalizeFileName } from "./lib/files";
import { buildHash, DEFAULT_FILE_NAME, parseHash, replaceLocationHash } from "./lib/hash";
import { initialCode } from "./lib/initialCode";
import { runProgram } from "./lib/runtime";
import type { OutputItem, PlaygroundFile } from "./lib/types";

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

  const monacoRef = useRef<Monaco | null>(null);
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
    (monaco: Monaco) => {
      monacoRef.current = monaco;
      void run();
    },
    [run],
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

  const handleAdd = useCallback(() => {
    const current = filesRef.current;
    const suggestion = nextFileName(current);
    const input = window.prompt("New file name", suggestion);
    if (input === null) {
      return;
    }
    const result = normalizeFileName(input, current);
    if ("error" in result) {
      window.alert(result.error);
      return;
    }
    setFiles([...current, { name: result.name, content: "" }]);
    setActiveFile(result.name);
    scheduleRun();
  }, [scheduleRun]);

  const handleRename = useCallback(
    (name: string) => {
      const current = filesRef.current;
      const input = window.prompt("Rename file", name);
      if (input === null || input === name) {
        return;
      }
      const result = normalizeFileName(input, current, name);
      if ("error" in result) {
        window.alert(result.error);
        return;
      }
      setFiles(
        current.map((file) =>
          file.name === name ? { ...file, name: result.name } : file,
        ),
      );
      setActiveFile((active) => (active === name ? result.name : active));
      scheduleRun();
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
            onChange={handleChange}
            onReady={handleReady}
          />
        </div>
      </div>
      <div className="display">
        <Display items={output} />
      </div>
      <footer>
        <h4>
          <a href="http://tinkertamper.com">© tinkertamper.com</a>
        </h4>
      </footer>
    </div>
  );
}
