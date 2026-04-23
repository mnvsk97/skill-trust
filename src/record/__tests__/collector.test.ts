import { normalizeTrace } from "../collector.js";

describe("normalizeTrace", () => {
  const runId = "run-test-1";
  const testId = "test-1";

  test("assigns sequential event IDs", () => {
    const lines = [
      '{"type":"tool.attempted","name":"Bash","ts":"2025-01-01T00:00:00.000Z","data":{}}',
      '{"type":"tool.succeeded","name":"Bash","ts":"2025-01-01T00:00:01.000Z","data":{}}',
      '{"type":"outcome","name":"stop","ts":"2025-01-01T00:00:02.000Z","data":{}}',
    ];

    const trace = normalizeTrace(lines, runId, testId);

    expect(trace.events).toHaveLength(3);
    expect(trace.events[0].id).toBe("e1");
    expect(trace.events[1].id).toBe("e2");
    expect(trace.events[2].id).toBe("e3");
  });

  test("sets source and confidence on all events", () => {
    const lines = [
      '{"type":"tool.attempted","name":"Read","ts":"2025-01-01T00:00:00.000Z","data":{}}',
    ];

    const trace = normalizeTrace(lines, runId, testId);

    expect(trace.events[0].source).toBe("native");
    expect(trace.events[0].confidence).toBe("high");
  });

  test("Bash tool produces command.executed event", () => {
    const lines = [
      '{"type":"tool.attempted","name":"Bash","ts":"2025-01-01T00:00:00.000Z","data":{}}',
      '{"type":"tool.succeeded","name":"Bash","ts":"2025-01-01T00:00:01.000Z","data":{}}',
      '{"type":"command.executed","name":"Bash","ts":"2025-01-01T00:00:01.000Z","data":{"command":"ls -la"}}',
    ];

    const trace = normalizeTrace(lines, runId, testId);

    const cmdEvent = trace.events.find((e) => e.type === "command.executed");
    expect(cmdEvent).toBeDefined();
    expect(cmdEvent!.name).toBe("Bash");
    expect(cmdEvent!.data?.command).toBe("ls -la");
  });

  test("Write tool produces file.created event", () => {
    const lines = [
      '{"type":"tool.attempted","name":"Write","ts":"2025-01-01T00:00:00.000Z","data":{}}',
      '{"type":"tool.succeeded","name":"Write","ts":"2025-01-01T00:00:01.000Z","data":{}}',
      '{"type":"file.created","name":"Write","ts":"2025-01-01T00:00:01.000Z","data":{"file_path":"/workspace/test.txt"}}',
    ];

    const trace = normalizeTrace(lines, runId, testId);

    const fileEvent = trace.events.find((e) => e.type === "file.created");
    expect(fileEvent).toBeDefined();
    expect(fileEvent!.name).toBe("Write");
    expect(fileEvent!.data?.file_path).toBe("/workspace/test.txt");
  });

  test("Edit tool produces file.modified event", () => {
    const lines = [
      '{"type":"tool.attempted","name":"Edit","ts":"2025-01-01T00:00:00.000Z","data":{}}',
      '{"type":"tool.succeeded","name":"Edit","ts":"2025-01-01T00:00:01.000Z","data":{}}',
      '{"type":"file.modified","name":"Edit","ts":"2025-01-01T00:00:01.000Z","data":{"file_path":"/workspace/config.json"}}',
    ];

    const trace = normalizeTrace(lines, runId, testId);

    const fileEvent = trace.events.find((e) => e.type === "file.modified");
    expect(fileEvent).toBeDefined();
    expect(fileEvent!.name).toBe("Edit");
    expect(fileEvent!.data?.file_path).toBe("/workspace/config.json");
  });

  test("builds correct trace envelope", () => {
    const lines = [
      '{"type":"tool.attempted","name":"Bash","ts":"2025-01-01T00:00:00.000Z","data":{}}',
      '{"type":"outcome","name":"stop","ts":"2025-01-01T00:00:05.000Z","data":{}}',
    ];

    const trace = normalizeTrace(lines, runId, testId, "claude-code", "claude-sonnet-4-20250514");

    expect(trace.version).toBe("0.1");
    expect(trace.run_id).toBe(runId);
    expect(trace.agent).toBe("claude-code");
    expect(trace.model).toBe("claude-sonnet-4-20250514");
    expect(trace.started_at).toBe("2025-01-01T00:00:00.000Z");
    expect(trace.ended_at).toBe("2025-01-01T00:00:05.000Z");
    expect(trace.duration_ms).toBe(5000);
    expect(trace.metadata).toEqual({ test_id: testId });
  });

  test("skips empty and malformed lines", () => {
    const lines = [
      "",
      "   ",
      "not json at all",
      '{"type":"tool.attempted","name":"Read","ts":"2025-01-01T00:00:00.000Z","data":{}}',
      "{broken json",
    ];

    const trace = normalizeTrace(lines, runId, testId);

    expect(trace.events).toHaveLength(1);
    expect(trace.events[0].id).toBe("e1");
    expect(trace.events[0].type).toBe("tool.attempted");
  });

  test("handles empty input", () => {
    const trace = normalizeTrace([], runId, testId);

    expect(trace.events).toHaveLength(0);
    expect(trace.version).toBe("0.1");
    expect(trace.run_id).toBe(runId);
    expect(trace.started_at).toBeUndefined();
    expect(trace.ended_at).toBeUndefined();
    expect(trace.duration_ms).toBeUndefined();
  });

  test("handles missing optional fields in event JSON", () => {
    const lines = [
      '{"type":"tool.attempted"}',
    ];

    const trace = normalizeTrace(lines, runId, testId);

    expect(trace.events).toHaveLength(1);
    expect(trace.events[0].type).toBe("tool.attempted");
    expect(trace.events[0].name).toBe("unknown");
    expect(trace.events[0].source).toBe("native");
  });
});
