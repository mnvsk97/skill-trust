/**
 * Normalize raw JSONL hook output into a structured Trace object.
 */

import type { Trace, TraceEvent } from "../types.js";

interface RawTraceEvent {
  type?: string;
  name?: string;
  ts?: string;
  data?: Record<string, unknown>;
}

/**
 * Parse JSONL lines from hook output and produce a normalized Trace.
 *
 * Each line is parsed as JSON, assigned a sequential event ID (e1, e2, ...),
 * and marked with source="native" and confidence="high".
 */
export function normalizeTrace(
  lines: string[],
  runId: string,
  testId: string,
  agent?: string,
  model?: string,
): Trace {
  const events: TraceEvent[] = [];
  let index = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let raw: RawTraceEvent;
    try {
      raw = JSON.parse(trimmed) as RawTraceEvent;
    } catch {
      // Skip malformed lines
      continue;
    }

    index++;
    const event: TraceEvent = {
      id: `e${index}`,
      type: raw.type ?? "unknown",
      name: raw.name ?? "unknown",
      ts: raw.ts ?? new Date().toISOString(),
      source: "native",
      confidence: "high",
      data: raw.data,
    };

    events.push(event);
  }

  const startedAt = events.length > 0 ? events[0].ts : undefined;
  const endedAt = events.length > 0 ? events[events.length - 1].ts : undefined;

  let durationMs: number | undefined;
  if (startedAt && endedAt) {
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    if (!isNaN(start) && !isNaN(end)) {
      durationMs = end - start;
    }
  }

  return {
    version: "0.1",
    run_id: runId,
    agent,
    model,
    started_at: startedAt,
    ended_at: endedAt,
    duration_ms: durationMs,
    metadata: { test_id: testId },
    events,
  };
}
