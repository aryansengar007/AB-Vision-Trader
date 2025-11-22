import { RequestHandler } from "express";
import { startTraining, stopTraining, getLogs, isTraining } from "../pyManager";
import fs from "fs";
import path from "path";

export const handleStocksList: RequestHandler = (_req, res) => {
  const stocks = [
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "MSFT", name: "Microsoft Corporation" },
    { symbol: "TSLA", name: "Tesla Inc." },
    { symbol: "META", name: "Meta Platforms Inc." },
  ];
  res.status(200).json(stocks);
};

export const handleStartTraining: RequestHandler = (req, res) => {
  try {
    const { windowSize, startCash, transactionCost, episodes, maxSteps } = req.body || {};
    // start a python training process with overrides
    const info = startTraining({ episodes: episodes ? Number(episodes) : undefined, maxSteps: maxSteps ? Number(maxSteps) : undefined, windowSize: windowSize ? Number(windowSize) : undefined });
    res.status(202).json({ trainingId: `train-${Date.now()}`, status: "started", info });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};

export const handleStopTraining: RequestHandler = (_req, res) => {
  const ok = stopTraining();
  res.status(200).json({ status: ok ? "stopped" : "no-process" });
};

export const handleTrainingLogs: RequestHandler = (_req, res) => {
  const logs = getLogs();
  res.status(200).json({ logs, running: isTraining() });
};

// Server-Sent Events stream for live logs
export const handleTrainingLogsStream: RequestHandler = (_req, res) => {
  const logPath = path.resolve(process.cwd(), "tmp", "train.log");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Send existing logs initially
  try {
    if (fs.existsSync(logPath)) {
      const initial = fs.readFileSync(logPath, "utf8");
      if (initial) {
        res.write(`event: log\ndata: ${JSON.stringify(initial)}\n\n`);
      }
    }
  } catch (e) {
    // ignore
  }

  // Watch for file changes and stream appended content
  let watcher: fs.FSWatcher | null = null;
  try {
    watcher = fs.watch(path.dirname(logPath), (eventType, filename) => {
      if (!filename) return;
      if (filename !== path.basename(logPath)) return;
      try {
        const content = fs.readFileSync(logPath, "utf8");
        res.write(`event: log\ndata: ${JSON.stringify(content)}\n\n`);
      } catch (err) {
        // ignore
      }
    });
  } catch (e) {
    // ignore
  }

  // Heartbeat every 15s to keep the connection alive
  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    if (watcher) watcher.close();
  });
};

// Keep evaluation and prediction as simple mocks for now
export const handleRunEvaluation: RequestHandler = (req, res) => {
  const { ticker } = req.body || {};
  const evaluationId = `eval-${Date.now()}`;
  res.status(202).json({ evaluationId, status: "running", ticker });
};

export const handleGetEvaluation: RequestHandler = (req, res) => {
  const { id } = req.params;
  const result = {
    evaluationId: id,
    results: {
      AAPL: { finalNetWorth: 12345.67 },
      MSFT: { finalNetWorth: 11000.0 },
    },
  };
  res.status(200).json(result);
};

export const handlePredict: RequestHandler = (req, res) => {
  const { ticker } = req.body || {};
  res.status(200).json({ ticker, prediction: "BUY", confidence: 0.72 });
};

export const handleGetPredictionTimeline: RequestHandler = (req, res) => {
  const { ticker } = req.params;
  const timeline = [
    { date: "2024-01-01", action: "BUY", quantity: 10, price: 150.25 },
    { date: "2024-01-02", action: "HOLD", quantity: 10, price: 152.5 },
    { date: "2024-01-03", action: "SELL", quantity: 5, price: 155.0 },
  ];
  res.status(200).json({ ticker, timeline });
};
