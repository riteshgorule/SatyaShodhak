-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own verification results" ON public.verification_results;

-- New policy: Users can view their own verification results and public ones
CREATE POLICY "Users can view their own and public verification results"
  ON public.verification_results
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- Update insert policy to allow setting is_public
DROP POLICY IF EXISTS "Users can insert their own verification results" ON public.verification_results;

CREATE POLICY "Users can insert their own verification results"
  ON public.verification_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update update policy to handle is_public
DROP POLICY IF EXISTS "Users can update their own verification results" ON public.verification_results;

CREATE POLICY "Users can update their own verification results"
  ON public.verification_results
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update delete policy (keep as is, but explicitly state it)
DROP POLICY IF EXISTS "Users can delete their own verification results" ON public.verification_results;

CREATE POLICY "Users can delete their own verification results"
  ON public.verification_results
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to get public claims with vote information
CREATE OR REPLACE FUNCTION public.get_public_claims_with_votes(search_term TEXT DEFAULT '')
RETURNS TABLE (
  id UUID,
  claim TEXT,
  verdict TEXT,
  confidence INTEGER,
  explanation TEXT,
  sources JSONB,
  is_public BOOLEAN,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  upvotes BIGINT,
  downvotes BIGINT,
  user_vote INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vr.*,
    COALESCE(up.upvotes, 0)::BIGINT as upvotes,
    COALESCE(down.downvotes, 0)::BIGINT as downvotes,
    COALESCE(uv.vote, 0)::INTEGER as user_vote
  FROM 
    public.verification_results vr
  LEFT JOIN (
    SELECT 
      claim_id, 
      COUNT(*) FILTER (WHERE vote = 1) as upvotes
    FROM 
      public.claim_votes
    GROUP BY 
      claim_id
  ) up ON vr.id = up.claim_id
  LEFT JOIN (
    SELECT 
      claim_id, 
      COUNT(*) FILTER (WHERE vote = -1) as downvotes
    FROM 
      public.claim_votes
    GROUP BY 
      claim_id
  ) down ON vr.id = down.claim_id
  LEFT JOIN (
    SELECT 
      claim_id, 
      vote
    FROM 
      public.claim_votes
    WHERE 
      user_id = auth.uid()
  ) uv ON vr.id = uv.claim_id
  WHERE 
    vr.is_public = true
    AND (search_term = '' OR vr.claim ILIKE '%' || search_term || '%')
  ORDER BY 
    vr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
