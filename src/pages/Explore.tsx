import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ResultCard } from "@/components/ResultCard";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { VerificationResult } from "./Dashboard";

export const Explore = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [publicClaims, setPublicClaims] = useState<VerificationResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });

    // Fetch public claims
    fetchPublicClaims();
  }, []);

  const fetchPublicClaims = async (query = "") => {
    try {
      setIsLoading(true);
      let queryBuilder = supabase
        .from("verification_results")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (query) {
        queryBuilder = queryBuilder.ilike("claim", `%${query}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Transform the data to match the VerificationResult interface
      const formattedData = data.map((claim: any) => ({
        ...claim,
        timestamp: new Date(claim.created_at),
        sources: claim.sources || [],
        upvotes: claim.upvotes || 0,
        downvotes: claim.downvotes || 0,
        user_vote: claim.user_vote || null,
        comments_count: claim.comments_count || 0,
      }));

      setPublicClaims(formattedData);
    } catch (error: any) {
      toast({
        title: "Error loading public claims",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPublicClaims(searchQuery);
  };

  return (
    <div className="min-h-screen bg-background">
      {user && <Navbar user={user} />}
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Explore Public Claims</h1>
              <p className="text-muted-foreground">
                Browse through claims verified by our community
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search claims..."
                  className="pl-10 pr-4 py-6 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  type="submit" 
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>

            {/* Results */}
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : publicClaims.length > 0 ? (
                <div className="grid gap-6">
                  {publicClaims.map((result) => (
                    <ResultCard 
                      key={result.id} 
                      result={result} 
                      onDelete={user?.id === result.user_id ? async () => {
                        // Refresh the claims after deletion
                        await fetchPublicClaims(searchQuery);
                      } : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? "No public claims found matching your search." 
                      : "No public claims available yet. Be the first to verify a claim!"}
                  </p>
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery("");
                        fetchPublicClaims("");
                      }}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Explore;
