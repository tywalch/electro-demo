import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/**
 * A small confirmation popover anchored above a tab's delete button,
 * replacing the browser-native confirm dialog. Enter (focused Delete
 * button) confirms like the native dialog's default; Escape or clicking
 * anywhere outside cancels.
 *
 * Rendered through a portal with fixed positioning: the tab strip lives
 * inside an overflow-hidden grid cell, which would clip anything drawn
 * above it. The anchor rect is measured once on open — the tab strip
 * doesn't scroll — and the popover closes on resize rather than track it.
 */
function DeleteConfirmPopover({
  name,
  anchor,
  onConfirm,
  onCancel,
}: {
  name: string;
  anchor: HTMLElement;
  onConfirm(): void;
  onCancel(): void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onCancel();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", onCancel);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", onCancel);
    };
  }, [onCancel]);

  const rect = anchor.getBoundingClientRect();
  return createPortal(
    <div
      ref={containerRef}
      className="delete-popover"
      style={{
        bottom: window.innerHeight - rect.top + 8,
        // Flag right (grow toward the right edge): the leftmost tab sits
        // near the viewport edge, so growing leftward would clip off-screen.
        left: rect.left - 6,
      }}
      role="dialog"
      aria-label={`Delete ${name}?`}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <span className="delete-popover-message">
        Delete <b>{name}</b>?
      </span>
      <div className="delete-popover-actions">
        <button
          ref={confirmRef}
          type="button"
          className="delete-popover-confirm"
          onClick={onConfirm}
        >
          Delete
        </button>
        <button
          type="button"
          className="delete-popover-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
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
  /** The file whose delete confirmation popover is open, and its anchor */
  const [confirming, setConfirming] = useState<{
    name: string;
    anchor: HTMLElement;
  } | null>(null);
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
    setConfirming(null);
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
                aria-expanded={confirming?.name === file.name}
                // Keep the popover's document-level pointerdown dismissal from
                // seeing this press: it would close the popover, and the click
                // that follows would toggle it right back open.
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  const anchor = event.currentTarget;
                  setConfirming((current) =>
                    current?.name === file.name
                      ? null
                      : { name: file.name, anchor },
                  );
                }}
              >
                ×
              </button>
            ) : null}
            {confirming?.name === file.name ? (
              <DeleteConfirmPopover
                name={file.name}
                anchor={confirming.anchor}
                onConfirm={() => {
                  setConfirming(null);
                  onRemove(file.name);
                }}
                onCancel={() => setConfirming(null)}
              />
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
