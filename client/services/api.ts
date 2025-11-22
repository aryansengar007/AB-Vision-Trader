import axios from 'axios';
import { useStore } from '@/store/useStore';

const getApiClient = () => {
  const apiBaseUrl = useStore.getState().apiBaseUrl;
  return axios.create({
    baseURL: apiBaseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Stock endpoints
export const stocksApi = {
  getList: async () => {
    const client = getApiClient();
    const response = await client.get('/api/stocks/list');
    return response.data;
  },
};

// Training endpoints
export const trainingApi = {
  startTraining: async (params: {
    windowSize: number;
    startCash: number;
    transactionCost: number;
    episodes: number;
    datasetFile?: File;
  }) => {
    const client = getApiClient();
    const body = {
      windowSize: params.windowSize,
      startCash: params.startCash,
      transactionCost: params.transactionCost,
      episodes: params.episodes,
    } as any;
    const response = await client.post('/api/train', body, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  stopTraining: async () => {
    const client = getApiClient();
    const response = await client.post('/api/train/stop');
    return response.data;
  },

  getTrainingLogs: async () => {
    const client = getApiClient();
    const response = await client.get('/api/logs/train');
    return response.data;
  },
  // Open a server-sent events stream to receive live log updates.
  streamTrainingLogs: (onMessage: (data: string) => void, onError?: (err: any) => void) => {
    const apiBase = useStore.getState().apiBaseUrl;
    const url = `${apiBase.replace(/\/$/, '')}/api/logs/stream`;
    const es = new EventSource(url);
    es.addEventListener('log', (ev: MessageEvent) => {
      try {
        // server sends JSON-stringified full log content
        const txt = JSON.parse((ev as any).data as string) as string;
        onMessage(txt);
      } catch (e) {
        onMessage((ev as any).data as string);
      }
    });
    es.addEventListener('ping', () => {
      // noop heartbeat
    });
    es.onerror = (e) => {
      onError?.(e);
      es.close();
    };
    return es;
  },
};

// Evaluation endpoints
export const evaluationApi = {
  runEvaluation: async (params: {
    ticker: string;
    modelId?: string;
  }) => {
    const client = getApiClient();
    const response = await client.post('/api/evaluate', {
      ticker: params.ticker,
      modelId: params.modelId,
    });
    return response.data;
  },

  getResults: async (evaluationId: string) => {
    const client = getApiClient();
    const response = await client.get(`/api/evaluate/${evaluationId}`);
    return response.data;
  },
};

// Prediction endpoints
export const predictionsApi = {
  getPrediction: async (params: {
    ticker: string;
    modelId?: string;
  }) => {
    const client = getApiClient();
    const response = await client.post('/api/predict', {
      ticker: params.ticker,
      modelId: params.modelId,
    });
    return response.data;
  },

  getActionTimeline: async (ticker: string) => {
    const client = getApiClient();
    const response = await client.get(`/api/predict/${ticker}/timeline`);
    return response.data;
  },
};

// Mock data for development
export const mockStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
];

export const mockTrainingLogs = [
  'Starting training session...',
  'Initializing agent with window size 10',
  'Loading market data...',
  'Episode 1/100 - Reward: 150.23',
  'Episode 2/100 - Reward: 175.45',
  'Episode 3/100 - Reward: 162.89',
  'Episode 4/100 - Reward: 198.12',
  'Episode 5/100 - Reward: 185.67',
];

export const mockTrainingData = [
  { episode: 1, reward: 150.23, cumulativeReward: 150.23 },
  { episode: 2, reward: 175.45, cumulativeReward: 325.68 },
  { episode: 3, reward: 162.89, cumulativeReward: 488.57 },
  { episode: 4, reward: 198.12, cumulativeReward: 686.69 },
  { episode: 5, reward: 185.67, cumulativeReward: 872.36 },
  { episode: 6, reward: 210.34, cumulativeReward: 1082.70 },
  { episode: 7, reward: 195.78, cumulativeReward: 1278.48 },
  { episode: 8, reward: 220.45, cumulativeReward: 1498.93 },
  { episode: 9, reward: 205.23, cumulativeReward: 1704.16 },
  { episode: 10, reward: 235.67, cumulativeReward: 1939.83 },
];

export const mockEquityCurve = [
  { date: '2024-01-01', equity: 100000, cashFlow: 100000 },
  { date: '2024-01-02', equity: 102500, cashFlow: 100000 },
  { date: '2024-01-03', equity: 101200, cashFlow: 100000 },
  { date: '2024-01-04', equity: 105800, cashFlow: 100000 },
  { date: '2024-01-05', equity: 108300, cashFlow: 100000 },
  { date: '2024-01-06', equity: 107100, cashFlow: 100000 },
  { date: '2024-01-07', equity: 111500, cashFlow: 100000 },
  { date: '2024-01-08', equity: 114200, cashFlow: 100000 },
  { date: '2024-01-09', equity: 112800, cashFlow: 100000 },
  { date: '2024-01-10', equity: 118500, cashFlow: 100000 },
];

export const mockAgentActions = [
  { date: '2024-01-01', action: 'BUY', quantity: 10, price: 150.25, commission: 15.25 },
  { date: '2024-01-02', action: 'HOLD', quantity: 10, price: 152.50, commission: 0 },
  { date: '2024-01-03', action: 'BUY', quantity: 5, price: 151.20, commission: 7.56 },
  { date: '2024-01-04', action: 'SELL', quantity: 8, price: 158.00, commission: 12.64 },
  { date: '2024-01-05', action: 'HOLD', quantity: 7, price: 160.30, commission: 0 },
  { date: '2024-01-06', action: 'BUY', quantity: 3, price: 159.10, commission: 4.77 },
  { date: '2024-01-07', action: 'SELL', quantity: 5, price: 165.50, commission: 8.27 },
  { date: '2024-01-08', action: 'HOLD', quantity: 5, price: 167.20, commission: 0 },
];

export const mockPriceChart = [
  { date: '2024-01-01', price: 150.25, ma20: 150.25 },
  { date: '2024-01-02', price: 152.50, ma20: 151.38 },
  { date: '2024-01-03', price: 151.20, ma20: 151.32 },
  { date: '2024-01-04', price: 158.00, ma20: 153.49 },
  { date: '2024-01-05', price: 160.30, ma20: 154.85 },
  { date: '2024-01-06', price: 159.10, ma20: 155.51 },
  { date: '2024-01-07', price: 165.50, ma20: 157.36 },
  { date: '2024-01-08', price: 167.20, ma20: 159.21 },
  { date: '2024-01-09', price: 164.80, ma20: 160.37 },
  { date: '2024-01-10', price: 171.50, ma20: 162.47 },
];
