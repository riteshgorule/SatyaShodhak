import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { VerificationResult } from "@/pages/Dashboard";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  ThumbsUp, 
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
  Loader2
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
}

export const ResultCard = ({ result, savedResultId, onSaveToggle, onDelete }: ResultCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUseful, setIsUseful] = useState(false);
  const [isSaved, setIsSaved] = useState(!!savedResultId);
  const [isPublic, setIsPublic] = useState<boolean>(result.is_public || false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Update local state when the result prop changes
  useEffect(() => {
    if (result.is_public !== undefined) {
      setIsPublic(result.is_public);
    }
  }, [result.is_public]);

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
      const isNew = !resultId;
      
      // Always update the local state immediately for better UX
      if (makePublic !== undefined) {
        setIsPublic(makePublic);
      }

      if (isNew) {
        // Save new result
        const resultData = {
          user_id: user.id,
          claim: result.claim,
          verdict: result.verdict,
          confidence: result.confidence,
          explanation: result.explanation,
          sources: result.sources,
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
        
        toast({
          title: makePublic ? "Result saved and shared" : "Result saved",
          description: makePublic 
            ? "This claim is now public and visible to others in the Explore section."
            : "You can find this in your Saved Results.",
        });
        
        // Update the result with the new ID
        result.id = data.id;
        
        // Call the onSaveToggle callback with the new saved result ID
        onSaveToggle?.();
      } else {
        // For existing result, update the public status
        if (makePublic !== undefined) {
          const { error: updateError } = await supabase
            .from("verification_results")
            .update({ 
              is_public: makePublic,
              updated_at: new Date().toISOString()
            })
            .eq("id", resultId);

          if (updateError) throw updateError;
          
          // Update the local state to reflect the change
          result.is_public = makePublic;
          
          toast({
            title: makePublic ? "Made public" : "Made private",
            description: makePublic 
              ? "This claim is now visible to others in the Explore section."
              : "This claim is now private and only visible to you.",
          });
        }

        // Update local state
        if (makePublic !== undefined) {
          setIsPublic(makePublic);
          
          // Show toast with the new status
          toast({
            title: makePublic ? "Made public" : "Made private",
            description: makePublic 
              ? "This claim is now visible to others in the Explore section."
              : "This claim is now private and only visible to you.",
          });
        } else {
          // If just toggling save status (not changing public/private)
          setIsSaved(false);
          toast({
            title: "Removed from saved",
            description: "This claim has been removed from your saved results.",
          });
        }
        
        onSaveToggle?.();
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

  const handleReVerify = () => {
    toast({
      title: "Re-verification started",
      description: "Checking for updated information...",
    });
  };

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
              {new Date(result.timestamp).toLocaleDateString()}
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
              Evidence Sources ({result.sources.length})
            </button>

            <motion.div
              initial={false}
              animate={{ height: isExpanded ? "auto" : 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2">
                {result.sources.map((source, index) => (
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseful}
              className={isUseful ? "bg-truth-green/10 text-truth-green border-truth-green/30" : ""}
            >
              {isUseful ? (
                <ThumbsUp className="w-4 h-4 mr-2 fill-current" />
              ) : (
                <ThumbsUp className="w-4 h-4 mr-2" />
              )}
              {isUseful ? "Useful" : "Useful?"}
            </Button>
            
            <div className="flex gap-2">
              {isSaved ? (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isSaving) return;
                      
                      // Optimistically update the UI
                      const newPublicState = !isPublic;
                      setIsPublic(newPublicState);
                      
                      try {
                        await toggleSave(e, newPublicState);
                      } catch (error) {
                        // Revert on error
                        setIsPublic(!newPublicState);
                        console.error('Failed to update visibility:', error);
                      }
                    }}
                    disabled={isSaving}
                    className={`flex items-center gap-2 transition-colors ${
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
                    <span className="min-w-[50px] text-center">
                      {isSaving ? 'Saving...' : isPublic ? 'Public' : 'Private'}
                    </span>
                  </Button>
                </div>
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

            <Button variant="outline" size="sm" onClick={handleReVerify}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-Verify
            </Button>

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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
