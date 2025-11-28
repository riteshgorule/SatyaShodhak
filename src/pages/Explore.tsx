import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowUp, ArrowDown, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";

type Vote = {
  upvotes: number;
  downvotes: number;
  user_vote: number | null;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    user_metadata?: {
      avatar_url?: string;
      full_name?: string;
    };
  };
  replies: Comment[];
};

type PublicClaim = {
  id: string;
  claim: string;
  verdict: string;
  confidence: number;
  explanation: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    user_metadata?: {
      avatar_url?: string;
      full_name?: string;
    };
  };
  votes: Vote;
  comments_count: number;
};

const Explore = () => {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<PublicClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [isLoadingComments, setIsLoadingComments] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchPublicClaims();
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchPublicClaims = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .rpc('get_public_claims_with_votes', { search_term: searchQuery });

      if (error) throw error;
      setClaims(data || []);
    } catch (error: any) {
      console.error("Error fetching public claims:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load public claims",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (claimId: string, voteValue: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to vote",
        variant: "destructive",
      });
      return;
    }

    try {
      // If user already voted the same, remove the vote
      const claim = claims.find(c => c.id === claimId);
      if (claim?.votes.user_vote === voteValue) {
        voteValue = 0; // This will remove the vote
      }

      const { error } = await supabase.rpc('handle_claim_vote', {
        p_claim_id: claimId,
        p_vote_value: voteValue
      });

      if (error) throw error;

      // Update the UI
      setClaims(prevClaims =>
        prevClaims.map(claim => {
          if (claim.id === claimId) {
            let newUpvotes = claim.votes.upvotes;
            let newDownvotes = claim.votes.downvotes;
            const currentVote = claim.votes.user_vote;

            // Update vote counts based on previous and new vote
            if (currentVote === 1) newUpvotes--; // Remove previous upvote
            if (currentVote === -1) newDownvotes--; // Remove previous downvote
            if (voteValue === 1) newUpvotes++; // Add new upvote
            if (voteValue === -1) newDownvotes++; // Add new downvote

            return {
              ...claim,
              votes: {
                upvotes: Math.max(0, newUpvotes),
                downvotes: Math.max(0, newDownvotes),
                user_vote: voteValue === 0 ? null : voteValue,
              },
            };
          }
          return claim;
        })
      );
    } catch (error: any) {
      console.error("Error voting:", error);
      toast({
        title: "Vote failed",
        description: error.message || "Could not process your vote",
        variant: "destructive",
      });
    }
  };

  const toggleComments = async (claimId: string) => {
    if (expandedClaims.has(claimId)) {
      const newSet = new Set(expandedClaims);
      newSet.delete(claimId);
      setExpandedClaims(newSet);
    } else {
      setExpandedClaims(prev => new Set([...prev, claimId]));
      await fetchComments(claimId);
    }
  };

  const fetchComments = async (claimId: string) => {
    if (comments[claimId]) return; // Already loaded

    try {
      setIsLoadingComments(prev => ({ ...prev, [claimId]: true }));
      const { data, error } = await supabase
        .from('claim_comments')
        .select(`
          id,
          content,
          created_at,
          user:user_id (id, email, user_metadata)
        `)
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setComments(prev => ({
        ...prev,
        [claimId]: data || []
      }));
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setIsLoadingComments(prev => ({ ...prev, [claimId]: false }));
    }
  };

  const submitComment = async (claimId: string) => {
    if (!user || !commentText.trim()) return;

    try {
      const { data, error } = await supabase
        .from('claim_comments')
        .insert([
          { 
            claim_id: claimId, 
            content: commentText.trim(),
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update the comments list
      const newComment = {
        ...data,
        user: {
          id: user.id,
          email: user.email || '',
          user_metadata: user.user_metadata || {}
        },
        replies: []
      };

      setComments(prev => ({
        ...prev,
        [claimId]: [newComment, ...(prev[claimId] || [])]
      }));

      // Update the comment count
      setClaims(prevClaims =>
        prevClaims.map(claim => 
          claim.id === claimId 
            ? { ...claim, comments_count: (claim.comments_count || 0) + 1 }
            : claim
        )
      );

      setCommentText("");
      setCommentingOn(null);
      
      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      });
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    }
  };

  const toggleClaimExpansion = (claimId: string) => {
    if (expandedClaims.has(claimId)) {
      const newSet = new Set(expandedClaims);
      newSet.delete(claimId);
      setExpandedClaims(newSet);
    } else {
      setExpandedClaims(prev => new Set([...prev, claimId]));
    }
  };

  const getUserInitials = (email: string, userMetadata?: any) => {
    if (userMetadata?.full_name) {
      return userMetadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-end px-4">
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search claims..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPublicClaims()}
              />
            </div>
            <Button onClick={fetchPublicClaims} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 px-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyber-blue" />
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium">No public claims found</h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? "Try a different search term" 
                : "When users make their claims public, they'll appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {claims.map((claim) => (
              <Card key={claim.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={claim.user.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {getUserInitials(claim.user.email, claim.user.user_metadata)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm text-muted-foreground">
                        {claim.user.user_metadata?.full_name || claim.user.email.split('@')[0]}
                        <span className="text-xs text-muted-foreground/70">
                          {' • '}
                          {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <VerdictBadge verdict={claim.verdict} />
                  </div>
                </CardHeader>

                <CardContent className="pb-2">
                  <h3 className="text-lg font-medium mb-2">{claim.claim}</h3>
                  
                  <div className="mb-3">
                    <ConfidenceBar confidence={claim.confidence} />
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground mb-1">Explanation:</p>
                    <p className="text-sm">
                      {expandedClaims.has(claim.id) 
                        ? claim.explanation 
                        : `${claim.explanation.substring(0, 150)}${claim.explanation.length > 150 ? '...' : ''}`}
                    </p>
                    {claim.explanation.length > 150 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-0 text-cyber-blue hover:bg-transparent hover:text-cyber-blue/80"
                        onClick={() => toggleClaimExpansion(claim.id)}
                      >
                        {expandedClaims.has(claim.id) ? 'Show less' : 'Read more'}
                      </Button>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border/40 bg-muted/20 px-6 py-2">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 ${claim.votes.user_vote === 1 ? 'text-cyber-blue' : 'text-muted-foreground'}`}
                        onClick={() => handleVote(claim.id, 1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                        <span className="ml-1">{claim.votes.upvotes}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 ${claim.votes.user_vote === -1 ? 'text-rose-500' : 'text-muted-foreground'}`}
                        onClick={() => handleVote(claim.id, -1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                        <span className="ml-1">{claim.votes.downvotes}</span>
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() => toggleComments(claim.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {claim.comments_count || 0} {claim.comments_count === 1 ? 'comment' : 'comments'}
                      {expandedClaims.has(claim.id) ? (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardFooter>

                {expandedClaims.has(claim.id) && (
                  <div className="border-t border-border/40 p-4">
                    <div className="flex space-x-2 mb-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user ? getUserInitials(user.email || '', user.user_metadata) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Input
                          placeholder="Add a comment..."
                          value={commentingOn === claim.id ? commentText : ''}
                          onChange={(e) => setCommentText(e.target.value)}
                          onFocus={() => setCommentingOn(claim.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              submitComment(claim.id);
                            }
                          }}
                        />
                        {commentingOn === claim.id && (
                          <div className="mt-2 flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCommentingOn(null);
                                setCommentText('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => submitComment(claim.id)}
                              disabled={!commentText.trim()}
                            >
                              Comment
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isLoadingComments[claim.id] ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-cyber-blue" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {comments[claim.id]?.map((comment) => (
                          <div key={comment.id} className="flex space-x-3">
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={comment.user.user_metadata?.avatar_url} />
                              <AvatarFallback>
                                {getUserInitials(comment.user.email, comment.user.user_metadata)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="bg-muted/50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {comment.user.user_metadata?.full_name || comment.user.email.split('@')[0]}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm">{comment.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {(!comments[claim.id] || comments[claim.id].length === 0) && (
                          <p className="text-center text-sm text-muted-foreground py-4">
                            No comments yet. Be the first to comment!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Explore;
