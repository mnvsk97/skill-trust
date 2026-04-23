/**
 * Generate Claude Code settings.json with hooks that capture execution traces.
 *
 * Each hook writes a JSONL line to the given trace output path.
 */

/**
 * Returns a Claude Code settings.json object with PreToolUse, PostToolUse,
 * and Stop hooks that capture trace events as JSONL lines.
 */
export function generateHooksConfig(traceOutputPath: string): object {
  const escapedPath = traceOutputPath.replace(/'/g, "'\\''");

  // PreToolUse: capture tool.attempted events
  const preToolUseCmd = [
    `bash -c '`,
    `input=$(cat); `,
    `tool_name=$(echo "$input" | sed -n "s/.*\\"tool_name\\"[[:space:]]*:[[:space:]]*\\"\\([^\\"]*\\)\\".*/\\1/p"); `,
    `ts=$(date -u +%Y-%m-%dT%H:%M:%S.000Z); `,
    `echo "{\\"type\\":\\"tool.attempted\\",\\"name\\":\\"$tool_name\\",\\"ts\\":\\"$ts\\",\\"data\\":{}}" >> '${escapedPath}'`,
    `'`,
  ].join("");

  // PostToolUse: capture tool.succeeded + derived events (command.executed, file.created, file.modified)
  const postToolUseCmd = [
    `bash -c '`,
    `input=$(cat); `,
    `tool_name=$(echo "$input" | sed -n "s/.*\\"tool_name\\"[[:space:]]*:[[:space:]]*\\"\\([^\\"]*\\)\\".*/\\1/p"); `,
    `ts=$(date -u +%Y-%m-%dT%H:%M:%S.000Z); `,
    `echo "{\\"type\\":\\"tool.succeeded\\",\\"name\\":\\"$tool_name\\",\\"ts\\":\\"$ts\\",\\"data\\":{}}" >> '${escapedPath}'; `,
    `if [ "$tool_name" = "Bash" ]; then `,
    `  cmd=$(echo "$input" | sed -n "s/.*\\"command\\"[[:space:]]*:[[:space:]]*\\"\\([^\\"]*\\)\\".*/\\1/p"); `,
    `  echo "{\\"type\\":\\"command.executed\\",\\"name\\":\\"Bash\\",\\"ts\\":\\"$ts\\",\\"data\\":{\\"command\\":\\"$cmd\\"}}" >> '${escapedPath}'; `,
    `fi; `,
    `if [ "$tool_name" = "Write" ]; then `,
    `  file_path=$(echo "$input" | sed -n "s/.*\\"file_path\\"[[:space:]]*:[[:space:]]*\\"\\([^\\"]*\\)\\".*/\\1/p"); `,
    `  echo "{\\"type\\":\\"file.created\\",\\"name\\":\\"Write\\",\\"ts\\":\\"$ts\\",\\"data\\":{\\"file_path\\":\\"$file_path\\"}}" >> '${escapedPath}'; `,
    `fi; `,
    `if [ "$tool_name" = "Edit" ]; then `,
    `  file_path=$(echo "$input" | sed -n "s/.*\\"file_path\\"[[:space:]]*:[[:space:]]*\\"\\([^\\"]*\\)\\".*/\\1/p"); `,
    `  echo "{\\"type\\":\\"file.modified\\",\\"name\\":\\"Edit\\",\\"ts\\":\\"$ts\\",\\"data\\":{\\"file_path\\":\\"$file_path\\"}}" >> '${escapedPath}'; `,
    `fi`,
    `'`,
  ].join("");

  // Stop: capture outcome event
  const stopCmd = [
    `bash -c '`,
    `input=$(cat); `,
    `ts=$(date -u +%Y-%m-%dT%H:%M:%S.000Z); `,
    `echo "{\\"type\\":\\"outcome\\",\\"name\\":\\"stop\\",\\"ts\\":\\"$ts\\",\\"data\\":{}}" >> '${escapedPath}'`,
    `'`,
  ].join("");

  return {
    hooks: {
      PreToolUse: [
        {
          matcher: ".*",
          hooks: [{ type: "command", command: preToolUseCmd }],
        },
      ],
      PostToolUse: [
        {
          matcher: ".*",
          hooks: [{ type: "command", command: postToolUseCmd }],
        },
      ],
      Stop: [
        {
          matcher: "",
          hooks: [{ type: "command", command: stopCmd }],
        },
      ],
    },
  };
}
