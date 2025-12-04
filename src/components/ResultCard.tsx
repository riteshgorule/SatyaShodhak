import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import type { VerificationResult, Verdict, Source } from "@/types";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { CommentsSection } from "./CommentsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Helper function to validate UUID format
const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Type guard to check if a value is a valid Verdict
const isVerdict = (value: string): value is Verdict => {
  return ["TRUE", "FALSE", "MISLEADING", "PARTIALLY_TRUE", "INCONCLUSIVE"].includes(value);
};
import { 
  ArrowUp,
  ArrowDown,
  BookmarkPlus, 
  Bookmark,
  Share2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Trash2,
  ChevronRight,
  Globe,
  Lock,
  Loader2,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResultCardProps {
  onDelete?: () => void;
  result: VerificationResult;
  savedResultId?: string;
  onSaveToggle?: () => void;
  onReVerify?: () => Promise<VerificationResult | void>;
  onCommentCountChange?: (count: number) => void;
  showReverify?: boolean;
}

export const ResultCard = ({ 
  result, 
  savedResultId, 
  onSaveToggle, 
  onDelete, 
  onReVerify,
  onCommentCountChange,
  showReverify = true 
}: ResultCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUseful, setIsUseful] = useState(false);
  const [isSaved, setIsSaved] = useState(!!savedResultId);
  const [isPublic, setIsPublic] = useState<boolean>(result.is_public || false);
  const [isSaving, setIsSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isReVerifying, setIsReVerifying] = useState(false);
  const [voteCounts, setVoteCounts] = useState({
    upvotes: result.upvotes || 0,
    downvotes: result.downvotes || 0,
  });
  const [userVote, setUserVote] = useState<number | null>(result.user_vote || null);
  const { toast } = useToast();
  
  // Update local state when the result prop changes
  useEffect(() => {
    // Initialize isPublic from the result prop
    setIsPublic(result.is_public || false);
    
    // If we have a savedResultId, ensure we're in saved mode
    if (savedResultId) {
      setIsSaved(true);
    }
  }, [result, savedResultId]);

  // Format the timestamp
  const formatTimestamp = useCallback((timestamp: string | Date | undefined): string => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return isNaN(date.getTime()) ? '' : date.toLocaleString();
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return '';
    }
  }, []);

  const handleVote = async (vote: 1 | -1) => {
    if (isVoting) return;
    setIsVoting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to vote",
          variant: "destructive",
        });
        return;
      }

      // If user is trying to remove their vote
      const newVote = userVote === vote ? 0 : vote;
      
      const { error } = await supabase.rpc('handle_verification_vote', {
        p_verification_id: result.id,
        p_user_id: user.id,
        p_vote: newVote as number
      });

      if (error) throw error;

      // Update local state
      setUserVote(newVote === 0 ? null : newVote);
      setVoteCounts(prev => {
        // Remove previous vote if exists
        const changes = { ...prev };
        if (userVote === 1) changes.upvotes -= 1;
        if (userVote === -1) changes.downvotes -= 1;
        
        // Add new vote if not removing
        if (newVote === 1) changes.upvotes += 1;
        if (newVote === -1) changes.downvotes += 1;
        
        return changes;
      });

    } catch (error: any) {
      console.error('Error voting:', error);
      toast({
        title: "Error updating vote",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleUseful = () => {
    setIsUseful(!isUseful);
    toast({
      title: isUseful ? "Feedback removed" : "Thanks for your feedback!",
      description: isUseful ? "" : "This helps improve our verification system.",
    });
  };

  const toggleSave = async (e?: React.MouseEvent, makePublic?: boolean) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save results.",
          variant: "destructive",
        });
        return;
      }

      const resultId = savedResultId || result.id;
      const isNew = !savedResultId;
      
      // For existing posts, update the visibility
      if (!isNew && makePublic !== undefined) {
        const { error: updateError } = await supabase
          .from("verification_results")
          .update({ 
            is_public: makePublic,
            updated_at: new Date().toISOString()
          })
          .eq("id", resultId);

        if (updateError) throw updateError;
        
        // Update the local state to reflect the change
        setIsPublic(makePublic);
        result.is_public = makePublic;
        
        // If we have an onSaveToggle callback, call it to refresh the parent component's state
        if (onSaveToggle) {
          onSaveToggle();
        }
        
        toast({
          title: makePublic ? "Made Public" : "Made Private",
          description: makePublic 
            ? "This post is now visible to everyone."
            : "This post is now private and only visible to you.",
        });
        return;
      }

      // Handle new post creation
      if (isNew) {
        const resultData = {
          user_id: user.id,
          claim: result.claim,
          verdict: result.verdict,
          confidence: result.confidence,
          explanation: result.explanation,
          sources: JSON.stringify(result.sources), // Convert sources to JSON string
          is_saved: true,
          is_public: makePublic || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from("verification_results")
          .insert(resultData)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setIsSaved(true);
        setIsPublic(makePublic || false);
        
        // Update the result with the new ID and other fields
        result.id = data.id;
        result.is_public = makePublic || false;
        result.user_id = user.id;
        
        // If we have an onSaveToggle callback, call it to refresh the parent component's state
        if (onSaveToggle) {
          onSaveToggle();
        }
        
        toast({
          title: makePublic ? "Result saved and shared" : "Result saved",
          description: makePublic 
            ? "This claim is now public and visible to others in the Explore section."
            : "You can find this in your Saved Results.",
        });
      } else {
        // If just toggling save status (not changing public/private)
        setIsSaved(false);
        
        // If we have an onSaveToggle callback, call it to refresh the parent component's state
        if (onSaveToggle) {
          onSaveToggle();
        }
        
        toast({
          title: "Removed from saved",
          description: "This claim has been removed from your saved results.",
        });
      }
    } catch (error: any) {
      console.error("Save error:", error);
      
      // More specific error handling
      let errorMessage = error.message || "An error occurred while saving.";
      if (error.code === '42P01') { // Undefined table error
        errorMessage = "Database error: Table not found. Please contact support.";
      } else if (error.code === '42703') { // Undefined column error
        errorMessage = "Database error: Column not found. Please refresh the page and try again.";
      }
      
      toast({
        title: "Failed to save",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(
      `SatyaShodhak Verification: "${result.claim}" - Verdict: ${result.verdict} (${result.confidence}% confidence)`
    );
    toast({
      title: "Copied to clipboard",
      description: "Share this verification result with others.",
    });
  };

  const handleReVerifyClick = async () => {
    if (!onReVerify) return;
    
    setIsReVerifying(true);
    try {
      await onReVerify();
    } catch (error) {
      // Error is already handled in the parent component
    } finally {
      setIsReVerifying(false);
    }
  };

  // This function is no longer needed as the functionality is handled by handleReVerifyClick
  const handleReVerify = async () => {
    if (isReVerifying) return;
    
    setIsReVerifying(true);
    
    const toastId = toast({
      title: "Re-verifying claim...",
      description: "Checking for updated information...",
      duration: 5000,
    });

    try {
      const { data, error } = await supabase.functions.invoke("verify-claim", {
        body: { 
          claim: result.claim,
          is_reverification: true // Add flag to indicate this is a re-verification
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.result) {
        // Update the result with the new verification data
        const updatedResult = {
          ...result,
          verdict: data.result.verdict,
          confidence: data.result.confidence,
          explanation: data.result.explanation,
          sources: data.result.sources,
          timestamp: new Date(),
        };

        // Update the UI
        toast({
          title: "Re-verification complete",
          description: "The claim has been re-verified with the latest information.",
        });

        // Trigger parent component to update the result
        if (onSaveToggle) {
          onSaveToggle();
        }

        // Return the updated result to the parent component
        return updatedResult;
      }
    } catch (error: any) {
      console.error("Re-verification error:", error);
      toast({
        title: "Re-verification failed",
        description: error.message || "An error occurred while re-verifying the claim.",
        variant: "destructive",
      });
    } finally {
      setIsReVerifying(false);
    }
  };

  // Helper to safely parse sources
  const parseSources = (sources: unknown): Source[] => {
    if (!sources) return [];
    
    try {
      // If sources is a string, parse it
      let parsedSources = sources;
      if (typeof sources === 'string') {
        try {
          parsedSources = JSON.parse(sources);
        } catch (e) {
          console.error('Failed to parse sources string:', e);
          return [];
        }
      }
      
      // If it's an array, process each item
      if (Array.isArray(parsedSources)) {
        return parsedSources.map((source: unknown) => ({
          title: source && typeof source === 'object' && 'title' in source ? String(source.title) : 'No title',
          snippet: source && typeof source === 'object' && 'snippet' in source ? String(source.snippet) : '',
          url: source && typeof source === 'object' && 'url' in source ? String(source.url) : ''
        }));
      }
      
      // If it's an object, wrap it in an array
      if (parsedSources && typeof parsedSources === 'object') {
        return [{
          title: 'title' in parsedSources ? String(parsedSources.title) : 'No title',
          snippet: 'snippet' in parsedSources ? String(parsedSources.snippet) : '',
          url: 'url' in parsedSources ? String(parsedSources.url) : ''
        }];
      }
    } catch (e) {
      console.error('Error parsing sources:', e);
    }
    
    return [];
  };

  // Handle sources that might be in different formats
  const getSources = useCallback((): Source[] => {
    return parseSources(result.sources);
  }, [result.sources]);

  // Format the verdict for display
  const formatVerdict = useCallback((verdict: string): string => {
    if (!isVerdict(verdict)) {
      console.warn('Invalid verdict value:', verdict);
      return 'Unknown';
    }
    
    switch (verdict) {
      case 'TRUE': return 'True';
      case 'FALSE': return 'False';
      case 'MISLEADING': return 'Misleading';
      case 'PARTIALLY_TRUE': return 'Partially True';
      case 'INCONCLUSIVE': return 'Inconclusive';
      default:
        // This should never happen due to the type guard, but TypeScript needs this
        return 'Unknown';
    }
  }, []);

  // Gradient backgrounds based on verdict
  const getCardGradient = () => {
    switch (result.verdict) {
      case "TRUE":
        return "bg-gradient-to-br from-truth-green/5 to-transparent";
      case "FALSE":
        return "bg-gradient-to-br from-truth-red/5 to-transparent";
      case "MISLEADING":
        return "bg-gradient-to-br from-truth-amber/5 to-transparent";
      case "PARTIALLY_TRUE":
        return "bg-gradient-to-br from-cyber-blue/5 to-transparent";
      default:
        return "bg-gradient-to-br from-truth-gray/5 to-transparent";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -4 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
    >
      <Card className={`shadow-card border-border/50 overflow-hidden rounded-2xl ${getCardGradient()}`}>
        <CardHeader className="space-y-4 pb-4">
          {/* Verdict and Confidence */}
          <div className="flex items-start justify-between gap-4">
            <VerdictBadge verdict={result.verdict} />
            <span className="text-sm text-muted-foreground">
              {formatTimestamp(result.timestamp)}
            </span>
          </div>

          <ConfidenceBar confidence={result.confidence} />

          {/* Claim */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Claim Verified
            </p>
            <p className="text-lg font-medium leading-relaxed">{result.claim}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Explanation */}
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Explanation
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">{result.explanation}</p>
          </div>

          {/* Expandable Evidence Sources */}
          <div className="space-y-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyber-blue hover:text-cyber-blue/80 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Evidence Sources ({getSources().length})
            </button>

            <motion.div
              initial={false}
              animate={{ height: isExpanded ? "auto" : 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2">
                {getSources().map((source, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-muted/30 rounded-lg p-4 space-y-2 border border-border/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm">{source.title}</h4>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyber-blue hover:text-cyber-blue/80 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {source.snippet}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
            <div className="flex items-center gap-1 bg-muted/20 rounded-md p-1 pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleVote(1);
                }}
                disabled={isVoting}
                className={`h-8 w-8 p-0 rounded ${
                  userVote === 1 
                    ? 'text-white bg-orange-500 hover:bg-orange-600' 
                    : 'text-gray-500 hover:bg-muted/50 hover:text-orange-500'
                } transition-colors`}
              >
                <svg 
                  className={`h-4 w-4 ${userVote === 1 ? 'fill-current' : ''}`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={userVote === 1 ? 0 : 1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </Button>
              
              <span className={`text-sm font-medium min-w-[24px] text-center ${
                userVote === 1 ? 'text-orange-600' : 
                userVote === -1 ? 'text-blue-600' : 
                'text-gray-700'
              }`}>
                {voteCounts.upvotes - voteCounts.downvotes}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleVote(-1);
                }}
                disabled={isVoting}
                className={`h-8 w-8 p-0 rounded ${
                  userVote === -1 
                    ? 'text-white bg-blue-500 hover:bg-blue-600' 
                    : 'text-gray-500 hover:bg-muted/50 hover:text-blue-500'
                } transition-colors`}
              >
                <svg 
                  className={`h-4 w-4 ${userVote === -1 ? 'fill-current' : ''}`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={userVote === -1 ? 0 : 1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </div>
            
            <div className="flex gap-2">
              {isSaved ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isSaving) return;
                    await toggleSave(e, !isPublic);
                  }}
                  disabled={isSaving}
                  className={`flex items-center gap-2 ${
                    isPublic 
                      ? 'bg-cyber-blue/10 text-cyber-blue border-cyber-blue/30 hover:bg-cyber-blue/20' 
                      : 'bg-muted/50 hover:bg-muted/70'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPublic ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : isPublic ? 'Public' : 'Private'}</span>
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Save</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSave(e, false);
                      }}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Save as Private</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSave(e, true);
                      }}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Globe className="w-4 h-4" />
                      <div>
                        <div>Save & Share Publicly</div>
                        <div className="text-xs text-muted-foreground">Visible in Explore</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {showReverify && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReVerifyClick}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-blue-200 
                          dark:bg-blue-800/90 dark:hover:bg-blue-700/90 dark:text-white dark:border-blue-600 
                          hover:text-white transition-all duration-200 flex items-center gap-2 group"
              >
                {isReVerifying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500 dark:text-blue-100" />
                )}
                <span className="font-medium dark:font-normal">Verify Claim</span>
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowComments(!showComments);
              }}
            >
              <MessageSquare className="h-4 w-4" />
              {showComments ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showComments && (
        <div className="mt-4 pl-2 border-l-2 border-muted">
          {isValidUuid(result.id) ? (
            <CommentsSection 
              claimId={result.id} 
              onCommentChange={onCommentCountChange} 
            />
          ) : (
            <div className="text-sm text-muted-foreground p-2">
              Unable to load comments: Invalid claim ID format
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
