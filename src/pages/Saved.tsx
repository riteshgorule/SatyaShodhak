import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { ResultCard } from "@/components/ResultCard";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Saved = () => {
  const [user, setUser] = useState<User | null>(null);
  const [savedResults, setSavedResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    if (user) {
      fetchSavedResults();
    }
  }, [user]);

  const fetchSavedResults = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("verification_results")
        .select("*")
        .eq("is_saved", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setSavedResults(data || []);
    } catch (error: any) {
      console.error("Failed to fetch saved results:", error);
      toast({
        title: "Failed to load saved results",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
          className="max-w-6xl mx-auto space-y-6"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-wide flex items-center gap-3">
              <BookmarkPlus className="w-8 h-8 text-cyber-blue" />
              Saved Results
            </h1>
            <p className="text-muted-foreground text-lg">
              Access your bookmarked verification results
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyber-blue" />
            </div>
          ) : savedResults.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl border border-border/50 shadow-card">
              <div className="text-center space-y-4 p-8">
                <BookmarkPlus className="w-16 h-16 text-muted-foreground mx-auto opacity-40" />
                <p className="text-xl text-muted-foreground">No saved results yet</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  When you save verification results from the dashboard, they'll appear here for easy
                  access.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {savedResults.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ResultCard
                    result={{
                      id: item.id,
                      claim: item.claim,
                      verdict: item.verdict,
                      confidence: item.confidence,
                      explanation: item.explanation,
                      sources: item.sources,
                      timestamp: new Date(item.created_at),
                    }}
                    savedResultId={item.id}
                    onSaveToggle={fetchSavedResults}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Saved;
