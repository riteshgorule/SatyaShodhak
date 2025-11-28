import { Shield, AlertTriangle, XCircle, CheckCircle, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

interface VerdictBadgeProps {
  verdict: "TRUE" | "FALSE" | "MISLEADING" | "PARTIALLY_TRUE" | "INCONCLUSIVE";
}

export const VerdictBadge = ({ verdict }: VerdictBadgeProps) => {
  const config = {
    TRUE: {
      bg: "bg-truth-green/10",
      text: "text-truth-green",
      border: "border-truth-green/30",
      icon: CheckCircle,
      label: "TRUE",
    },
    FALSE: {
      bg: "bg-truth-red/10",
      text: "text-truth-red",
      border: "border-truth-red/30",
      icon: XCircle,
      label: "FALSE",
    },
    MISLEADING: {
      bg: "bg-truth-amber/10",
      text: "text-truth-amber",
      border: "border-truth-amber/30",
      icon: AlertTriangle,
      label: "MISLEADING",
    },
    PARTIALLY_TRUE: {
      bg: "bg-cyber-blue/10",
      text: "text-cyber-blue",
      border: "border-cyber-blue/30",
      icon: Shield,
      label: "PARTIALLY TRUE",
    },
    INCONCLUSIVE: {
      bg: "bg-truth-gray/10",
      text: "text-truth-gray",
      border: "border-truth-gray/30",
      icon: HelpCircle,
      label: "INCONCLUSIVE",
    },
  };

  const { bg, text, border, icon: Icon, label } = config[verdict];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 ${bg} ${text} ${border} font-bold text-sm tracking-wider shadow-sm`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </motion.div>
  );
};
