import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { ResultCard } from "@/components/ResultCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, List, LayoutGrid, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const History = () => {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [verificationToDelete, setVerificationToDelete] = useState<string | null>(null);
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
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("verification_results")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHistory(data || []);
    } catch (error: any) {
      console.error("Failed to fetch history:", error);
      toast({
        title: "Failed to load history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVerification = (id: string) => {
    setVerificationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!verificationToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("verification_results")
        .delete()
        .eq("id", verificationToDelete);

      if (error) throw error;

      setHistory(history.filter(item => item.id !== verificationToDelete));
      
      toast({
        title: "Verification deleted",
        description: "The verification has been removed from your history.",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Failed to delete",
        description: error.message || "An error occurred while deleting the verification.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setVerificationToDelete(null);
    }
  };

  const filteredItems = searchQuery
    ? history.filter((item) =>
        item.claim.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : history;

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
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-wide">Verification History</h1>
            <p className="text-muted-foreground text-lg">
              Review your past fact-checking results
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search your history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("table")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyber-blue" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border/50 shadow-card">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No results found matching your search."
                  : "No verification history found."}
              </p>
            </div>
          ) : viewMode === "card" ? (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                    transition={{ duration: 0.2 }}
                    className="relative group"
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
                      onSaveToggle={fetchHistory}
                      onDelete={() => handleDeleteVerification(item.id)}
                    />
                    <button
                      onClick={() => handleDeleteVerification(item.id)}
                      className="absolute -right-2 -top-2 p-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md hover:bg-destructive/90 z-10"
                      aria-label="Delete verification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Claim</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Verdict</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold">{item.claim}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold">{item.verdict}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {item.confidence}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the verification result from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;
