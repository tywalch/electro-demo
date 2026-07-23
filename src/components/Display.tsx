import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import type { OutputItem, QueryOrigin } from "../lib/types";

/**
 * Labels arrive from the playground bundle as HTML strings with a fixed
 * vocabulary: an <h2> wrapper around text with <b> emphasis (see
 * formatParamLabel in the vendored bundle). Rebuild that structure as React
 * elements; anything outside the vocabulary renders as literal text.
 */
function parseLabel(label: string): ReactNode[] {
  const match = label.match(/^\s*<h2>([\s\S]*)<\/h2>\s*$/);
  const inner = match ? match[1] : label;
  // Capturing split: even indexes are plain text, odd indexes were <b>-wrapped
  return inner
    .split(/<b>([\s\S]*?)<\/b>/g)
    .map((segment, index) =>
      index % 2 === 1 ? <b key={index}>{segment}</b> : segment,
    );
}

/** Renders a Prism token stream as React elements (in place of Prism.highlight) */
function renderToken(token: string | Prism.Token, key: number): ReactNode {
  if (typeof token === "string") {
    return token;
  }
  const aliases = Array.isArray(token.alias)
    ? token.alias
    : token.alias
      ? [token.alias]
      : [];
  const { content } = token;
  return (
    <span key={key} className={["token", token.type, ...aliases].join(" ")}>
      {Array.isArray(content) ? content.map(renderToken) : renderToken(content, 0)}
    </span>
  );
}

/** A request to scroll a params block into view; nonce retriggers repeats */
export interface DisplayFocus {
  index: number;
  nonce: number;
}

function RevealSourceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ParamsBlock({
  label,
  json,
  origin,
  onRevealSource,
}: {
  label: string | null;
  json: string;
  origin?: QueryOrigin;
  onRevealSource(origin: QueryOrigin): void;
}) {
  const tokens = useMemo(
    () => Prism.tokenize(json, Prism.languages.json),
    [json],
  );
  return (
    <>
      <hr />
      <div className="output-item-header">
        {origin ? (
          <button
            type="button"
            className="reveal-source"
            title={`Show the query in ${origin.file}:${origin.line}`}
            aria-label={`Show the query in ${origin.file}, line ${origin.line}`}
            onClick={() => onRevealSource(origin)}
          >
            <RevealSourceIcon />
          </button>
        ) : null}
        {label ? (
          <div className="output-item-label">
            <h2>{parseLabel(label)}</h2>
          </div>
        ) : null}
      </div>
      <pre className="language-json">
        <code className="language-json">{tokens.map(renderToken)}</code>
      </pre>
    </>
  );
}

/** The marker electrodb embeds in error messages ahead of a docs link */
const ERROR_REFERENCE_MARKER = "- For more detail on this error reference:";

function MessageBlock({ type, text }: { type: "info" | "error"; text: string }) {
  const markerIndex = text.indexOf(ERROR_REFERENCE_MARKER);
  let body: ReactNode;
  if (markerIndex === -1) {
    body = <h3>{text}</h3>;
  } else {
    // Mirror the formatting the playground bundle applied to these errors:
    // the description, then the docs link on its own line.
    const description = text.slice(0, markerIndex).trim();
    const link = text.slice(markerIndex + ERROR_REFERENCE_MARKER.length).trim();
    body = (
      <>
        <h3>{description}</h3>
        <br />
        <h3>
          For more detail on this error reference{" "}
          {/^https?:\/\//.test(link) ? (
            <a href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </a>
          ) : (
            link
          )}
        </h3>
      </>
    );
  }
  return (
    <>
      <hr />
      {type === "error" ? <h2>Query Error</h2> : null}
      <div className={`${type} message`}>{body}</div>
    </>
  );
}

export interface DisplayProps {
  items: OutputItem[];
  focus: DisplayFocus | null;
  onRevealSource(origin: QueryOrigin): void;
}

export function Display({ items, focus, onRevealSource }: DisplayProps) {
  const itemRefs = useRef(new Map<number, HTMLDivElement>());
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!focus) {
      return;
    }
    const element = itemRefs.current.get(focus.index);
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlashIndex(focus.index);
    const timer = window.setTimeout(() => setFlashIndex(null), 1600);
    return () => window.clearTimeout(timer);
  }, [focus]);

  return (
    <div className="display-wrapper">
      {items.map((item, index) => (
        <div
          key={index}
          className={`output-item${flashIndex === index ? " focused" : ""}`}
          ref={(element) => {
            if (element) {
              itemRefs.current.set(index, element);
            } else {
              itemRefs.current.delete(index);
            }
          }}
        >
          {item.kind === "params" ? (
            <ParamsBlock
              label={item.label}
              json={item.json}
              origin={item.origin}
              onRevealSource={onRevealSource}
            />
          ) : (
            <MessageBlock type={item.type} text={item.text} />
          )}
        </div>
      ))}
    </div>
  );
}
