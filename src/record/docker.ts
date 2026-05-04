/**
 * Docker container lifecycle management for running Claude Code in isolation.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_IMAGE = "skill-trust-runner:latest";

const DOCKERFILE_CONTENT = `FROM node:22-slim
RUN npm install -g @anthropic-ai/claude-code@latest
WORKDIR /workspace
`;

/**
 * Wrap child_process.execFile in a Promise.
 */
function exec(
  cmd: string,
  args: string[],
  opts?: { timeout?: number; maxBuffer?: number },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      {
        timeout: opts?.timeout,
        maxBuffer: opts?.maxBuffer ?? 50 * 1024 * 1024,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        const exitCode = error && "code" in error ? (error.code as number) ?? 1 : error ? 1 : 0;
        resolve({
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          exitCode,
        });
      },
    );
  });
}

export async function checkDockerAvailable(): Promise<{ ok: true } | { ok: false; message: string }> {
  const version = await exec("docker", ["--version"], { timeout: 10_000 });
  if (version.exitCode !== 0) {
    return {
      ok: false,
      message:
        "Docker is required for behavior tests but was not found. Install Docker Desktop and try again.",
    };
  }

  const info = await exec("docker", ["info"], { timeout: 10_000 });
  if (info.exitCode !== 0) {
    return {
      ok: false,
      message:
        "Docker is installed but not running. Start Docker Desktop and try again.",
    };
  }

  return { ok: true };
}

/**
 * Ensure the Docker image exists locally. If not, build it from an inline Dockerfile.
 *
 * @returns The image name to use.
 */
export async function ensureImage(opts?: { image?: string }): Promise<string> {
  const image = opts?.image ?? DEFAULT_IMAGE;

  // Check if image already exists
  const inspect = await exec("docker", ["image", "inspect", image]);
  if (inspect.exitCode === 0) {
    return image;
  }

  // Build from inline Dockerfile
  const tmpDir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR ?? "/tmp"), "skill-trust-docker-"));
  const dockerfilePath = path.join(tmpDir, "Dockerfile");
  fs.writeFileSync(dockerfilePath, DOCKERFILE_CONTENT, "utf8");

  try {
    const build = await exec("docker", ["build", "-t", image, "-f", dockerfilePath, tmpDir], {
      timeout: 5 * 60 * 1000, // 5 minutes for build
    });

    if (build.exitCode !== 0) {
      throw new Error(`Docker build failed (exit ${build.exitCode}):\n${build.stderr}`);
    }
  } finally {
    // Clean up temp Dockerfile
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return image;
}

/**
 * Run a Claude Code session inside a Docker container.
 *
 * Mounts the workspace and settings, passes env vars, and captures trace output.
 */
export async function runInContainer(config: {
  image: string;
  workspaceDir: string;
  env: Record<string, string>;
  settingsContent: string;
  prompt: string;
  timeoutMs: number;
  traceOutputPath: string;
}): Promise<{ stdout: string; stderr: string; exitCode: number; traceLines: string[] }> {
  // Create a temp directory for settings and trace output
  const tmpDir = fs.mkdtempSync(
    path.join(fs.realpathSync(process.env.TMPDIR ?? "/tmp"), "skill-trust-run-"),
  );
  const settingsDir = path.join(tmpDir, ".claude");
  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(path.join(settingsDir, "settings.json"), config.settingsContent, "utf8");

  const traceDir = path.join(tmpDir, "traces");
  fs.mkdirSync(traceDir, { recursive: true });
  const containerTracePath = "/tmp/traces/trace.jsonl";

  // Build docker run arguments
  const args: string[] = [
    "run",
    "--rm",
    // Mount workspace
    "-v", `${config.workspaceDir}:/workspace`,
    // Mount settings
    "-v", `${settingsDir}:/root/.claude`,
    // Mount trace output directory
    "-v", `${traceDir}:/tmp/traces`,
    // Working directory
    "-w", "/workspace",
  ];

  // Add environment variables
  for (const [key, value] of Object.entries(config.env)) {
    args.push("-e", `${key}=${value}`);
  }

  // Set the trace output path env so hooks know where to write
  args.push("-e", `TRACE_OUTPUT=${containerTracePath}`);

  // Image and command
  args.push(config.image);
  args.push("claude", "-p", config.prompt, "--output-format", "json");

  const result = await exec("docker", args, {
    timeout: config.timeoutMs,
  });

  // Read trace output
  const hostTracePath = path.join(traceDir, "trace.jsonl");
  let traceLines: string[] = [];
  try {
    const traceContent = fs.readFileSync(hostTracePath, "utf8");
    traceLines = traceContent.split("\n").filter((line) => line.trim() !== "");
  } catch {
    // No trace output (container may have failed before producing any)
  }

  // Clean up temp directory
  fs.rmSync(tmpDir, { recursive: true, force: true });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    traceLines,
  };
}
