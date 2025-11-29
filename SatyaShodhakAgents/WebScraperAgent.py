# WebScraperEvidenceAgent_integrated.py
"""
Evidence Retrieval + Scraper + Preprocessor Agent (Integrated)
Updated to use only these claim fields:
- id
- normalized_claim
- entities
- claim_category
"""

from __future__ import annotations
import re
import uuid
import json
import logging
import time
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any

import os
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EvidenceAgent")

# ---------------------------
# API KEYS (from environment)
# ---------------------------
GOOGLE_CSE_KEY = os.getenv("GOOGLE_CSE_KEY", "")
GOOGLE_CSE_CX = os.getenv("GOOGLE_CSE_CX", "")
GOOGLE_FACTCHECK_KEY = os.getenv("GOOGLE_FACTCHECK_KEY", "")
GUARDIAN_KEY = os.getenv("GUARDIAN_KEY", "")

# --------------------------------------------------------------------------------------
# Data Classes
# --------------------------------------------------------------------------------------

@dataclass
class EvidenceItem:
    id: str
    url: str
    title: str
    snippet: str
    full_text: str
    relevance: float
    source_type: str        # "news", "official", "wiki", "factcheck"
    reliability_score: float
    retrieval_pipeline: str

    def to_json(self):
        return asdict(self)


def gen_id(prefix="ev"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


# --------------------------------------------------------------------------------------
# Query Builder  (🔄 UPDATED)
# --------------------------------------------------------------------------------------

class QueryBuilder:
    """Build search queries using only normalized_claim, entities, claim_category"""

    def build(self, claim: dict) -> List[str]:
        # ✔ NEW: Only use normalized_claim (claim_text removed)
        base = claim.get("normalized_claim")                    # UPDATED

        entities = [e["text"] for e in claim.get("entities", [])]

        queries = [base]

        # Entity-enhanced queries
        for ent in entities:
            queries.append(f"{ent} {base}")

        # Category-specific boosts
        cat = claim.get("claim_category", "")
        if cat == "health":
            queries.append(f"{base} WHO")
            queries.append(f"{base} medical study")
        elif cat == "political":
            queries.append(f"{base} government official statement")
        elif cat == "economics":
            queries.append(f"{base} GDP data")
            queries.append(f"{base} statistics report")

        # Core fact-check forms
        queries.append(base + " fact check")
        queries.append(base + " is it true")

        return list(dict.fromkeys(queries))  # unique, ordered


# --------------------------------------------------------------------------------------
# Google Fact Check Adapter (same)
# --------------------------------------------------------------------------------------

class GoogleFactCheckAdapter:
    BASE = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def search(self, query: str, page_size: int = 5):
        if not self.api_key or self.api_key.startswith("..."):
            logger.info("Google FactCheck skipped — no key.")
            return []

        try:
            r = requests.get(self.BASE, params={
                "query": query,
                "key": self.api_key,
                "pageSize": page_size
            }, timeout=8)
            r.raise_for_status()
            data = r.json()
        except:
            return []

        out = []
        for c in data.get("claims", []):
            for review in c.get("claimReview", []):
                out.append({
                    "text": c.get("text", ""),
                    "publisher": review.get("publisher", {}).get("name"),
                    "rating": review.get("textualRating"),
                    "url": review.get("url"),
                    "retrieval_pipeline": "google_factcheck"
                })
        return out


# --------------------------------------------------------------------------------------
# Google CSE Adapter (same)
# --------------------------------------------------------------------------------------

class GoogleCSEAdapter:
    BASE = "https://www.googleapis.com/customsearch/v1"

    def __init__(self, api_key, cx):
        self.api_key = api_key
        self.cx = cx
        # domains we consider "important" for evidence (can be extended)
        self.important_domain_substrings = [
            "reuters.com", "apnews.com", "bbc.com", "nytimes.com",
            "indiatoday.in", "thehindu.com", ".gov", ".gov.in",
            ".edu", "who.int"
        ]

    def search(self, query, num=5):
        if not self.api_key or not self.cx or self.api_key.startswith("..."):
            return []

        try:
            r = requests.get(self.BASE, params={
                "q": query,
                "key": self.api_key,
                "cx": self.cx,
                "num": num
            }, timeout=8)
            r.raise_for_status()
            data = r.json()
        except:
            return []

        all_items = []
        for item in data.get("items", []):
            link = item.get("link") or ""
            all_items.append({
                "url": link,
                "title": item.get("title"),
                "snippet": item.get("snippet"),
                "retrieval_pipeline": "google_cse"
            })

        def is_important(url: str) -> bool:
            u = url.lower()
            return any(dom in u for dom in self.important_domain_substrings)

        # filter to only important domains
        important = [it for it in all_items if is_important(it.get("url", ""))]

        # if none match, fall back to original items so we still get something
        selected = important if important else all_items

        # keep only top `num`
        return selected[:num]


# --------------------------------------------------------------------------------------
# Guardian Adapter (same)
# --------------------------------------------------------------------------------------

class GuardianAdapter:
    BASE = "https://content.guardianapis.com/search"

    def __init__(self, api_key, max_calls_per_claim: int = 2):
        self.api_key = api_key
        # soft per-claim cap on how many Guardian requests we make
        self.max_calls_per_claim = max_calls_per_claim

    def search(self, query, page_size=3):
        if not self.api_key or self.api_key.startswith("..."):
            return []

        try:
            r = requests.get(self.BASE, params={
                "q": query,
                "api-key": self.api_key,
                "page-size": page_size,
                "show-fields": "headline,trailText,bodyText"
            }, timeout=8)
            r.raise_for_status()
            data = r.json()
        except:
            return []

        out = []
        for item in data.get("response", {}).get("results", []):
            out.append({
                "url": item.get("webUrl"),
                "title": item.get("webTitle"),
                "snippet": item.get("fields", {}).get("trailText") or "",
                "body": item.get("fields", {}).get("bodyText", ""),
                "retrieval_pipeline": "guardian_api"
            })
        return out



# --------------------------------------------------------------------------------------
# Scraper
# --------------------------------------------------------------------------------------

class PageScraper:
    def fetch(self, url):
        try:
            r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=8)
            return r.text if r.status_code == 200 else None
        except:
            return None

    def extract_clean_text(self, html):
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "noscript", "footer", "header", "nav", "form", "svg"]):
            tag.decompose()
        return re.sub(r"\s+", " ", soup.get_text()).strip()


