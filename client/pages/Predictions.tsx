import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { predictionsApi, stocksApi } from '@/services/api';

export default function Predictions() {
  const { selectedTicker, setSelectedTicker } = useStore();
  const [showBuySellMarkers, setShowBuySellMarkers] = useState(true);
  const [stocks, setStocks] = useState<Array<{ symbol: string; name: string }>>([]);
  const [timeline, setTimeline] = useState<Array<{ date: string; action: string; quantity: number; price: number }>>([]);
  const [priceDataWithActions, setPriceDataWithActions] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStocks = async () => {
      try {
        const data = await stocksApi.getList();
        setStocks(data);
        if (data.length > 0 && !selectedTicker) {
          setSelectedTicker(data[0].symbol);
        }
      } catch (error) {
        console.error('Failed to load stocks:', error);
      }
    };
    loadStocks();
  }, []);

  useEffect(() => {
    const loadPredictions = async () => {
      if (!selectedTicker) return;
      try {
        setLoading(true);
        const timelineData = await predictionsApi.getActionTimeline(selectedTicker);
        if (timelineData.timeline) {
          setTimeline(timelineData.timeline);
          
          // Create price data with buy/sell markers
          const priceData = timelineData.timeline.map((item: any) => ({
            date: item.date,
            price: item.price,
            buy: item.action === 'BUY' ? item.price : undefined,
            sell: item.action === 'SELL' ? item.price : undefined,
          }));
          setPriceDataWithActions(priceData);
        }
      } catch (error) {
        console.error('Failed to load predictions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPredictions();
  }, [selectedTicker]);

  // Calculate position timeline from actions
  const positionTimeline = timeline.reduce((acc: any[], action, idx) => {
    const lastPos = idx > 0 ? acc[idx - 1].position : 0;
    const newPosition = action.action === 'BUY' 
      ? lastPos + action.quantity 
      : action.action === 'SELL' 
      ? lastPos - action.quantity 
      : lastPos;
    
    acc.push({
      date: action.date,
      position: newPosition,
      avgCost: action.price,
    });
    return acc;
  }, []);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Predictions & Agent Actions
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize agent trading decisions and price movements
        </p>
      </motion.div>

      {/* Ticker Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <label className="text-sm font-medium text-foreground block mb-3">
          Select Stock Ticker
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {stocks.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => setSelectedTicker(stock.symbol)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedTicker === stock.symbol
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {stock.symbol}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Price Chart with Buy/Sell Markers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Price Chart with Agent Actions - {selectedTicker}
          </h2>
          <button
            onClick={() => setShowBuySellMarkers(!showBuySellMarkers)}
            className="text-sm px-3 py-1 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors duration-200"
          >
            {showBuySellMarkers ? 'Hide Markers' : 'Show Markers'}
          </button>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={priceDataWithActions}>
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
              name="Price"
            />

            {showBuySellMarkers && (
              <>
                <Scatter
                  name="Buy"
                  dataKey="buy"
                  fill="hsl(var(--success))"
                  shape="triangle"
                />
                <Scatter
                  name="Sell"
                  dataKey="sell"
                  fill="hsl(var(--destructive))"
                  shape="triangle"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Position Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Agent Position Size
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={positionTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
              <Bar
                dataKey="position"
                fill="hsl(var(--primary))"
                name="Position (shares)"
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Average Cost Tracking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Average Cost Basis
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={positionTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
              <Line
                type="monotone"
                dataKey="avgCost"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={false}
                name="Avg Cost"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Action Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Total Buy Orders</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {timeline.filter((a) => a.action === 'BUY').length}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-destructive" />
            <span className="text-sm text-muted-foreground">Total Sell Orders</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {timeline.filter((a) => a.action === 'SELL').length}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">📊</span>
            <span className="text-sm text-muted-foreground">Current Position</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {positionTimeline.length > 0 ? positionTimeline[positionTimeline.length - 1].position : 0} shares
          </p>
        </div>
      </motion.div>

      {/* Detailed Actions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-card border border-border rounded-lg p-6 overflow-x-auto"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">
          All Actions
        </h2>
        <div className="min-w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Action</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Quantity</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Price</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((action, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border hover:bg-secondary/50 transition-colors duration-200"
                >
                  <td className="py-3 px-4 text-foreground">{action.date}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      action.action === 'BUY'
                        ? 'bg-success/10 text-success'
                        : action.action === 'SELL'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {action.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground">{action.quantity}</td>
                  <td className="py-3 px-4 text-foreground">${action.price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-foreground">
                    ${(action.quantity * action.price).toFixed(2)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
