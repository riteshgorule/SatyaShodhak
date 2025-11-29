import json
import argparse
import uuid
import re
from google.generativeai import GenerativeModel, configure

# -------------------------
# Configure Gemini
# -------------------------
configure(api_key="AIzaSyC45O829QFpbjijW6712dhPXwrT9KIWd1E")
model = GenerativeModel("gemini-2.5-flash")

# -------------------------
# JSON Extraction Utilities
# -------------------------

def extract_json(text: str):
    """
    Extract valid JSON from Gemini output.
    Handles:
    - markdown fenced blocks
    - JSON with trailing commas
    - partial JSON
    """

    if not text:
        return None

    # Extract fenced code block
    fence = re.findall(r"```json(.*?)```", text, re.DOTALL)
    if fence:
        text = fence[0]

    # Remove Markdown formatting
    text = text.strip().replace("\n", " ")

    # Fix common JSON errors (relaxed repair)
    text = re.sub(r",\s*}", "}", text)
    text = re.sub(r",\s*]", "]", text)

    # Extract JSON object
    match = re.search(r"\{.*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except:
            pass

    return None


# -------------------------
# Evidence Normalization
# -------------------------

def extract_evidence(evidence_raw):
    if evidence_raw is None:
        return []

    arr = []

    if isinstance(evidence_raw, list):
        for e in evidence_raw:
            if isinstance(e, dict) and "text" in e:
                arr.append(e["text"])
            elif isinstance(e, str):
                arr.append(e)

    elif isinstance(evidence_raw, dict) and "text" in evidence_raw:
        arr.append(evidence_raw["text"])

    elif isinstance(evidence_raw, str):
        arr.append(evidence_raw)

    return arr


# -------------------------
# Reasoning Agent
# -------------------------

def run_reasoner(claim, evidence_list):
    evidence_text = "\n".join(f"- {e}" for e in evidence_list) if evidence_list else "NO EVIDENCE FOUND."

    prompt = f"""
You are a fact-checking agent.

STRICT MODE: OUTPUT ONLY JSON. NO EXPLANATION OUTSIDE JSON.

CLAIM:
{claim}

EVIDENCE:
{evidence_text}

Return ONLY this JSON (no markdown, no backticks):

{{
  "classification": "TRUE or FALSE or UNSURE",
  "confidence": 0.0-1.0,
  "justification": "Explain using evidence only",
  "used_sources": []
}}
"""

    response = model.generate_content(prompt)
    raw = response.text.strip()

    parsed = extract_json(raw)

    if parsed:
        return parsed

    # fallback fail-safe
    return {
        "classification": "UNSURE",
        "confidence": 1.0,
        "justification": "Model output invalid JSON. Raw: " + raw[:250],
        "used_sources": []
    }


# -------------------------
# Main Entry
# -------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--claim", type=str, required=True)
    parser.add_argument("--input_json", type=str, required=True)
    args = parser.parse_args()

    scraped = json.load(open(args.input_json, "r"))

    # allow flexible shapes
    evidence_raw = (
        scraped.get("evidence")
        or scraped.get("results")
        or scraped.get("data")
        or scraped
    )

    evidence_list = extract_evidence(evidence_raw)

    result = run_reasoner(args.claim, evidence_list)

    final = {
        "claim_id": str(uuid.uuid4()),
        "claim": args.claim,
        "classification": result.get("classification", "UNSURE"),
        "confidence": result.get("confidence", 1.0),
        "justification": result.get("justification", "N/A"),
        "used_sources": result.get("used_sources", [])
    }

    print(json.dumps(final, indent=2))
