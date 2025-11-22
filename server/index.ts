import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  handleStocksList,
  handleStartTraining,
  handleStopTraining,
  handleTrainingLogs,
  handleTrainingLogsStream,
  handleRunEvaluation,
  handleGetEvaluation,
  handlePredict,
  handleGetPredictionTimeline,
} from "./routes/api";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.get("/api/stocks/list", handleStocksList);

  app.post("/api/train", handleStartTraining);
  app.post("/api/train/stop", handleStopTraining);
  app.get("/api/logs/train", handleTrainingLogs);
  app.get("/api/logs/stream", handleTrainingLogsStream);

  app.post("/api/evaluate", handleRunEvaluation);
  app.get("/api/evaluate/:id", handleGetEvaluation);

  app.post("/api/predict", handlePredict);
  app.get("/api/predict/:ticker/timeline", handleGetPredictionTimeline);

  return app;
}
