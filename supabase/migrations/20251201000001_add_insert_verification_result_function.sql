-- Create a function to insert verification results with proper security
CREATE OR REPLACE FUNCTION public.insert_verification_result(
  p_user_id UUID,
  p_claim TEXT,
  p_verdict TEXT,
  p_confidence INTEGER,
  p_explanation TEXT,
  p_sources JSONB,
  p_is_public BOOLEAN
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.verification_results (
    user_id,
    claim,
    verdict,
    confidence,
    explanation,
    sources,
    is_public
  ) VALUES (
    p_user_id,
    p_claim,
    p_verdict,
    p_confidence,
    p_explanation,
    p_sources,
    COALESCE(p_is_public, true)
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.insert_verification_result(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB, BOOLEAN) TO authenticated;
