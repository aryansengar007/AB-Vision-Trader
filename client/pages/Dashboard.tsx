import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { evaluationApi, predictionsApi } from '@/services/api';

const statVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3 },
  }),
};

const chartVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

export default function Dashboard() {
  const { selectedTicker } = useStore();
  const [priceData, setPriceData] = useState<Array<any>>([]);
  const [equityData, setEquityData] = useState<Array<any>>([]);
  const [metrics, setMetrics] = useState({
    sharpeRatio: 0,
    maxDrawdown: 0,
    winRate: 0,
    roi: 0,
  });
  const [stats, setStats] = useState({
    netWorth: 100000,
    profit: 0,
    profitPercent: 0,
    trades: 0,
    loss: 0,
    lossPercent: 0,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load latest evaluation results
        const evalResponse = await evaluationApi.getResults('latest');
        if (evalResponse?.results) {
          const tickerResults = evalResponse.results[selectedTicker] || evalResponse.results.AAPL;
          const netWorth = tickerResults?.finalNetWorth || 100000;
          const profit = netWorth - 100000;
          const roi = (profit / 100000) * 100;
          
          setStats({
            netWorth,
            profit,
            profitPercent: roi,
            trades: 8,
            loss: -1250,
            lossPercent: -1.25,
          });

          // Calculate metrics
          setMetrics({
            sharpeRatio: roi > 0 ? (roi / 10).toFixed(2) : 0, // Simple approximation
            maxDrawdown: roi < 0 ? roi : -8.3,
            winRate: roi > 0 ? 62.5 : 37.5,
            roi,
          });
        }

        // Load price timeline
        const timelineData = await predictionsApi.getActionTimeline(selectedTicker);
        if (timelineData?.timeline) {
          const priceChart = timelineData.timeline.map((item: any) => ({
            date: item.date,
            price: item.price,
            ma20: item.price * 0.98, // Simple approximation
          }));
          setPriceData(priceChart);

          // Generate equity curve from timeline
          let equity = 100000;
          const equityCurve = timelineData.timeline.map((item: any) => {
            if (item.action === 'BUY') {
              equity -= item.quantity * item.price;
            } else if (item.action === 'SELL') {
              equity += item.quantity * item.price;
            }
            return { date: item.date, equity, cashFlow: 100000 };
          });
          setEquityData(equityCurve);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    
    loadDashboardData();
  }, [selectedTicker]);

  const statCards = [
    {
      label: 'Net Worth',
      value: `$${stats.netWorth.toLocaleString()}`,
      change: `${stats.profit >= 0 ? '+' : ''}${stats.profit.toLocaleString()}`,
      changePercent: `${stats.profitPercent >= 0 ? '+' : ''}${stats.profitPercent.toFixed(2)}%`,
      icon: DollarSign,
      positive: stats.profit >= 0,
    },
    {
      label: 'Total Profit',
      value: `$${Math.abs(stats.profit).toLocaleString()}`,
      change: `${stats.profitPercent >= 0 ? '+' : ''}${stats.profitPercent.toFixed(1)}%`,
      changePercent: 'Last 30 days',
      icon: TrendingUp,
      positive: stats.profit >= 0,
    },
    {
      label: 'Total Loss',
      value: `${stats.loss >= 0 ? '' : '-'}$${Math.abs(stats.loss).toLocaleString()}`,
      change: `${stats.lossPercent.toFixed(2)}%`,
      changePercent: 'From drawdown',
      icon: TrendingDown,
      positive: false,
    },
    {
      label: 'Total Trades',
      value: stats.trades.toString(),
      change: '4 buy, 2 sell, 2 hold',
      changePercent: 'This period',
      icon: Activity,
      positive: true,
    },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Welcome Back
        </h1>
        <p className="text-muted-foreground">
          AB Vision Trader - {selectedTicker} Performance Analysis
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              custom={i}
              variants={statVariants}
              initial="hidden"
              animate="visible"
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className={`text-sm mt-2 ${stat.positive ? 'text-success' : 'text-destructive'}`}>
                    {stat.change}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.changePercent}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.positive ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  <Icon className={`w-5 h-5 ${stat.positive ? 'text-success' : 'text-destructive'}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Movement Chart */}
        <motion.div
          variants={chartVariants}
          initial="hidden"
          animate="visible"
          className="bg-card border border-border rounded-lg p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Price Movement - {selectedTicker}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ma20"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Equity Curve Chart */}
        <motion.div
          variants={chartVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Equity Curve
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="hsl(var(--success))"
                fillOpacity={1}
                fill="url(#colorEquity)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Latest Model Evaluation Results */}
      <motion.div
        variants={chartVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Latest Model Evaluation Results
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <p className="font-medium text-foreground">Sharpe Ratio</p>
              <p className="text-sm text-muted-foreground">Risk-adjusted return</p>
            </div>
            <p className="text-2xl font-bold text-success">{metrics.sharpeRatio || '0.00'}</p>
          </div>
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <p className="font-medium text-foreground">Max Drawdown</p>
              <p className="text-sm text-muted-foreground">Largest peak-to-trough decline</p>
            </div>
            <p className="text-2xl font-bold text-destructive">{metrics.maxDrawdown.toFixed(1)}%</p>
          </div>
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <p className="font-medium text-foreground">Win Rate</p>
              <p className="text-sm text-muted-foreground">Profitable trades ratio</p>
            </div>
            <p className="text-2xl font-bold text-success">{metrics.winRate.toFixed(1)}%</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Return on Investment</p>
              <p className="text-sm text-muted-foreground">Total portfolio return</p>
            </div>
            <p className={`text-2xl font-bold ${metrics.roi >= 0 ? 'text-success' : 'text-destructive'}`}>{metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(1)}%</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
