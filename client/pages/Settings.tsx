import { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Save, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Settings() {
  const { isDarkMode, setIsDarkMode, apiBaseUrl, setApiBaseUrl, resetPreferences } = useStore();
  const [tempApiUrl, setTempApiUrl] = useState(apiBaseUrl);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveApiUrl = async () => {
    if (!tempApiUrl.trim()) {
      toast.error('Please enter a valid API URL');
      return;
    }

    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setApiBaseUrl(tempApiUrl);
    setIsSaving(false);
    toast.success('API URL saved successfully');
  };

  const handleClearCache = () => {
    try {
      // Clear localStorage for this app
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('trading-')) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const handleResetPreferences = () => {
    resetPreferences();
    setTempApiUrl(apiBaseUrl);
    toast.success('Preferences reset to defaults');
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure your preferences and application settings
        </p>
      </motion.div>

      {/* Theme Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-foreground mb-6">
          Theme Settings
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Dark Mode</p>
              <p className="text-sm text-muted-foreground">
                Use dark theme for better visibility in low light
              </p>
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 ${
                isDarkMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Theme Preview */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="p-4 rounded-lg border-2 border-primary bg-background"
              style={{ backgroundColor: isDarkMode ? 'hsl(var(--background))' : 'hsl(0 0% 100%)' }}
            >
              <div className="flex items-center gap-2 text-sm">
                {isDarkMode ? (
                  <Moon className="w-4 h-4" style={{ color: 'hsl(var(--warning))' }} />
                ) : (
                  <Sun className="w-4 h-4" style={{ color: 'hsl(38 92% 50%)' }} />
                )}
                <span style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)' }}>
                  Current Theme
                </span>
              </div>
            </div>
            <div className="p-4 rounded-lg border-2 border-border bg-card flex items-center justify-center">
              <p className="text-xs text-muted-foreground text-center">
                {isDarkMode ? 'Dark Mode Active' : 'Light Mode Active'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* API Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-foreground mb-6">
          API Configuration
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              API Base URL
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Specify the backend API server address for all requests
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                value={tempApiUrl}
                onChange={(e) => setTempApiUrl(e.target.value)}
                placeholder="http://localhost:8080"
                className="bg-secondary border-border flex-1"
              />
              <Button
                onClick={handleSaveApiUrl}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Current: <code className="bg-secondary px-2 py-1 rounded">{apiBaseUrl}</code>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Cache & Storage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-foreground mb-6">
          Cache & Storage
        </h2>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Manage cached data and application storage
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={handleClearCache}
              variant="outline"
              className="gap-2 border-border"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cache
            </Button>

            <Button
              onClick={handleResetPreferences}
              variant="outline"
              className="gap-2 border-border"
            >
              <Trash2 className="w-4 h-4" />
              Reset All Settings
            </Button>
          </div>

          <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-sm text-warning">
              ⚠️ Resetting will clear all preferences and return to default settings
            </p>
          </div>
        </div>
      </motion.div>

      {/* Advanced Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-foreground mb-6">
          Advanced Options
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Enable Debug Logs</p>
              <p className="text-sm text-muted-foreground">
                Show detailed logging information in browser console
              </p>
            </div>
            <button className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 bg-muted">
              <span className="inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 translate-x-1" />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Real-time Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive notifications for training updates and events
              </p>
            </div>
            <button className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 bg-primary">
              <span className="inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 translate-x-7" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* System Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-foreground mb-6">
          System Information
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center pb-3 border-b border-border">
            <span className="text-muted-foreground">Application Version</span>
            <code className="text-foreground bg-secondary px-2 py-1 rounded">1.0.0</code>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-border">
            <span className="text-muted-foreground">Browser</span>
            <code className="text-foreground bg-secondary px-2 py-1 rounded">
              {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-1)[0] : 'Unknown'}
            </code>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">React Version</span>
            <code className="text-foreground bg-secondary px-2 py-1 rounded">18.3.1</code>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
