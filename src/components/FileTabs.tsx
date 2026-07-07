import type { PlaygroundFile } from "../lib/types";

export interface FileTabsProps {
  files: PlaygroundFile[];
  activeFile: string;
  onSelect(name: string): void;
  onAdd(): void;
  onRename(name: string): void;
  onRemove(name: string): void;
}

export function FileTabs({
  files,
  activeFile,
  onSelect,
  onAdd,
  onRename,
  onRemove,
}: FileTabsProps) {
  return (
    <div className="file-tabs" role="tablist">
      {files.map((file, index) => {
        const isActive = file.name === activeFile;
        const isEntry = index === 0;
        return (
          <div
            key={file.name}
            role="tab"
            aria-selected={isActive}
            className={`file-tab${isActive ? " active" : ""}`}
            title={
              isEntry
                ? `${file.name} — entry point; other files run when imported. Double-click to rename.`
                : `${file.name} — double-click to rename`
            }
            onClick={() => onSelect(file.name)}
            onDoubleClick={() => onRename(file.name)}
          >
            {isEntry ? <span className="entry-marker">▶</span> : null}
            <span className="file-name">{file.name}</span>
            {files.length > 1 ? (
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
        onClick={onAdd}
      >
        +
      </button>
    </div>
  );
}
