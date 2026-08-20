import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "mlquant-benchmark";
export const inject = ["tools"];

const DEFAULT_COMMAND = [
  "scripts/benchmark_tensor_factors.py",
  "--device",
  "cpu",
  "--n-dates",
  "750",
  "--n-stocks",
  "1000",
  "--window",
  "20",
  "--repeat",
  "10",
  "--warmup",
  "3",
  "--threads",
  "1",
  "--interop-threads",
  "1",
  "--seed",
  "42",
];

const DEFAULT_JSON_OUT = "artifacts/benchmark-v1.json";
const MAX_CAPTURE_CHARS = 12000;

function resolveRepoPath(repoPath) {
  return path.resolve(repoPath ?? process.cwd());
}

function resolveArtifactPath(repoPath, jsonPath) {
  const value = jsonPath ?? DEFAULT_JSON_OUT;
  return path.isAbsolute(value) ? value : path.join(repoPath, value);
}

function redactSensitive(text) {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/([A-Z0-9_]*API[_-]?KEY\s*[:=]\s*)[^\s"'`]+/gi, "$1[redacted]")
    .replace(/(token\s*[:=]\s*)[^\s"'`]+/gi, "$1[redacted]");
}

function boundText(text) {
  const redacted = redactSensitive(text);
  if (redacted.length <= MAX_CAPTURE_CHARS) return redacted;
  return `${redacted.slice(0, MAX_CAPTURE_CHARS)}\n[truncated]`;
}

function formatSeconds(value) {
  if (value < 1e-3) return `${(value * 1e6).toFixed(1)} us`;
  if (value < 1) return `${(value * 1e3).toFixed(1)} ms`;
  return `${value.toFixed(3)} s`;
}

function markdownCell(value) {
  return String(value ?? "-").replaceAll("|", "\\|");
}

function resultRows(results) {
  return results.map((row) => (
    `| ${markdownCell(row.device)} | \`${markdownCell(row.case)}\` | ${markdownCell(formatSeconds(row.mean_seconds))} | ${markdownCell(formatSeconds(row.std_seconds))} | ${markdownCell(row.peak_cuda_memory)} |`
  ));
}

function resultTable(results) {
  return [
    "| Device | Case | Mean | Std | Peak CUDA memory |",
    "| --- | --- | ---: | ---: | ---: |",
    ...resultRows(results),
  ].join("\n");
}

function environmentBlock(environment) {
  return [
    `OS: ${environment.platform ?? "-"}`,
    `CPU: ${environment.cpu ?? "-"}`,
    `GPU: ${environment.cuda_device ?? "-"}`,
    `Python: ${environment.python ?? "-"}`,
    `PyTorch: ${environment.pytorch ?? "-"}`,
    `CUDA available: ${environment.cuda_available ?? "-"}`,
    `Protocol: ${environment.protocol ?? "-"}`,
    `Synthetic panel: ${environment.n_dates ?? "-"} dates x ${environment.n_stocks ?? "-"} stocks`,
    `Warmup / repeat: ${environment.warmup ?? "-"} / ${environment.repeat ?? "-"}`,
    `Seed: ${environment.seed ?? "-"}`,
    `PyTorch threads: ${environment.pytorch_threads ?? "-"}`,
    `PyTorch interop threads: ${environment.pytorch_interop_threads ?? "-"}`,
  ].join("\n");
}

function summarizeBenchmarkJson(payload, jsonPath) {
  const environment = payload.environment ?? {};
  const results = Array.isArray(payload.results) ? payload.results : [];
  const unstable = results
    .filter((row) => (
      typeof row.mean_seconds === "number"
      && typeof row.std_seconds === "number"
      && row.mean_seconds > 0
      && row.std_seconds / row.mean_seconds >= 0.25
    ))
    .map((row) => `${row.case}: std/mean ${(row.std_seconds / row.mean_seconds).toFixed(2)}`);
  return {
    schemaVersion: payload.schema_version ?? null,
    jsonPath,
    environment,
    results,
    resultTable: resultTable(results),
    warnings: unstable,
  };
}

async function readBenchmarkJsonFile(jsonPath) {
  const text = await readFile(jsonPath, "utf8");
  return summarizeBenchmarkJson(JSON.parse(text), jsonPath);
}

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      windowsHide: true,
    });
    const abort = () => {
      child.kill();
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      options.signal?.removeEventListener("abort", abort);
      resolve({
        exitCode,
        signal,
        elapsedMs: Date.now() - started,
        stdout: boundText(stdout),
        stderr: boundText(stderr),
      });
    });
  });
}

