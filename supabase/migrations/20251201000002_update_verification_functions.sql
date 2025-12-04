-- Update the insert function to bypass RLS
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
  -- Temporarily disable RLS for this transaction
  EXECUTE 'SET LOCAL row_security = off';
  
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

-- Update the update function to bypass RLS
CREATE OR REPLACE FUNCTION public.update_verification_result(
  p_id UUID,
  p_user_id UUID,
  p_verdict TEXT,
  p_confidence INTEGER,
  p_explanation TEXT,
  p_sources JSONB
) RETURNS VOID AS $$
BEGIN
  -- Temporarily disable RLS for this transaction
  EXECUTE 'SET LOCAL row_security = off';
  
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
