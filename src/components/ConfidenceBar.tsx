import { motion } from "framer-motion";

interface ConfidenceBarProps {
  confidence: number;
}

export const ConfidenceBar = ({ confidence }: ConfidenceBarProps) => {
  const getColor = () => {
    if (confidence >= 80) return "bg-truth-green";
    if (confidence >= 60) return "bg-cyber-blue";
    if (confidence >= 40) return "bg-truth-amber";
    return "bg-truth-red";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Confidence Score
        </span>
        <span className="text-lg font-bold">{confidence}%</span>
      </div>

      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className={`h-full rounded-full ${getColor()}`}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {confidence >= 80 && "High confidence - strong evidence supporting this verdict"}
        {confidence >= 60 && confidence < 80 && "Moderate confidence - multiple sources consulted"}
        {confidence >= 40 && confidence < 60 && "Limited confidence - conflicting information found"}
        {confidence < 40 && "Low confidence - insufficient evidence available"}
      </p>
    </div>
  );
};
