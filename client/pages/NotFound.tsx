import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-lg text-foreground mb-2">Page Not Found</p>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist. Let's get you back on track.
        </p>

        <div className="space-y-3">
          <Link to="/" className="block">
            <Button className="w-full">
              Return to Dashboard
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">
            Tried to access: <code className="bg-secondary px-2 py-1 rounded">{location.pathname}</code>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