async function gitCommit(repoPath, signal) {
  const result = await runProcess("git", ["rev-parse", "HEAD"], { cwd: repoPath, signal });
  if (result.exitCode !== 0) return "";
  return result.stdout.trim();
}

function benchmarkCommand(jsonOut) {
  return [...DEFAULT_COMMAND, "--json-out", jsonOut];
}

function issueBodyFromSummary(summary, options) {
  const command = options.command ?? `python ${benchmarkCommand(options.artifactPath ?? DEFAULT_JSON_OUT).join(" ")}`;
  const warnings = summary.warnings.length > 0 ? summary.warnings.join("\n") : "None noted by the JSON summarizer.";
  const artifactPath = options.artifactPath ?? summary.jsonPath;
  const commit = options.commit || "<commit>";
  const harnessVersion = options.harnessVersion || "<dsh version or source>";
  const prompt = options.agentPrompt || [
    "Read AGENTS.md, docs/benchmarking.md, and docs/reality_check.md.",
    "Run the protocol v1 CPU benchmark exactly as documented.",
    "Return commit SHA, command, environment, raw table, JSON path, and caveats.",
  ].join(" ");
  const transcript = options.transcriptSummary || "DeepSeek Harness was used as a reproducibility assistant to read the repository guidance, run the fixed benchmark command, and preserve the artifact path.";
  const caveats = options.caveats || [
    "Engineering throughput benchmark only.",
    "Not a trading-performance result.",
    "Do not compare as a controlled hardware ranking unless environments are controlled.",
  ].join("\n");

  return [
    "## DeepSeek Harness benchmark report",
    "",
    `Repository: initial-d/ml-quant-trading`,
    `Commit: ${commit}`,
    `DeepSeek Harness: ${harnessVersion}`,
    "",
    "### Agent prompt",
    "",
    "```text",
    prompt,
    "```",
    "",
    "### Command",
    "",
    "```bash",
    command,
    "```",
    "",
    "### Environment",
    "",
    "```text",
    environmentBlock(summary.environment),
    "```",
    "",
    "### Result table",
    "",
    summary.resultTable,
    "",
    "### JSON report",
    "",
    `Artifact: \`${artifactPath}\``,
    "",
    "Attach the JSON file to the issue, or paste it into the template field if attachments are unavailable.",
    "",
    "### Agent transcript or summary",
    "",
    transcript,
    "",
    "### Caveats",
    "",
    caveats,
    "",
    "### Variance warnings",
    "",
    warnings,
  ].join("\n");
}

