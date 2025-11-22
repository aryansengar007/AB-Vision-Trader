import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, Play, Square, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trainingApi } from '@/services/api';

interface TrainingFormData {
  windowSize: number;
  startCash: number;
  transactionCost: number;
  episodes: number;
}

export default function TrainAgent() {
  const { isTraining, setIsTraining, trainingProgress, setTrainingProgress } = useStore();
  const [logs, setLogs] = useState<string[]>([]);
  const [trainingData, setTrainingData] = useState<Array<{ episode: number; reward: number; cumulativeReward: number }>>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logPollingInterval, setLogPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, formState: { errors }, watch } = useForm<TrainingFormData>({
    defaultValues: {
      windowSize: 10,
      startCash: 100000,
      transactionCost: 10,
      episodes: 100,
    },
  });

  const episodes = watch('episodes');

  // Auto-scroll to bottom of logs only if user is already at bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Detect if user has scrolled up
  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold
      setAutoScroll(isAtBottom);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    setAutoScroll(true);
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const onSubmit = async (data: TrainingFormData) => {
    try {
      setIsTraining(true);
      setLogs(['Starting training session...']);
      setTrainingProgress(0);
      setTrainingData([]);

      // Start training via API
      const response = await trainingApi.startTraining({
        windowSize: data.windowSize,
        startCash: data.startCash,
        transactionCost: data.transactionCost,
        episodes: data.episodes,
        datasetFile: selectedFile || undefined,
      });

      toast.success('Training started successfully!');

      // Poll for logs every 500ms for more real-time updates
      const interval = setInterval(async () => {
        try {
          const logResponse = await trainingApi.getTrainingLogs();
          if (logResponse.logs) {
            const logLines = logResponse.logs.split('\n').filter((line: string) => line.trim());
            setLogs(logLines);
            
            // Parse episode data from logs for chart
            const episodeData: Array<{ episode: number; reward: number; cumulativeReward: number }> = [];
            let cumulativeReward = 0;
            logLines.forEach((line: string) => {
              // Match patterns like "Episode 1/20 | ZTS | Episode Reward: -1600.22"
              const match = line.match(/Episode\s+(\d+)\/\d+.*Reward[:\s]+([-\d.]+)/);
              if (match) {
                const episode = parseInt(match[1]);
                const reward = parseFloat(match[2]);
                cumulativeReward += reward;
                episodeData.push({ episode, reward, cumulativeReward });
              }
            });
            if (episodeData.length > 0) {
              setTrainingData(episodeData);
              const progress = (episodeData.length / data.episodes) * 100;
              setTrainingProgress(Math.min(progress, 100));
            }
          }
          
          if (!logResponse.running) {
            clearInterval(interval);
            setLogPollingInterval(null);
            setIsTraining(false);
            toast.success('Training completed!');
          }
        } catch (err) {
          console.error('Error polling logs:', err);
        }
      }, 500);

      setLogPollingInterval(interval);
    } catch (error: any) {
      setIsTraining(false);
      toast.error(error?.response?.data?.error || 'Failed to start training');
    }
  };

  const handleStop = async () => {
    try {
      await trainingApi.stopTraining();
      if (logPollingInterval) {
        clearInterval(logPollingInterval);
        setLogPollingInterval(null);
      }
      setIsTraining(false);
      setLogs((prev) => [...prev, 'Training stopped by user']);
      toast.info('Training stopped');
    } catch (error) {
      toast.error('Failed to stop training');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (logPollingInterval) {
        clearInterval(logPollingInterval);
      }
    };
  }, [logPollingInterval]);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Train Agent
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure training parameters and start training your RL model
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-1"
        >
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Dataset CSV File
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      toast.success(`Loaded: ${file.name}`);
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                  disabled={isTraining}
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors duration-200"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">
                    {selectedFile ? selectedFile.name : 'Click to upload CSV'}
                  </span>
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Window Size
                </label>
                <Input
                  type="number"
                  min="1"
                  {...register('windowSize', { required: true, min: 1 })}
                  disabled={isTraining}
                  className="bg-secondary border-border"
                />
                {errors.windowSize && (
                  <p className="text-destructive text-sm mt-1">Required</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Start Cash ($)
                </label>
                <Input
                  type="number"
                  min="1000"
                  {...register('startCash', { required: true, min: 1000 })}
                  disabled={isTraining}
                  className="bg-secondary border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Transaction Cost ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('transactionCost', { required: true, min: 0 })}
                  disabled={isTraining}
                  className="bg-secondary border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Episodes
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  {...register('episodes', { required: true, min: 1, max: 1000 })}
                  disabled={isTraining}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2 pt-2">
                {isTraining && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">Progress</span>
                      <span className="text-muted-foreground">{trainingProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${trainingProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isTraining}
                    className="flex-1 gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Training
                  </Button>
                  {isTraining && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleStop}
                      className="flex-1 gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Training Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Training Progress
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trainingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="episode" stroke="hsl(var(--muted-foreground))" />
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
                  dataKey="reward"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={false}
                  name="Episode Reward"
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeReward"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Cumulative Reward"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Live Logs Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Training Logs
          </h2>
          <div className="flex items-center gap-4">
            {!autoScroll && (
              <button
                onClick={scrollToBottom}
                className="text-xs px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 flex items-center gap-1"
              >
                <ChevronDown className="w-3 h-3" />
                Scroll to Bottom
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isTraining ? 'bg-success animate-pulse' : 'bg-muted'}`} />
              <span className="text-sm text-muted-foreground">
                {isTraining ? 'Training...' : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        <div 
          ref={logsContainerRef}
          onScroll={handleScroll}
          className="bg-secondary rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm text-foreground"
        >
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground pb-1"
            >
              <span className="text-primary">{'> '}</span>
              {log}
            </motion.div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </motion.div>
    </div>
  );
}