# --------------------------------------------------------------------------------------
# Ranker (same)
# --------------------------------------------------------------------------------------

class EvidenceRanker:
    def rank(self, claim: str, docs: List[str]):
        tokens = set(re.split(r"\W+", claim.lower()))
        return [sum(1 for t in tokens if t in d.lower()) for d in docs]


# --------------------------------------------------------------------------------------
# Evidence Retrieval Agent (🔄 UPDATED)
# --------------------------------------------------------------------------------------

class EvidenceRetrievalAgent:

    def __init__(self,
                 google_cse_key=GOOGLE_CSE_KEY,
                 google_cfc_key=GOOGLE_FACTCHECK_KEY,
                 guardian_key=GUARDIAN_KEY):
        self.query_builder = QueryBuilder()
        self.google_cse = GoogleCSEAdapter(google_cse_key, GOOGLE_CSE_CX)
        # Prefer Google FactCheck; keep Guardian very limited
        self.factcheck = GoogleFactCheckAdapter(google_cfc_key)
        self.guardian = GuardianAdapter(guardian_key)
        self.scraper = PageScraper()
        self.ranker = EvidenceRanker()

    def retrieve_for_claim(self, claim: dict, top_k_per_source=5):

        # ✔ UPDATED: always use normalized_claim
        normalized = claim.get("normalized_claim")             # UPDATED

        queries = self.query_builder.build(claim)
        evidence = []
        fact_checks = []

        # 1. FactCheck API
        for r in self.factcheck.search(normalized):
            fact_checks.append(r)
            if r.get("url"):
                evidence.append(
                    EvidenceItem(
                        id=gen_id(),
                        url=r["url"],
                        title=f"FactCheck: {r.get('publisher')}",
                        snippet=r.get("rating") or "",
                        full_text=r.get("text", ""),
                        relevance=10.0,
                        source_type="factcheck",
                        reliability_score=0.99,
                        retrieval_pipeline="google_factcheck"
                    )
                )

        # 2. Google CSE scraping (max 5 links overall, bias to .gov)
        cse_budget = 5
        for q in queries:
            if cse_budget <= 0:
                break
            for item in self.google_cse.search(q, num=min(5, cse_budget)):
                url = item.get("url")
                if not url:
                    continue
                html = self.scraper.fetch(url)
                if not html:
                    continue
                clean = self.scraper.extract_clean_text(html)
                if len(clean) < 100:
                    continue

                rel = self.ranker.rank(normalized, [clean])[0]

                evidence.append(
                    EvidenceItem(
                        id=gen_id(),
                        url=url,
                        title=item["title"],
                        snippet=item["snippet"],
                        full_text=clean,
                        relevance=float(rel),
                        source_type="web",
                        reliability_score=0.7,
                        retrieval_pipeline="google_cse"
                    )
                )
                cse_budget -= 1
                time.sleep(0.1)

        # 3. Guardian news (very small number of calls per claim)
        guardian_calls = 0
        for q in queries:
            if guardian_calls >= self.guardian.max_calls_per_claim:
                break
            for item in self.guardian.search(q):
                body = item.get("body") or ""
                if not body:
                    continue
                rel = self.ranker.rank(normalized, [body])[0]

                evidence.append(
                    EvidenceItem(
                        id=gen_id(),
                        url=item["url"],
                        title=item["title"],
                        snippet=item["snippet"],
                        full_text=body,
                        relevance=float(rel),
                        source_type="news",
                        reliability_score=0.8,
                        retrieval_pipeline="guardian_api"
                    )
                )
                guardian_calls += 1

        # Dedupe and sort
        seen = set()
        final = []
        for ev in sorted(evidence, key=lambda e: e.relevance, reverse=True):
            if ev.url not in seen:
                final.append(ev)
                seen.add(ev.url)

        return {
            "fact_checks": fact_checks,
            "evidence": [ev.to_json() for ev in final[:40]]
        }

    def handle(self, claims: List[Dict[str, Any]]):
        out = {}
        for c in claims:
            claim_id = c.get("id")
            out[claim_id] = self.retrieve_for_claim(c)
        return out


# --------------------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--claims_json", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()

    with open(args.claims_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    claims = data.get("claims", [])
    agent = EvidenceRetrievalAgent()

    result = agent.handle(claims)

    out = json.dumps(result, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"Saved to {args.output}")
    else:
        print(out)
