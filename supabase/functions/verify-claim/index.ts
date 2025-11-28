import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claim } = await req.json();
    
    if (!claim || claim.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Claim is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_FACT_CHECK_API_KEY = Deno.env.get("GOOGLE_FACT_CHECK_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
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

    // 3. Use Gemini AI to analyze the claim
    const aiSystemPrompt = `You are an expert fact-checker. Analyze claims objectively using evidence-based reasoning. 
Your task is to:
1. Evaluate the claim's truthfulness
2. Provide a clear verdict: TRUE, FALSE, MISLEADING, PARTIALLY_TRUE, or INCONCLUSIVE
3. Assign a confidence score (0-100)
4. Write a clear explanation of your reasoning
5. List credible sources that support your verdict

Be thorough but concise. Consider context, nuance, and available evidence.${factCheckContext}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: aiSystemPrompt },
          { 
            role: "user", 
            content: `Analyze this claim and provide a structured verdict:\n\n"${claim}"\n\nProvide your response in this exact JSON format:
{
  "verdict": "TRUE|FALSE|MISLEADING|PARTIALLY_TRUE|INCONCLUSIVE",
  "confidence": <number 0-100>,
  "explanation": "<detailed explanation>",
  "sources": [
    {
      "title": "<source title>",
      "snippet": "<relevant excerpt>",
      "url": "<source URL>"
    }
  ]
}` 
          }
        ],
        temperature: 0.7,
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
    const aiContent = aiData.choices?.[0]?.message?.content;

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

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        
        // Insert verification result
        const { error: insertError } = await supabase
          .from("verification_results")
          .insert({
            user_id: userId,
            claim: claim,
            verdict: verificationResult.verdict,
            confidence: verificationResult.confidence,
            explanation: verificationResult.explanation,
            sources: verificationResult.sources,
          });

        if (insertError) {
          console.error("Failed to save result:", insertError);
        }
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
