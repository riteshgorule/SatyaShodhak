// src/components/Comment.tsx
import { useState, memo, useCallback, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { CommentProps } from "@/types";
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

// Format date to a readable format
const formatDate = (date: string | Date | undefined): string => {
  if (!date) return 'Invalid date';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date);
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export const Comment = memo(({
  id,
  content,
  userId,
  userName,
  userAvatar,
  timestamp,
  upvotes,
  downvotes,
  userVote,
  claimId,
  onVote,
  onDelete,
}: CommentProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const handleVote = useCallback(async (vote: number) => {
    if (isVoting) return;
    setIsVoting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to vote on comments",
          variant: "destructive",
        });
        return;
      }

      // If user is trying to remove their vote
      if (userVote === vote) {
        vote = 0;
      }

      const { data, error } = await supabase.rpc('handle_comment_vote', {
        p_comment_id: id,
        p_user_id: user.id,
        p_vote: vote
      } as never); // Using 'as never' to bypass type checking temporarily

      if (error) throw error;

      // Call the parent component's onVote callback to refresh the comment data
      onVote?.();
    } catch (error: any) {
      console.error('Error voting on comment:', error);
      toast({
        title: "Error updating vote",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  }, [userVote, onVote, id, toast]);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      // First try to use the RPC function
      const { error: rpcError } = await supabase
        .rpc('delete_comment', { p_comment_id: id } as never) // Using 'as never' to bypass type checking temporarily
        .select()
        .single();

      // If RPC function doesn't exist or fails, show error
      if (rpcError) {
        throw new Error('Failed to delete comment. Please try again later.');
      }

      // Call the parent's onDelete callback if it exists
      if (onDelete) {
        onDelete();
      } 
      // Always call onVote to ensure the parent updates the comment count
      if (onVote) {
        onVote();
      }

      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted.",
      });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error deleting comment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Check if current user is the comment author
  const isAuthor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id === userId;
  };

  const [isUserAuthor, setIsUserAuthor] = useState(false);

  // Check if current user is the author when component mounts
  useEffect(() => {
    const checkAuthor = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsUserAuthor(user?.id === userId);
      } catch (error) {
        console.error('Error checking author:', error);
        setIsUserAuthor(false);
      }
    };
    checkAuthor();
  }, [userId]);

  return (
    <div className="border rounded-lg p-4 mb-4 relative group">
      {isUserAuthor && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
          aria-label="Delete comment"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 text-destructive" />
          )}
        </Button>
      )}
      <div 
        className="flex items-start gap-3"
        role="article"
        aria-label={`Comment by ${userName}`}
      >
        <div className="flex-shrink-0">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium" aria-label="Comment author">{userName}</span>
            <time 
              dateTime={timestamp instanceof Date ? timestamp.toISOString() : timestamp}
              className="text-sm text-muted-foreground"
              title={formatDate(timestamp)}
            >
              {formatDate(timestamp)}
            </time>
          </div>
          <p className="mt-1 text-sm" aria-label="Comment content">{content}</p>
          <div className="flex items-center gap-4 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => handleVote(1)}
              disabled={isVoting}
              aria-label={userVote === 1 ? 'Remove upvote' : 'Upvote comment'}
              aria-pressed={userVote === 1}
            >
              {isVoting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              <span>{upvotes}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => handleVote(-1)}
              disabled={isVoting}
              aria-label={userVote === -1 ? 'Remove downvote' : 'Downvote comment'}
              aria-pressed={userVote === -1}
            >
              {isVoting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsDown className="h-4 w-4" />
              )}
              <span>{downvotes}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});