-- Create a function to update verification results with proper security
CREATE OR REPLACE FUNCTION public.update_verification_result(
  p_id UUID,
  p_user_id UUID,
  p_verdict TEXT,
  p_confidence INTEGER,
  p_explanation TEXT,
  p_sources JSONB
) RETURNS VOID AS $$
BEGIN
  -- This will respect RLS policies
  UPDATE public.verification_results
  SET 
    verdict = p_verdict,
    confidence = p_confidence,
    explanation = p_explanation,
    sources = p_sources,
    updated_at = NOW()
  WHERE id = p_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification record not found or access denied';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_verification_result(UUID, UUID, TEXT, INTEGER, TEXT, JSONB) TO authenticated;
