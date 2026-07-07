// Minimal V3 source map decoder — just enough to map a generated (line,
// column) back to the original TypeScript position for a single-source map.

const BASE64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** For each generated line, segments of [genColumn, origLine, origColumn] (0-based) */
export type ParsedMappings = number[][][];

function decodeVlq(segment: string): number[] {
  const values: number[] = [];
  let shift = 0;
  let value = 0;
  for (const char of segment) {
    let digit = BASE64.indexOf(char);
    if (digit === -1) {
      return values;
    }
    const continues = digit & 32;
    digit &= 31;
    value += digit << shift;
    if (continues) {
      shift += 5;
    } else {
      const negate = value & 1;
      value >>>= 1;
      values.push(negate ? -value : value);
      value = 0;
      shift = 0;
    }
  }
  return values;
}

export function parseSourceMap(json: string): ParsedMappings | null {
  try {
    const map = JSON.parse(json) as { mappings?: string };
    if (typeof map.mappings !== "string") {
      return null;
    }
    let origLine = 0;
    let origColumn = 0;
    return map.mappings.split(";").map((line) => {
      let genColumn = 0;
      const segments: number[][] = [];
      if (line.length === 0) {
        return segments;
      }
      for (const segment of line.split(",")) {
        const decoded = decodeVlq(segment);
        if (decoded.length === 0) {
          continue;
        }
        genColumn += decoded[0];
        if (decoded.length >= 4) {
          origLine += decoded[2];
          origColumn += decoded[3];
          segments.push([genColumn, origLine, origColumn]);
        }
      }
      return segments;
    });
  } catch {
    return null;
  }
}

/**
 * Maps a 1-based generated position to its 1-based original position using
 * the segment at or immediately before the generated column.
 */
export function originalPosition(
  mappings: ParsedMappings,
  generatedLine: number,
  generatedColumn: number,
): { line: number; column: number } | null {
  const segments = mappings[generatedLine - 1];
  if (!segments || segments.length === 0) {
    return null;
  }
  let best = segments[0];
  for (const segment of segments) {
    if (segment[0] <= generatedColumn - 1) {
      best = segment;
    } else {
      break;
    }
  }
  return { line: best[1] + 1, column: best[2] + 1 };
}
