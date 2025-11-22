import os
import sys
import math
import random
from collections import deque, namedtuple

import numpy as np
import pandas as pd

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim

    TORCH_AVAILABLE = True
except ImportError as e:
    torch = None
    nn = None
    optim = None
    TORCH_AVAILABLE = False
    print(f"WARNING: PyTorch import failed with ImportError: {e}")
    print("PyTorch is not installed. Please install it using: pip install torch")
except OSError as e:
    torch = None
    nn = None
    optim = None
    TORCH_AVAILABLE = False
    print(f"ERROR: PyTorch DLL loading failed: {e}")
    print("\n" + "="*70)
    print("SOLUTION: Install Microsoft Visual C++ Redistributable")
    print("Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe")
    print("="*70)
    print("\nAfter installing the redistributable, restart your terminal and try again.")
except Exception as e:
    torch = None
    nn = None
    optim = None
    TORCH_AVAILABLE = False
    print(f"ERROR: Unexpected error loading PyTorch: {e}")

DATA_DIR = os.getenv("DATA_DIR", "yahoo_data")
DATA_FILE = os.getenv("DATA_FILE", "stock_details_5_years_cleaned.csv")

TOP_TICKERS = ["AAPL.csv", "MSFT.csv", "GOOGL.csv", "AMZN.csv", "NVDA.csv"]

WINDOW_SIZE = 30
START_CASH = 10000.0
TRANSACTION_COST = 0.001

DEVICE = (
    torch.device("cuda" if torch and torch.cuda.is_available() else "cpu")
    if TORCH_AVAILABLE
    else "cpu"
)

GAMMA = 0.99
LR = 1e-4
BATCH_SIZE = 64
BUFFER_SIZE = 100000
TARGET_UPDATE_FREQ = 1000
EPS_START = 1.0
EPS_END = 0.05
EPS_DECAY = 20000
MAX_EPISODES = int(os.getenv("MAX_EPISODES", 150))
MAX_STEPS_PER_EPISODE = int(os.getenv("MAX_STEPS_PER_EPISODE", 1000))

Transition = namedtuple(
    "Transition", ("state", "action", "reward", "next_state", "done")
)


def add_technical_features(df):
    df = df.copy()
    df["return"] = df["adj_close"].pct_change().fillna(0)
    df["sma_5"] = df["adj_close"].rolling(5).mean().bfill()
    df["sma_10"] = df["adj_close"].rolling(10).mean().bfill()
    df["vol_5"] = df["volume"].rolling(5).mean().bfill()
    return df


def load_and_prepare_csv(path):
    try:
        header = pd.read_csv(path, nrows=0)
        date_col = next((c for c in header.columns if c.lower() == "date"), None)
        parse_dates = [date_col] if date_col is not None else None
    except Exception:
        parse_dates = None

    df = pd.read_csv(path, parse_dates=parse_dates)
    df.columns = [c.lower() for c in df.columns]
    df = normalize_columns(df)
    df = add_technical_features(df)
    df = df.reset_index(drop=True)
    return df


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    col_map = {}
    cols_lower = [c.lower() for c in df.columns]

    if "date" not in cols_lower:
        for c in df.columns:
            if "date" in c.lower():
                col_map[c] = "date"
                break

    if "adj_close" not in cols_lower:
        for c in df.columns:
            cl = c.lower()
            if cl in ("adjclose", "adjusted_close", "adjustedclose", "adj_close"):
                col_map[c] = "adj_close"
                break

    if "close" not in cols_lower:
        for c in df.columns:
            if "close" in c.lower() and "adj" not in c.lower():
                col_map[c] = "close"
                break

    if "volume" not in cols_lower:
        for c in df.columns:
            if "vol" in c.lower():
                col_map[c] = "volume"
                break

    if "ticker" not in cols_lower:
        for c in df.columns:
            if c.lower() in (
                "symbol",
                "ticker_symbol",
                "tick",
                "symbol",
                "company",
                "company_name",
            ):
                col_map[c] = "ticker"
                break

    if col_map:
        df = df.rename(columns=col_map)

    cols_l = [c.lower() for c in df.columns]
    if "adj_close" not in cols_l and "close" in cols_l:
        close_col = next(c for c in df.columns if c.lower() == "close")
        df["adj_close"] = df[close_col]

    return df


def split_df(df, ratio=0.7):
    n = len(df)
    cut = int(n * ratio)
    return df.iloc[:cut].reset_index(drop=True), df.iloc[cut:].reset_index(drop=True)


