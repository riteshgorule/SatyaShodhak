-- Function to get public claims with vote counts
CREATE OR REPLACE FUNCTION public.get_public_claims_with_votes(search_term TEXT DEFAULT '')
RETURNS TABLE (
  id UUID,
  claim TEXT,
  verdict TEXT,
  confidence INTEGER,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  user_metadata JSONB,
  upvotes BIGINT,
  downvotes BIGINT,
  user_vote INTEGER,
  comments_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    vr.id,
    vr.claim,
    vr.verdict,
    vr.confidence,
    vr.explanation,
    vr.created_at,
    vr.user_id,
    (SELECT raw_user_meta_data FROM auth.users WHERE id = vr.user_id) as user_metadata,
    COALESCE((SELECT COUNT(*) FROM public.claim_votes WHERE claim_id = vr.id AND vote = 1), 0)::BIGINT as upvotes,
    COALESCE((SELECT COUNT(*) FROM public.claim_votes WHERE claim_id = vr.id AND vote = -1), 0)::BIGINT as downvotes,
    (SELECT vote FROM public.claim_votes WHERE claim_id = vr.id AND user_id = auth.uid() LIMIT 1) as user_vote,
    COALESCE((SELECT COUNT(*) FROM public.claim_comments WHERE claim_id = vr.id), 0)::BIGINT as comments_count
  FROM 
    public.verification_results vr
  WHERE 
    vr.is_public = TRUE
    AND (search_term = '' OR vr.claim ILIKE '%' || search_term || '%')
  ORDER BY 
    vr.created_at DESC;
$$;

-- Function to handle voting
CREATE OR REPLACE FUNCTION public.handle_claim_vote(
  p_claim_id UUID,
  p_vote_value INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if vote already exists
  IF EXISTS (SELECT 1 FROM public.claim_votes 
             WHERE claim_id = p_claim_id AND user_id = auth.uid()) THEN
    
    -- If vote value is 0, remove the vote
    IF p_vote_value = 0 THEN
      DELETE FROM public.claim_votes 
      WHERE claim_id = p_claim_id AND user_id = auth.uid();
    ELSE
      -- Update existing vote
      UPDATE public.claim_votes
      SET 
        vote = p_vote_value,
        updated_at = NOW()
      WHERE 
        claim_id = p_claim_id 
        AND user_id = auth.uid();
    END IF;
  ELSIF p_vote_value != 0 THEN
    -- Insert new vote
    INSERT INTO public.claim_votes (claim_id, user_id, vote)
    VALUES (p_claim_id, auth.uid(), p_vote_value);
  END IF;
  
  -- Update the verification_results table with the new vote counts
  -- This is a denormalization for better query performance
  UPDATE public.verification_results vr
  SET 
    updated_at = NOW()
  WHERE 
    vr.id = p_claim_id;
    
  RETURN;
END;
$$;
