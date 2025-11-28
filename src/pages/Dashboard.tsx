import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedScanner } from "@/components/AnimatedScanner";
import { ResultCard } from "@/components/ResultCard";
import { Search, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface VerificationResult {
  id: string;
  verdict: "TRUE" | "FALSE" | "MISLEADING" | "PARTIALLY_TRUE" | "INCONCLUSIVE";
  confidence: number;
  explanation: string;
  sources: Array<{
    title: string;
    snippet: string;
    url: string;
  }>;
  claim: string;
  timestamp: Date;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [claim, setClaim] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleVerify = async () => {
    if (!claim.trim()) {
      toast({
        title: "Empty claim",
        description: "Please enter a statement to verify.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-claim", {
        body: { claim: claim.trim() },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Verification failed",
          description: data.error,
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      if (data?.result) {
        const newResult: VerificationResult = {
          id: Math.random().toString(36).substr(2, 9),
          verdict: data.result.verdict,
          confidence: data.result.confidence,
          explanation: data.result.explanation,
          sources: data.result.sources,
          claim: data.result.claim,
          timestamp: new Date(),
        };

        setResults((prev) => [newResult, ...prev]);
        setClaim("");

        toast({
          title: "Verification complete",
          description: "Your claim has been analyzed using AI.",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Verification failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <Navbar user={user} />

      <main className="p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto space-y-8"
        >
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-wide flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-cyber-blue" />
              Fact Verification Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Paste any statement to verify its authenticity against global sources
            </p>
          </div>

          {/* Input Section */}
          <Card className="shadow-card border-border/50">
            <div className="p-8 space-y-4">
              <div className="relative">
                <Textarea
                  placeholder='Example: "COVID-19 vaccines cause infertility" — Verify'
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  className="min-h-[160px] text-lg resize-none bg-background/50 focus:bg-background focus:ring-2 focus:ring-cyber-blue/50 focus:shadow-glow transition-all duration-300 border-border/50"
                  disabled={isVerifying}
                />
              </div>

              <div className="space-y-3">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    onClick={handleVerify}
                    disabled={isVerifying || !claim.trim()}
                    size="lg"
                    className="w-full bg-cyber-blue hover:bg-cyber-blue/90 text-primary shadow-glow transition-all duration-300 rounded-xl font-semibold text-lg py-6"
                  >
                    <Search className="mr-2 w-5 h-5" />
                    {isVerifying ? "Verifying..." : "Verify Claim"}
                  </Button>
                </motion.div>
                
                <p className="text-xs text-center text-muted-foreground italic">
                  🔒 Your data is never stored until you choose to save it.
                </p>
              </div>
            </div>
          </Card>

          {/* Animated Scanner */}
          <AnimatePresence>
            {isVerifying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <AnimatedScanner />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <AnimatePresence mode="popLayout">
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold tracking-wide">Verification Results</h2>
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ResultCard result={result} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
};

// Simple Card component for the input section
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border ${className}`}>{children}</div>
);

export default Dashboard;
