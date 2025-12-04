import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claim, is_reverification, original_result_id } = await req.json();

    if (!claim || claim.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Claim is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const GOOGLE_FACT_CHECK_API_KEY = Deno.env.get("GOOGLE_FACT_CHECK_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    console.log("Starting verification for claim:", claim);

    // 1. Query Google Fact Check API for existing fact checks
    let googleFactCheckResults = [];
    if (GOOGLE_FACT_CHECK_API_KEY) {
      try {
        const factCheckUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(claim)}&key=${GOOGLE_FACT_CHECK_API_KEY}`;
        const factCheckResponse = await fetch(factCheckUrl);

        if (factCheckResponse.ok) {
          const factCheckData = await factCheckResponse.json();
          googleFactCheckResults = factCheckData.claims || [];
          console.log("Google Fact Check results:", googleFactCheckResults.length);
        }
      } catch (error) {
        console.error("Google Fact Check API error:", error);
      }
    }

    // 2. Prepare context for Gemini AI
    let factCheckContext = "";
    if (googleFactCheckResults.length > 0) {
      factCheckContext = "\n\nExisting Fact-Check Results:\n" +
        googleFactCheckResults.slice(0, 3).map((result: any, idx: number) => {
          const claimReview = result.claimReview?.[0];
          return `${idx + 1}. Source: ${claimReview?.publisher?.name || "Unknown"}
   Rating: ${claimReview?.textualRating || "N/A"}
   Review: ${claimReview?.title || "No title"}
   URL: ${claimReview?.url || "No URL"}`;
        }).join("\n\n");
    }

    // 3. Use Gemini API directly to analyze the claim
    const aiSystemPrompt = `You are an expert fact-checker. Analyze claims objectively using evidence-based reasoning. 

YOUR TASK:
1. Evaluate the claim's truthfulness and provide a structured analysis
2. Generate a detailed fact description with the following sections:
   - Key Points: 2-3 bullet points summarizing the most important facts
   - Context: Background information to understand the claim
   - Analysis: Detailed examination of the evidence
   - Verdict: Clear conclusion with reasoning
3. Provide a verdict: TRUE, FALSE, MISLEADING, PARTIALLY_TRUE, or INCONCLUSIVE
4. Assign a confidence score (0-100)
5. List credible sources that support your analysis

GUIDELINES:
- Be thorough but concise
- Consider context, nuance, and available evidence
- Use markdown formatting for better readability
- Cite sources using [number] notation
- If the claim is ambiguous, explain why and what would be needed for a definitive answer

${factCheckContext ? "EXISTING FACT CHECKS (for reference):\n" + factCheckContext + "\n\n" : ""}Analyze this claim and provide a structured response in this exact JSON format:
{
  "verdict": "TRUE|FALSE|MISLEADING|PARTIALLY_TRUE|INCONCLUSIVE",
  "confidence": <number 0-100>,
  "explanation": "## Key Points\n- Point 1\n- Point 2\n\n## Context\n[Provide background information]\n\n## Analysis\n[Detailed examination of evidence]\n\n## Verdict\n[Clear conclusion with reasoning]",
  "sources": [
    {
      "title": "<source title>",
      "snippet": "<relevant excerpt>",
      "url": "<source URL>"
    }
  ]
}`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${aiSystemPrompt}\n\nClaim to verify: "${claim}"`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("AI API request failed");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    console.log("AI Response:", aiContent);

    // Parse AI response
    let verificationResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) ||
        aiContent.match(/```([\s\S]*?)```/) ||
        [null, aiContent];
      const jsonStr = jsonMatch[1] || aiContent;
      verificationResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback: create a basic result
      verificationResult = {
        verdict: "INCONCLUSIVE",
        confidence: 50,
        explanation: aiContent,
        sources: []
      };
    }

    // Add Google Fact Check sources if available
    if (googleFactCheckResults.length > 0) {
      const googleSources = googleFactCheckResults.slice(0, 2).map((result: any) => {
        const claimReview = result.claimReview?.[0];
        return {
          title: claimReview?.publisher?.name || "Google Fact Check",
          snippet: `${claimReview?.textualRating || "Rating unavailable"} - ${claimReview?.title || result.text || ""}`.substring(0, 200),
          url: claimReview?.url || "https://toolbox.google.com/factcheck"
        };
      });

      verificationResult.sources = [...(verificationResult.sources || []), ...googleSources];
    }

    // Ensure sources array exists and has at least generic sources
    if (!verificationResult.sources || verificationResult.sources.length === 0) {
      verificationResult.sources = [
        {
          title: "AI Analysis",
          snippet: "This verification was performed using advanced AI reasoning and available information.",
          url: "https://satyashodhak.com"
        }
      ];
    }

    // Get user ID from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const userId = user.id;

    if (is_reverification && original_result_id) {
      // Use the stored procedure to update the record
      const { error: updateError } = await supabase.rpc('update_verification_result', {
        p_id: original_result_id,
        p_user_id: userId,
        p_verdict: verificationResult.verdict,
        p_confidence: verificationResult.confidence,
        p_explanation: verificationResult.explanation,
        p_sources: verificationResult.sources
      });

      if (updateError) {
        console.error("Failed to update result:", updateError);
        throw new Error("Failed to update verification result");
      }
    } else {
      // For new verifications, create a new record using the stored procedure
      const { data: newRecordId, error: insertError } = await supabase.rpc('insert_verification_result', {
        p_user_id: userId,
        p_claim: claim,
        p_verdict: verificationResult.verdict,
        p_confidence: verificationResult.confidence,
        p_explanation: verificationResult.explanation,
        p_sources: verificationResult.sources,
        p_is_public: true
      });

      if (insertError) {
        console.error("Failed to save result:", insertError);
        throw new Error("Failed to save verification result");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          verdict: verificationResult.verdict,
          confidence: verificationResult.confidence,
          explanation: verificationResult.explanation,
          sources: verificationResult.sources,
          claim: claim,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Verification failed"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
