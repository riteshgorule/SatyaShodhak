// src/components/CommentsSection.tsx
import { useState, useEffect, useCallback, memo, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase, type Database } from "@/integrations/supabase/client";
import { Comment } from "./Comment";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import type { CommentType, CommentsSectionProps } from "@/types";

declare module "@supabase/supabase-js" {
  interface SupabaseClient {
    rpc<T = any>(fn: string, params?: Record<string, unknown>): PostgrestFilterBuilder<T>;
  }
}

export const CommentsSection = ({ claimId, onCommentChange }: CommentsSectionProps & { onCommentChange?: (count: number) => void }) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const isMounted = useRef(true);

  const fetchComments = useCallback(async () => {
    if (!claimId) return [];

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(claimId)) {
      console.error('Invalid UUID format for claimId:', claimId);
      toast({
        title: "Error loading comments",
        description: "Invalid claim ID format",
        variant: "destructive",
      });
      return [];
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .rpc('get_comments_with_votes', { p_claim_id: claimId });

      if (error) throw error;

      const commentsData = data || [];
      setComments(commentsData);
      return commentsData;
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error loading comments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [claimId, toast]);

  useEffect(() => {
    if (isMounted.current) {
      fetchComments().catch(console.error);
    }
  }, [fetchComments]);

  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !claimId) return;

    try {
      setIsPosting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to post a comment",
          variant: "destructive",
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, email')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('comments')
        .insert([{
          claim_id: claimId,
          user_id: user.id,
          content: newComment.trim(),
          user_name: profile?.full_name || user.email?.split('@')[0] || 'User',
          user_avatar: profile?.avatar_url || null,
        }]);

      if (error) throw error;

      setNewComment("");
      // Refresh comments
      const updatedComments = await fetchComments();
      
      // Update the comment count in the parent component
      if (onCommentChange) {
        onCommentChange(updatedComments?.length || 0);
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error posting comment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  }, [claimId, newComment, fetchComments, toast]);

  const handleVote = useCallback(async (commentId: string) => {
    // Refresh comments after vote
    if (isMounted.current) {
      const updatedComments = await fetchComments();
      if (onCommentChange) {
        onCommentChange(updatedComments?.length || 0);
      }
    }
  }, [fetchComments, onCommentChange]);

  // Memoize the Comment component to prevent unnecessary re-renders
  const MemoizedComment = memo(Comment);

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">Comments ({comments.length})</h3>
      
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <Button type="submit" disabled={isPosting || !newComment.trim()}>
            {isPosting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <MemoizedComment
              key={comment.id}
              id={comment.id}
              content={comment.content}
              userId={comment.user_id}
              userName={comment.user_name}
              userAvatar={comment.user_avatar}
              timestamp={comment.created_at}
              upvotes={comment.upvotes}
              downvotes={comment.downvotes}
              userVote={comment.user_vote}
              claimId={claimId}
              onVote={() => handleVote(comment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};