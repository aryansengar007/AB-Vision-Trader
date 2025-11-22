import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve(process.cwd(), "tmp");
const LOG_FILE = path.join(LOG_DIR, "train.log");

let proc: ChildProcessWithoutNullStreams | null = null;

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function isTraining() {
  return proc !== null;
}

export function getLogs(): string {
  try {
    ensureLogDir();
    if (!fs.existsSync(LOG_FILE)) return "";
    return fs.readFileSync(LOG_FILE, "utf8");
  } catch (e) {
    return `Error reading logs: ${e}`;
  }
}

export function stopTraining(): boolean {
  if (!proc) return false;
  try {
    proc.kill();
    proc = null;
    return true;
  } catch (e) {
    return false;
  }
}

export function startTraining(options: { episodes?: number; maxSteps?: number; windowSize?: number } = {}) {
  if (proc) throw new Error("Training process already running");

  ensureLogDir();
  // Clear existing log
  try {
    fs.writeFileSync(LOG_FILE, "");
  } catch (e) {
    // ignore
  }

  // Use virtual environment Python if it exists, otherwise fall back to system Python
  const venvPython = path.resolve(process.cwd(), ".venv", "Scripts", "python.exe");
  const pythonBin = fs.existsSync(venvPython) ? venvPython : (process.env.PYTHON_BIN || "python");
  // training script path: assume repo root contains dqn_trading_top5.py
  const scriptPath = path.resolve(process.cwd(), "dqn_trading_top5.py");

  const env = { ...process.env };
  if (options.episodes) env.MAX_EPISODES = String(options.episodes);
  if (options.maxSteps) env.MAX_STEPS_PER_EPISODE = String(options.maxSteps);

  proc = spawn(pythonBin, [scriptPath], { env });

  const outStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

  proc.stdout.on("data", (chunk) => {
    const s = chunk.toString();
    outStream.write(s);
  });

  proc.stderr.on("data", (chunk) => {
    const s = chunk.toString();
    outStream.write(s);
  });

  proc.on("close", (code) => {
    outStream.write(`\nProcess exited with code ${code}\n`);
    proc = null;
    outStream.end();
  });

  return { started: true, pid: proc.pid };
}