class TradingEnv:
    def __init__(self, df, window_size=30, start_cash=10000, transaction_cost=0.001):
        self.df = df.reset_index(drop=True)
        self.window_size = window_size
        self.start_cash = start_cash
        self.transaction_cost = transaction_cost

    def reset(self):
        self.current_step = self.window_size
        self.cash = self.start_cash
        self.shares = 0
        self.position = 0
        self.net_worth = self.start_cash
        return self._get_state()

    def _get_state(self):
        start = self.current_step - self.window_size
        window = self.df.iloc[start : self.current_step]

        features = []
        for col in [
            "open",
            "high",
            "low",
            "close",
            "adj_close",
            "volume",
            "return",
            "sma_5",
            "sma_10",
            "vol_5",
        ]:
            vals = window[col].values.astype(np.float32)
            mean = vals.mean()
            std = vals.std() if vals.std() > 0 else 1
            features.append((vals - mean) / std)

        state = np.stack(features, axis=1)
        pos = np.full((self.window_size, 1), self.position, dtype=np.float32)
        return np.concatenate([state, pos], axis=1)

    def step(self, action):
        price = float(self.df.loc[self.current_step, "adj_close"])
        prev_net = self.net_worth

        if action == 1 and self.position == 0:
            shares_to_buy = int(self.cash // price)
            if shares_to_buy > 0:
                cost = shares_to_buy * price * (1 + self.transaction_cost)
                self.cash -= cost
                self.shares = shares_to_buy
                self.position = 1

        elif action == 2 and self.position == 1:
            revenue = self.shares * price * (1 - self.transaction_cost)
            self.cash += revenue
            self.shares = 0
            self.position = 0

        self.net_worth = self.cash + self.shares * price
        reward = self.net_worth - prev_net

        self.current_step += 1
        done = self.current_step >= len(self.df) - 1

        return (self._get_state() if not done else None), reward, done, {}


class ReplayBuffer:
    def __init__(self, size):
        self.buffer = deque(maxlen=size)

    def push(self, *args):
        self.buffer.append(Transition(*args))

    def sample(self, batch_size):
        batch = random.sample(self.buffer, batch_size)
        return Transition(*zip(*batch))

    def __len__(self):
        return len(self.buffer)


# Only define PyTorch-dependent classes if torch is available
if TORCH_AVAILABLE and nn is not None:
    class DQN(nn.Module):
        def __init__(self, window_size, features, actions):
            super().__init__()
            self.model = nn.Sequential(
                nn.Flatten(),
                nn.Linear(window_size * features, 512),
                nn.ReLU(),
                nn.Linear(512, 256),
                nn.ReLU(),
                nn.Linear(256, actions),
            )

        def forward(self, x):
            return self.model(x)
else:
    # Placeholder class when PyTorch is not available
    class DQN:
        def __init__(self, *args, **kwargs):
            raise RuntimeError("PyTorch is not available. Cannot create DQN model.")


class DQNAgent:
    def __init__(self, state_shape, n_actions=3):
        w, f = state_shape
        self.actions = n_actions

        self.policy = DQN(w, f, n_actions).to(DEVICE)
        self.target = DQN(w, f, n_actions).to(DEVICE)
        self.target.load_state_dict(self.policy.state_dict())

        self.optimizer = optim.Adam(self.policy.parameters(), lr=LR)
        self.memory = ReplayBuffer(BUFFER_SIZE)
        self.steps = 0

    def act(self, state):
        eps = EPS_END + (EPS_START - EPS_END) * math.exp(-self.steps / EPS_DECAY)
        self.steps += 1

        if random.random() < eps:
            return random.randrange(self.actions)

        state_t = torch.tensor(state, device=DEVICE, dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            return int(self.policy(state_t).argmax().item())

    def train_step(self):
        if len(self.memory) < BATCH_SIZE:
            return

        batch = self.memory.sample(BATCH_SIZE)

        state = torch.tensor(np.array(batch.state), dtype=torch.float32, device=DEVICE)
        next_state = (
            torch.tensor(
                np.array([s for s, d in zip(batch.next_state, batch.done) if not d]),
                dtype=torch.float32,
                device=DEVICE,
            )
            if any(not d for d in batch.done)
            else None
        )

        action = torch.tensor(batch.action, dtype=torch.long, device=DEVICE).unsqueeze(
            1
        )
        reward = torch.tensor(
            batch.reward, dtype=torch.float32, device=DEVICE
        ).unsqueeze(1)

        state_q = self.policy(state).gather(1, action)

        next_q = torch.zeros((BATCH_SIZE, 1), device=DEVICE)
        if next_state is not None:
            with torch.no_grad():
                next_q_vals = self.target(next_state).max(1)[0].unsqueeze(1)
                mask = torch.tensor(
                    [not d for d in batch.done], dtype=torch.bool, device=DEVICE
                )
                next_q[mask] = next_q_vals

        expected_q = reward + GAMMA * next_q

        loss = nn.SmoothL1Loss()(state_q, expected_q)

        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

        if self.steps % TARGET_UPDATE_FREQ == 0:
            self.target.load_state_dict(self.policy.state_dict())


def train_multi():
    ticker_data = {}

    combined_path = os.path.join(os.getcwd(), DATA_FILE)
    if os.path.exists(combined_path):
        print(f"Loading combined dataset from {combined_path}", flush=True)
        header = pd.read_csv(combined_path, nrows=0)
        date_col = next((c for c in header.columns if c.lower() == "date"), None)
        parse_dates = [date_col] if date_col is not None else None
        df_all = pd.read_csv(combined_path, parse_dates=parse_dates)
        df_all.columns = [c.lower() for c in df_all.columns]
        df_all = normalize_columns(df_all)

        if "ticker" not in df_all.columns:
            raise RuntimeError(
                "Combined dataset found but no 'ticker' column present. Rename ticker column to 'ticker'."
            )

        top_tickers = list(df_all["ticker"].value_counts().head(5).index)
        print(f"Top tickers selected: {top_tickers}", flush=True)
        for tkr in top_tickers:
            df_t = (
                df_all[df_all["ticker"] == tkr]
                .sort_values("date")
                .reset_index(drop=True)
            )
            df_t = add_technical_features(df_t)
            train_df, test_df = split_df(df_t)
            ticker_data[tkr] = {"train": train_df, "test": test_df}
    else:
        for tkr in TOP_TICKERS:
            path = os.path.join(DATA_DIR, tkr)
            if not os.path.exists(path):
                raise FileNotFoundError(
                    f"Expected {path} or combined {DATA_FILE} to exist"
                )
            df = load_and_prepare_csv(path)
            train_df, test_df = split_df(df)
            key = os.path.splitext(tkr)[0]
            ticker_data[key] = {"train": train_df, "test": test_df}

    tickers = list(ticker_data.keys())
    env0 = TradingEnv(
        ticker_data[tickers[0]]["train"], WINDOW_SIZE, START_CASH, TRANSACTION_COST
    )
    sample_state = env0.reset()
    state_shape = sample_state.shape

    agent = DQNAgent(state_shape, n_actions=3)

    for ep in range(MAX_EPISODES):
        tkr = random.choice(tickers)
        env = TradingEnv(
            ticker_data[tkr]["train"], WINDOW_SIZE, START_CASH, TRANSACTION_COST
        )

        state = env.reset()
        total_reward = 0

        for step in range(MAX_STEPS_PER_EPISODE):
            action = agent.act(state)
            next_state, reward, done, _ = env.step(action)

            agent.memory.push(state, action, reward, next_state, done)
            agent.train_step()

            state = next_state if next_state is not None else state
            total_reward += reward

            if done:
                break

        print(
            f"Episode {ep+1}/{MAX_EPISODES} | {tkr} | Episode Reward: {total_reward:.2f}",
            flush=True
        )

    return agent, ticker_data


def evaluate(agent, ticker_data):
    results = {}
    for tkr in ticker_data.keys():
        env = TradingEnv(
            ticker_data[tkr]["test"], WINDOW_SIZE, START_CASH, TRANSACTION_COST
        )
        state = env.reset()
        done = False

        while not done:
            with torch.no_grad():
                s = torch.tensor(state, dtype=torch.float32, device=DEVICE).unsqueeze(0)
                action = int(agent.policy(s).argmax().item())

            next_state, reward, done, _ = env.step(action)
            state = next_state if next_state is not None else state

        results[tkr] = env.net_worth
        print(f"Test result – {tkr}: Final Net Worth = {env.net_worth:.2f}", flush=True)

    print("\nAverage Net Worth Across 5 Stocks:", sum(results.values()) / len(results), flush=True)
    return results


if __name__ == "__main__":
    if not TORCH_AVAILABLE:
        print("ERROR: PyTorch is not installed or failed to import!")
        print("Please install PyTorch using: pip install torch")
        print("\nFor detailed installation instructions, visit:")
        print("https://pytorch.org/get-started/locally/")
        exit(1)
    
    agent, data = train_multi()
    evaluate(agent, data)
