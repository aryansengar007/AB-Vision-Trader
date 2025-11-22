import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import TrainAgent from "./pages/TrainAgent";
import EvaluateAgent from "./pages/EvaluateAgent";
import Predictions from "./pages/Predictions";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Initialize dark mode on page load
if (typeof window !== 'undefined') {
  // Check localStorage for dark mode preference
  try {
    const stored = localStorage.getItem('trading-agent-store');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.state?.isDarkMode === false) {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
}

const queryClient = new QueryClient();

function AppContent() {
  const { isDarkMode } = useStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />
      <Route
        path="/train"
        element={
          <Layout>
            <TrainAgent />
          </Layout>
        }
      />
      <Route
        path="/evaluate"
        element={
          <Layout>
            <EvaluateAgent />
          </Layout>
        }
      />
      <Route
        path="/predictions"
        element={
          <Layout>
            <Predictions />
          </Layout>
        }
      />
      <Route
        path="/settings"
        element={
          <Layout>
            <Settings />
          </Layout>
        }
      />
      <Route
        path="*"
        element={
          <Layout>
            <NotFound />
          </Layout>
        }
      />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
