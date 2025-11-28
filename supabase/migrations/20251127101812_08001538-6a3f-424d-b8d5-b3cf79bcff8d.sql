-- Create verification_results table
CREATE TABLE public.verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  claim TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('TRUE', 'FALSE', 'MISLEADING', 'PARTIALLY_TRUE', 'INCONCLUSIVE')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  explanation TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',
  is_saved BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own verification results"
  ON public.verification_results
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification results"
  ON public.verification_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification results"
  ON public.verification_results
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own verification results"
  ON public.verification_results
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_verification_results_user_id ON public.verification_results(user_id);
CREATE INDEX idx_verification_results_created_at ON public.verification_results(created_at DESC);
CREATE INDEX idx_verification_results_is_saved ON public.verification_results(user_id, is_saved) WHERE is_saved = TRUE;

-- Trigger for updating updated_at
CREATE TRIGGER update_verification_results_updated_at
  BEFORE UPDATE ON public.verification_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();