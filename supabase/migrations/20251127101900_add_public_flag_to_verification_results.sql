-- Add is_public column to verification_results
ALTER TABLE public.verification_results 
ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Update RLS policies to allow public read access
DROP POLICY IF EXISTS "Users can view their own verification results" ON public.verification_results;

-- New policy: Anyone can view public results, users can view their own private results
CREATE POLICY "Anyone can view public verification results"
  ON public.verification_results
  FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Create indexes for public results
CREATE INDEX idx_verification_results_is_public ON public.verification_results(is_public) WHERE is_public = TRUE;

-- Create a table for votes
CREATE TABLE public.claim_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.verification_results(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)), -- -1 for downvote, 1 for upvote
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(claim_id, user_id)
);

-- Enable RLS for votes
ALTER TABLE public.claim_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for votes
CREATE POLICY "Users can manage their own votes"
  ON public.claim_votes
  FOR ALL
  USING (auth.uid() = user_id);

-- Create a table for comments
CREATE TABLE public.claim_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.verification_results(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.claim_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for comments
ALTER TABLE public.claim_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments
CREATE POLICY "Anyone can view comments on public claims"
  ON public.claim_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.verification_results 
    WHERE id = claim_id AND (is_public = true OR auth.uid() = user_id)
  ));

CREATE POLICY "Users can manage their own comments"
  ON public.claim_comments
  FOR ALL
  USING (auth.uid() = user_id);

-- Create a function to get vote count for a claim
CREATE OR REPLACE FUNCTION public.get_claim_votes(claim_id UUID)
RETURNS TABLE(upvotes BIGINT, downvotes BIGINT, user_vote SMALLINT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0)::BIGINT as upvotes,
    COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0)::BIGINT as downvotes,
    (SELECT vote FROM public.claim_votes WHERE claim_id = $1 AND user_id = auth.uid() LIMIT 1) as user_vote
  FROM public.claim_votes
  WHERE claim_id = $1;
$$;
