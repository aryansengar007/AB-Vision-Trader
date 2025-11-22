import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  { label: 'Train Agent', href: '/train', icon: 'train' },
  { label: 'Evaluate', href: '/evaluate', icon: 'evaluate' },
  { label: 'Predictions', href: '/predictions', icon: 'predictions' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

const getIcon = (iconName: string) => {
  const icons: Record<string, JSX.Element> = {
    dashboard: <span className="w-5 h-5">📊</span>,
    train: <span className="w-5 h-5">🤖</span>,
    evaluate: <span className="w-5 h-5">✅</span>,
    predictions: <span className="w-5 h-5">🔮</span>,
    settings: <span className="w-5 h-5">⚙️</span>,
  };
  return icons[iconName] || <span className="w-5 h-5">•</span>;
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isDarkMode, setIsDarkMode } = useStore();

  return (
    <div className={cn('min-h-screen flex', isDarkMode ? 'dark' : '')}>
      {/* Sidebar */}
      <motion.div
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'fixed md:relative w-64 h-screen border-r border-border bg-sidebar',
          'z-40 md:z-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 hover:bg-sidebar-accent rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-primary flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span>AB Vision Trader</span>
          </h1>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200',
                location.pathname === item.href
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              {getIcon(item.icon)}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </motion.div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <motion.header
          initial={{ y: -64 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-20 border-b border-border bg-card"
        >
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 hover:bg-secondary rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-foreground hidden sm:block">
                AB Vision Trader
              </h2>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors duration-200"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-warning" />
              ) : (
                <Moon className="w-5 h-5 text-primary" />
              )}
            </button>
          </div>
        </motion.header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
