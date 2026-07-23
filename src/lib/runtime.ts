import { originalPosition, parseSourceMap } from "./sourceMap";
import type { OutputItem, QueryOrigin } from "./types";

export interface CompiledModule {
  /** The editor file name, e.g. "entity.ts" */
  name: string;
  /** The CommonJS output emitted by the TypeScript worker */
  js: string;
  /** The V3 source map for `js`, when emitted */
  map?: string;
}

const EMPTY_MESSAGE =
  "Write Entity or Service queries in the left pane to see generated params appear here!";

// Executed modules are tagged with this scheme via //# sourceURL so stack
// frames from user code are recognizable and carry the editor file name.
const SOURCE_URL_SCHEME = "playground:///";
const STACK_FRAME_PATTERN = /playground:\/\/\/([^\s:)]+):(\d+):(\d+)/;

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function resolveRequest(
  from: string,
  request: string,
  moduleNames: Set<string>,
): string {
  if (request === "electrodb") {
    return request;
  }
  if (!request.startsWith(".")) {
    throw new Error(
      `Cannot find module '${request}'. Only "electrodb" and files created in the editor can be imported.`,
    );
  }
  const base = normalizePath(`${dirname(from)}/${request}`);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];
  const resolved = candidates.find((candidate) => moduleNames.has(candidate));
  if (resolved === undefined) {
    throw new Error(
      `Cannot find module '${request}' imported from '${from}'. Add a file named "${base}.ts" to the editor to import it.`,
    );
  }
  return resolved;
}

function getElectroDBModule(): Record<string, unknown> {
  const playground = window.ElectroDB;
  if (!playground) {
    throw new Error("The ElectroDB playground bundle failed to load.");
  }
  return {
    Entity: playground.Entity,
    Service: playground.Service,
    createSchema: playground.createSchema,
    createCustomAttribute: playground.createCustomAttribute,
    CustomAttributeType: playground.CustomAttributeType,
  };
}

