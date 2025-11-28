import { motion } from "framer-motion";
import { Search, Shield, Globe } from "lucide-react";
import { CyclingText } from "./CyclingText";

export const AnimatedScanner = () => {
  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-card p-8">
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Animated Scanner Visual */}
        <div className="relative w-48 h-48">
          {/* Outer rotating ring */}
          <motion.div
            className="absolute inset-0 border-4 border-cyber-blue/30 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-cyber-blue rounded-full shadow-glow" />
          </motion.div>

          {/* Middle pulsing ring */}
          <motion.div
            className="absolute inset-4 border-2 border-truth-green/40 rounded-full"
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Inner rotating ring */}
          <motion.div
            className="absolute inset-8 border-2 border-truth-amber/50 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 w-3 h-3 bg-truth-amber rounded-full" />
          </motion.div>

          {/* Center icon */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Shield className="w-16 h-16 text-cyber-blue" />
          </motion.div>

          {/* Orbiting icons */}
          <motion.div
            className="absolute top-1/2 left-1/2"
            animate={{
              x: [0, 60, 0, -60, 0],
              y: [0, -60, 0, 60, 0],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Search className="w-6 h-6 text-cyber-blue opacity-60" />
          </motion.div>

          <motion.div
            className="absolute top-1/2 left-1/2"
            animate={{
              x: [0, -50, 0, 50, 0],
              y: [0, 50, 0, -50, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <Globe className="w-5 h-5 text-truth-green opacity-50" />
          </motion.div>
        </div>

        {/* Cycling Text */}
        <div className="text-center space-y-3">
          <CyclingText />
          <p className="text-sm text-muted-foreground">
            Cross-referencing fact-checking databases
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-cyber-blue rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