export function apply(ctx, config = {}) {
  const defaultPython = config.python ?? "python";
  const defaultRepoPath = config.repoPath;

  ctx.tools.register(defineTool({
    name: "mlquant_benchmark_v1_cpu",
    description: "Run the ml-quant-trading protocol v1 CPU benchmark and write its JSON artifact. This is an engineering reproducibility benchmark, not a trading result.",
    parameters: {
      repoPath: { type: "string", description: "Path to an ml-quant-trading checkout. Defaults to the current workspace." },
      python: { type: "string", description: "Python executable. Defaults to the plugin config or python." },
      jsonOut: { type: "string", description: "Artifact path relative to repoPath. Defaults to artifacts/benchmark-v1.json." },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          command: { type: "array", required: true, items: { type: "string" } },
          cwd: { type: "string", required: true },
          jsonPath: { type: "string", required: true },
          exitCode: { type: "integer", required: true },
          elapsedMs: { type: "integer", required: true },
          stdout: { type: "string", required: true },
          stderr: { type: "string", required: true },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text: [
          `Command: ${value.command.join(" ")}`,
          `JSON artifact: ${value.jsonPath}`,
          `Elapsed: ${value.elapsedMs} ms`,
          value.stdout,
          value.stderr ? `stderr:\n${value.stderr}` : "",
        ].filter(Boolean).join("\n\n"),
      }],
    },
    async execute(args, exec) {
      const repoPath = resolveRepoPath(args.repoPath ?? defaultRepoPath);
      const jsonOut = args.jsonOut ?? DEFAULT_JSON_OUT;
      const jsonPath = resolveArtifactPath(repoPath, jsonOut);
      const python = args.python ?? defaultPython;
      const commandArgs = benchmarkCommand(jsonOut);
      const result = await runProcess(python, commandArgs, { cwd: repoPath, signal: exec.signal });
      if (result.exitCode !== 0) {
        throw new Error(`Benchmark command failed with exit code ${result.exitCode}.\n${result.stderr || result.stdout}`);
      }
      return {
        command: [python, ...commandArgs],
        cwd: repoPath,
        jsonPath,
        exitCode: result.exitCode ?? 0,
        elapsedMs: result.elapsedMs,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: "mlquant_read_benchmark_json",
    description: "Read and summarize an ml-quant-trading benchmark JSON artifact.",
    parameters: {
      repoPath: { type: "string", description: "Path to an ml-quant-trading checkout. Defaults to the current workspace." },
      jsonPath: { type: "string", description: "Artifact path relative to repoPath or absolute path. Defaults to artifacts/benchmark-v1.json." },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          schemaVersion: { type: "json", required: true },
          jsonPath: { type: "string", required: true },
          environment: { type: "json", required: true },
          results: { type: "array", required: true, items: { type: "json" } },
          resultTable: { type: "string", required: true },
          warnings: { type: "array", required: true, items: { type: "string" } },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text: [
          `JSON artifact: ${value.jsonPath}`,
          value.resultTable,
          value.warnings.length > 0 ? `Variance warnings:\n${value.warnings.join("\n")}` : "",
        ].filter(Boolean).join("\n\n"),
      }],
    },
    async execute(args) {
      const repoPath = resolveRepoPath(args.repoPath ?? defaultRepoPath);
      const jsonPath = resolveArtifactPath(repoPath, args.jsonPath);
      return readBenchmarkJsonFile(jsonPath);
    },
  }));

  ctx.tools.register(defineTool({
    name: "mlquant_draft_github_issue",
    description: "Draft a DeepSeek Harness benchmark issue body from an ml-quant-trading benchmark JSON artifact. This tool does not post to GitHub.",
    parameters: {
      repoPath: { type: "string", description: "Path to an ml-quant-trading checkout. Defaults to the current workspace." },
      jsonPath: { type: "string", description: "Artifact path relative to repoPath or absolute path. Defaults to artifacts/benchmark-v1.json." },
      artifactPath: { type: "string", description: "Public artifact path to mention in the issue body." },
      commit: { type: "string", description: "Commit SHA. Defaults to git rev-parse HEAD when available." },
      harnessVersion: { type: "string", description: "DeepSeek Harness version or source checkout." },
      agentPrompt: { type: "string", description: "Prompt used for the DSH run." },
      transcriptSummary: { type: "string", description: "Short transcript summary." },
      caveats: { type: "string", description: "Known warnings, instability, or limitations." },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", required: true },
          body: { type: "string", required: true },
          jsonPath: { type: "string", required: true },
          warnings: { type: "array", required: true, items: { type: "string" } },
        },
      },
      render: (_args, value) => [{ type: "text", text: value.body }],
    },
    async execute(args, exec) {
      const repoPath = resolveRepoPath(args.repoPath ?? defaultRepoPath);
      const jsonPath = resolveArtifactPath(repoPath, args.jsonPath);
      const summary = await readBenchmarkJsonFile(jsonPath);
      const commit = args.commit ?? await gitCommit(repoPath, exec.signal);
      const body = issueBodyFromSummary(summary, {
        artifactPath: args.artifactPath ?? args.jsonPath ?? DEFAULT_JSON_OUT,
        commit,
        harnessVersion: args.harnessVersion,
        agentPrompt: args.agentPrompt,
        transcriptSummary: args.transcriptSummary,
        caveats: args.caveats,
      });
      return {
        title: "[dsh-benchmark] protocol v1 CPU benchmark",
        body,
        jsonPath,
        warnings: summary.warnings,
      };
    },
  }));
}