function moduleBody(module: CompiledModule): string {
  // The emitted sourceMappingURL comment points at a file that does not
  // exist; strip it and tag the code so stack frames name the editor file.
  const cleaned = module.js.replace(/^\/\/# sourceMappingURL=.*$/gm, "");
  return `${cleaned}\n//# sourceURL=${SOURCE_URL_SCHEME}${module.name}`;
}

/**
 * Measures how many lines the engine's `new Function` wrapper prepends to
 * the function body, so stack-frame line numbers can be mapped back to
 * compiled-module lines. (V8 prepends two lines; measured for portability.)
 */
function measureFunctionLineOffset(): number {
  try {
    const probe = new Function(
      `return new Error("probe").stack;\n//# sourceURL=${SOURCE_URL_SCHEME}__probe__`,
    );
    const stack = String(probe());
    const match = stack.match(/playground:\/\/\/__probe__:(\d+)/);
    if (match) {
      return parseInt(match[1], 10) - 1;
    }
  } catch {
    // fall through to the V8 default
  }
  return 2;
}

function createOriginResolver(
  modules: CompiledModule[],
): (stack?: string) => QueryOrigin | undefined {
  const baseOffset = measureFunctionLineOffset();
  const maps = new Map(
    modules.map((module) => [
      module.name,
      module.map ? parseSourceMap(module.map) : null,
    ]),
  );
  return (stack) => {
    if (!stack) {
      return undefined;
    }
    const match = stack.match(STACK_FRAME_PATTERN);
    if (!match) {
      return undefined;
    }
    const [, file, lineText, columnText] = match;
    if (!maps.has(file)) {
      return undefined;
    }
    // Every module body gains one extra line from its async wrapper.
    const offset = baseOffset + 1;
    const jsLine = parseInt(lineText, 10) - offset;
    const jsColumn = parseInt(columnText, 10);
    if (jsLine < 1) {
      return undefined;
    }
    const mappings = maps.get(file);
    if (mappings) {
      const position = originalPosition(mappings, jsLine, jsColumn);
      if (position) {
        return { file, line: position.line, column: position.column };
      }
    }
    return { file, line: jsLine, column: jsColumn };
  };
}

interface ModuleRecord {
  exports: Record<string, unknown>;
}

const REQUIRE_PATTERN = /\brequire\((["'])([^"'\n]+)\1\)/g;

/** Static require() specifiers in a module's emitted CommonJS body */
function scanRequires(js: string): string[] {
  const specifiers = new Set<string>();
  for (const match of js.matchAll(REQUIRE_PATTERN)) {
    specifiers.add(match[2]);
  }
  return [...specifiers];
}

/**
 * Links and executes the compiled editor files as CommonJS modules. The first
 * file is the program entry point; the remaining files only execute when
 * imported (directly or transitively) from it.
 *
 * Every module body runs inside an async wrapper so top-level await works in
 * any file. Because `require()` is synchronous, modules are pre-executed in
 * dependency order (statically scanned from the emitted `require()` calls)
 * and awaited before their dependents run, so imports always observe
 * fully-resolved exports. A module that awaits nothing completes its body
 * synchronously, which keeps the on-demand `require()` fallback correct for
 * anything the static scan cannot see.
 */
export async function executeProgram(modules: CompiledModule[]): Promise<unknown> {
  const byName = new Map(modules.map((module) => [module.name, module]));
  const moduleNames = new Set(byName.keys());
  const cache = new Map<string, ModuleRecord>();
  const entry = modules[0];

  function createFactory(file: CompiledModule): Function {
    return new Function(
      "require",
      "module",
      "exports",
      `return (async () => {\n${moduleBody(file)}\n})();`,
    );
  }

  function requireModule(name: string): unknown {
    if (name === "electrodb") {
      return getElectroDBModule();
    }
    const cached = cache.get(name);
    if (cached) {
      return cached.exports;
    }
    const file = byName.get(name);
    if (!file) {
      throw new Error(`Cannot find module '${name}'`);
    }
    const record: ModuleRecord = { exports: {} };
    cache.set(name, record);
    const localRequire = (request: string) =>
      requireModule(resolveRequest(name, request, moduleNames));
    createFactory(file)(localRequire, record, record.exports);
    return record.exports;
  }

  async function executeModule(
    name: string,
    executing: Set<string>,
  ): Promise<unknown> {
    if (cache.has(name) || executing.has(name)) {
      return undefined;
    }
    const file = byName.get(name);
    if (!file) {
      return undefined;
    }
    executing.add(name);
    for (const request of scanRequires(file.js)) {
      if (request === "electrodb") {
        continue;
      }
      let resolved: string;
      try {
        resolved = resolveRequest(name, request, moduleNames);
      } catch {
        // Unresolvable specifier (or a stray require() in a string or
        // comment): leave it for the module's own require() call to report.
        continue;
      }
      await executeModule(resolved, executing);
    }
    executing.delete(name);
    if (cache.has(name)) {
      // A dependency cycle sync-executed this module while it was pending.
      return undefined;
    }
    const record: ModuleRecord = { exports: {} };
    cache.set(name, record);
    const localRequire = (request: string) =>
      requireModule(resolveRequest(name, request, moduleNames));
    return createFactory(file)(localRequire, record, record.exports);
  }

  return executeModule(entry.name, new Set());
}

/**
 * Runs the program while capturing playground output (generated parameters
 * and info/error messages) through the headless listener installed on the
 * vendored ElectroDB playground bundle. Params entries are annotated with
 * the source position of the call that produced them when it can be
 * resolved from the captured stack.
 */
export async function runProgram(modules: CompiledModule[]): Promise<OutputItem[]> {
  const playground = window.ElectroDB;
  if (!playground) {
    return [
      {
        kind: "message",
        type: "error",
        text: "The ElectroDB playground bundle failed to load. Try refreshing the page.",
      },
    ];
  }
  const resolveOrigin = createOriginResolver(modules);
  let items: OutputItem[] = [];
  const restore = playground.configure({
    onParams: ({ label, params, stack }) => {
      items.push({
        kind: "params",
        label: label ?? null,
        json: JSON.stringify(params, null, 4),
        origin: resolveOrigin(stack),
      });
    },
    onMessage: ({ type, text }) => {
      items.push({ kind: "message", type, text });
    },
    onClear: () => {
      items = [];
    },
  });
  try {
    playground.clearScreen();
    await executeProgram(modules);
    // Un-awaited `.go()` calls settle in microtasks; give them a beat to
    // flush their output (e.g. transaction params) before detaching.
    await new Promise((resolve) => setTimeout(resolve, 10));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    playground.printMessage("error", message);
  } finally {
    restore();
  }
  if (items.length === 0) {
    items.push({
      kind: "message",
      type: "info",
      text: EMPTY_MESSAGE,
    });
  }
  return items;
}
