import { useEffect, useRef, useState } from "react";
import type { PlaygroundFile } from "../lib/types";

export interface FileTabsProps {
  files: PlaygroundFile[];
  activeFile: string;
  onSelect(name: string): void;
  /** Creates a new untitled file and returns its (unique) name */
  onAdd(): string;
  /** Attempts a rename; returns an error message when the name is rejected */
  onRename(name: string, nextName: string): string | null;
  onRemove(name: string): void;
}

interface EditingState {
  /** The current name of the file being renamed */
  name: string;
  value: string;
  error: string | null;
}

export function FileTabs({
  files,
  activeFile,
  onSelect,
  onAdd,
  onRename,
  onRemove,
}: FileTabsProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const editingName = editing?.name;

  // Select the whole name when an edit session starts so typing replaces it.
  useEffect(() => {
    if (editingName !== undefined) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingName]);

  const beginEdit = (name: string) => {
    setEditing({ name, value: name, error: null });
  };

  const commitEdit = (): boolean => {
    if (!editing) {
      return true;
    }
    if (editing.value.trim() === editing.name) {
      setEditing(null);
      return true;
    }
    const error = onRename(editing.name, editing.value);
    if (error === null) {
      setEditing(null);
      return true;
    }
    setEditing({ ...editing, error });
    return false;
  };

  const handleAdd = () => {
    const name = onAdd();
    setEditing({ name, value: name, error: null });
  };

  return (
    <div className="file-tabs" role="tablist">
      {files.map((file, index) => {
        const isActive = file.name === activeFile;
        const isEntry = index === 0;
        const isEditing = editing?.name === file.name;
        return (
          <div
            key={file.name}
            role="tab"
            aria-selected={isActive}
            className={`file-tab${isActive ? " active" : ""}`}
            title={
              isEditing
                ? undefined
                : isEntry
                  ? `${file.name} — entry point; other files run when imported. Double-click to rename.`
                  : `${file.name} — double-click to rename`
            }
            onClick={() => onSelect(file.name)}
            onDoubleClick={() => {
              if (!isEditing) {
                beginEdit(file.name);
              }
            }}
          >
            {isEntry ? <span className="entry-marker">▶</span> : null}
            {isEditing ? (
              <input
                ref={inputRef}
                className={`file-name-input${editing.error ? " invalid" : ""}`}
                value={editing.value}
                size={Math.max(editing.value.length, 4)}
                spellCheck={false}
                aria-label={`Rename ${file.name}`}
                aria-invalid={editing.error !== null}
                title={editing.error ?? undefined}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    value: event.target.value,
                    error: null,
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitEdit();
                  } else if (event.key === "Escape") {
                    setEditing(null);
                  }
                }}
                onBlur={() => {
                  // If the name is rejected on blur, drop the edit rather
                  // than trapping focus; the file keeps its previous name.
                  if (!commitEdit()) {
                    setEditing(null);
                  }
                }}
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
              />
            ) : (
              <span className="file-name">{file.name}</span>
            )}
            {files.length > 1 && !isEditing ? (
              <button
                type="button"
                className="close-file"
                aria-label={`Delete ${file.name}`}
                title={`Delete ${file.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(file.name);
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        className="add-file"
        title="Add a new file"
        aria-label="Add a new file"
        onClick={handleAdd}
      >
        +
      </button>
    </div>
  );
}
