# ClaimExtractorAgent_deberta.py
"""
Upgraded Claim Extractor Agent (DeBERTa-v3-small)
- Uses microsoft/deberta-v3-small as transformer classifier
- Enhanced heuristics
- Entity extraction, claim category, evidence type, richer JSON
- Graceful fallbacks for missing deps
Usage:
    python ClaimExtractorAgent_deberta.py --text "India is the richest country in the world"
    python ClaimExtractorAgent_deberta.py --image meme.png --output out.json
"""
from __future__ import annotations
import re
import json
import uuid
import argparse
import logging
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any

# optional heavy imports
try:
    import spacy
except Exception:
    spacy = None

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
except Exception:
    AutoTokenizer = None
    AutoModelForSequenceClassification = None
    torch = None

# OCR
OCR_ENABLED = True
try:
    import easyocr
except Exception:
    try:
        from PIL import Image
        import pytesseract
    except Exception:
        OCR_ENABLED = False

# Image processing
try:
    import cv2
    import numpy as np
except Exception:
    cv2 = None
    np = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -----------------------------
# Data classes
# -----------------------------

@dataclass
class Provenance:
    source: str
    source_url: Optional[str]
    raw_snippet: Optional[str]

@dataclass
class Claim:
    id: str
    claim_text: str
    normalized_claim: str
    type: str
    modality: str
    span: Optional[Dict[str, int]]
    speaker: Optional[str]
    language: str
    confidence: float
    provenance: Provenance
    metadata: Dict[str, Any]
    # Extended fields
    entities: List[Dict[str, Any]]
    claim_category: str
    evidence_required: List[str]
    extraction_pipeline: str
    context_window: Optional[str]
    verdict: Optional[str]
    source_type: Optional[str]

    def to_json(self):
        d = asdict(self)
        d['provenance'] = asdict(self.provenance)
        return d

# -----------------------------
# Helpers
# -----------------------------

def gen_id(prefix: str = "c") -> str:
    return f"{prefix}{uuid.uuid4().hex[:8]}"

def normalize_claim_text(text: str) -> str:
    t = text.strip()
    t = re.sub(r"\s+", " ", t)
    return t

# -----------------------------
# Text pipeline (upgraded)
# -----------------------------

class TextClaimExtractor:
    """Claim extractor with improved heuristics + transformer classifier (DeBERTa-v3-small) + spaCy NER"""

    def __init__(self,
                 nlp_model: str = "en_core_web_sm",
                 classifier_model_name: Optional[str] = "microsoft/deberta-v3-small"):
        # spaCy
        self.nlp = None
        if spacy:
            try:
                self.nlp = spacy.load(nlp_model)
            except Exception as e:
                logger.warning(f"spaCy model load failed: {e}. spaCy disabled.")
                self.nlp = None

        # transformer classifier
        self.classifier = None
        self.tokenizer = None
        self.classifier_model_name = classifier_model_name
        if classifier_model_name and AutoTokenizer and AutoModelForSequenceClassification:
            try:
                logger.info(f"Loading classifier model: {classifier_model_name} ...")
                self.tokenizer = AutoTokenizer.from_pretrained(classifier_model_name)
                self.classifier = AutoModelForSequenceClassification.from_pretrained(classifier_model_name)
                if torch and torch.cuda.is_available():
                    self.classifier.to("cuda")
                logger.info("Classifier loaded.")
            except Exception as e:
                logger.warning(f"Classifier load failed: {e}. Continuing without classifier.")
                self.classifier = None
                self.tokenizer = None

    def sentence_split(self, text: str) -> List[str]:
        if self.nlp:
            doc = self.nlp(text)
            return [sent.text.strip() for sent in doc.sents]
        # fallback simple split
        return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

    def rule_based_candidate(self, sent: str) -> bool:
        """Enhanced heuristics to detect claim-like sentences"""
        s = sent.strip()
        low = s.lower()

        # numbers / stats
        if re.search(r"\b(\d{1,3}(?:,\d{3})*|\d+|one|two|three|million|billion|percent|%)\b", s, flags=re.I):
            return True

        # causal / effect verbs
        if re.search(r"\b(cause|causes|caused|lead to|leads to|linked to|increase|reduce|prevent|cure|kill|due to|results in)\b", s, flags=re.I):
            return True

        # quoted statements
        if '"' in s or "'" in s:
            if re.search(r'"[^"]+"' , s) or re.search(r"'[^']+'", s):
                return True

        # attribution / report verbs
        if re.search(r"\b(according to|said|claims|reported|announced|stated|tweeted)\b", s, flags=re.I):
            return True

        # questions that imply factual content
        if s.endswith("?") and len(s.split()) > 4:
            return True

        # superlatives / comparatives
        if re.search(r"\b(most|least|largest|smallest|highest|lowest|richest|fastest|best|worst|more than|less than|better|worse)\b", s, flags=re.I):
            return True

        # temporal claims ("yesterday", "today", "last week", "in 2020")
        if re.search(r"\b(yesterday|today|last week|last month|in \d{4}|this year|on \w+day)\b", s, flags=re.I):
            return True

        # "be" verb pattern as fallback for factual claims (X is Y / X are Y)
        if re.search(r"\b(is|are|was|were|becomes|became)\b", s, flags=re.I):
            if len(s.split()) >= 3:
                return True

        # named entity presence (if spaCy available)
        if self.nlp:
            try:
                doc = self.nlp(s)
                if len(doc.ents) >= 1:
                    # ignore tiny trivial sentences
                    if len(s.split()) >= 3:
                        return True
            except Exception:
                pass

        return False

    def classify_with_model(self, sent: str) -> Optional[float]:
        """
        Classify sentence with transformer.
        NOTE: models differ in label mapping; we assume label index 1 corresponds to 'claim-like'.
        Adjust mapping if you use a different fine-tuned model.
        """
        if not self.classifier or not self.tokenizer or not torch:
            return None
        try:
            inputs = self.tokenizer(sent, return_tensors='pt', truncation=True, padding=True)
            if torch.cuda.is_available():
                inputs = {k: v.to('cuda') for k, v in inputs.items()}
            with torch.no_grad():
                outputs = self.classifier(**inputs)
                logits = outputs.logits
                probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]
                # assume label index 1 is "claim-like"; if model is different, this may need adjustment
                claim_prob = float(probs[1]) if probs.shape[0] > 1 else float(probs[0])
                return claim_prob
        except Exception as e:
            logger.warning(f"Model classification failed: {e}")
            return None

    def extract_span(self, sent: str, text: str) -> Dict[str,int]:
        # find the first occurrence of sent inside text (fallback)
        start = text.find(sent)
        if start == -1:
            start = 0
        end = start + len(sent)
        return {"start": start, "end": end}

    def type_classify(self, sent: str) -> str:
        s = sent.lower()
        if re.search(r"\b(cause|causes|caused|lead to|linked to|results in)\b", s):
            return "causal"
        if re.search(r"\b(percent|%|\d+)\b", s):
            return "statistical"
        if '"' in s or "'" in s:
            return "quote"
        return "factual"

    def extract_entities(self, sent: str) -> List[Dict[str, Any]]:
        ents_list: List[Dict[str, Any]] = []
        if not self.nlp:
            return ents_list
        try:
            doc = self.nlp(sent)
            for ent in doc.ents:
                ents_list.append({
                    "text": ent.text,
                    "label": ent.label_,
                    "start_char": ent.start_char,
                    "end_char": ent.end_char
                })
        except Exception as e:
            logger.warning(f"Entity extraction failed: {e}")
        return ents_list

    def categorize_claim(self, sent: str, entities: List[Dict[str,Any]]) -> str:
        """Simple keyword + entity-driven categorizer"""
        s = sent.lower()
        # health
        if re.search(r"\b(vaccine|virus|covid|disease|cancer|treatment|symptom|pandemic)\b", s):
            return "health"
        # politics / law
        if re.search(r"\b(president|minister|congress|parliament|law|bill|election|government)\b", s):
            return "political"
        # economics
        if re.search(r"\b(economy|GDP|richest|poor|unemployment|market|stock|price|inflation)\b", s):
            return "economics"
        # environment / climate
        if re.search(r"\b(climate|pollution|temperature|global warming|emission|carbon)\b", s):
            return "environment"
        # science / research
        if re.search(r"\b(study|research|scientists|experiment|evidence|finds)\b", s):
            return "science"
        # default: if entity includes ORG/GPE might be geopolitical/economic
        for e in entities:
            if e.get("label") in ("GPE", "LOC"):
                return "geopolitical"
            if e.get("label") == "ORG":
                return "institutional"
        return "general"

    def predict_evidence_type(self, sent: str) -> List[str]:
        """Heuristic: what kind of evidence is needed to fact-check this claim"""
        types = []
        s = sent.lower()
        if re.search(r"\b(percent|%|\d+|million|billion)\b", s):
            types.append("statistical_verification")
        if re.search(r"\b(vaccine|treatment|cure|disease|side effect)\b", s):
            types.append("medical_studies")
        if re.search(r"\b(election|bill|law|legislation|president|minister)\b", s):
            types.append("official_records")
        if re.search(r"\b(research|study|paper|survey)\b", s):
            types.append("academic_papers")
        if re.search(r"\b(photo|image|video|meme)\b", s):
            types.append("media_verification")
        if not types:
            types.append("cross_source_news")
        return types

    def extract_claims(self, text: str, source: str = "text", source_url: Optional[str] = None, language: str = "en") -> List[Claim]:
        sents = self.sentence_split(text)
        claims: List[Claim] = []

        for sent in sents:
            if not sent or len(sent.strip()) < 3:
                continue

            rule_hit = self.rule_based_candidate(sent)
            model_conf = self.classify_with_model(sent)

            # decision logic: accept if rule_hit OR model_conf>threshold
            accept = rule_hit
            conf_score = 0.0
            used_pipeline = "rule_based"
            if model_conf is not None:
                conf_score = model_conf
                # threshold — adjustable
                if model_conf > 0.65:
                    accept = True
                    used_pipeline = "transformer"
                else:
                    # still keep transformer score for borderline decisions
                    # if rule_hit also true, we keep it
                    used_pipeline = "transformer"
            # fallback: if neither, skip
            if not accept:
                continue

            span = self.extract_span(sent, text)
            ctype = self.type_classify(sent)
            normalized = normalize_claim_text(sent)
            entities = self.extract_entities(sent)
            claim_cat = self.categorize_claim(sent, entities)
            evidence = self.predict_evidence_type(sent)
            context_window = text[max(0, span['start']-80): min(len(text), span['end']+80)]

            claim = Claim(
                id=gen_id('c'),
                claim_text=sent,
                normalized_claim=normalized,
                type=ctype,
                modality='text',
                span=span,
                speaker=None,
                language=language,
                confidence=conf_score if conf_score > 0 else (0.65 if rule_hit else 0.0),
                provenance=Provenance(source=source, source_url=source_url, raw_snippet=text),
                metadata={},
                entities=entities,
                claim_category=claim_cat,
                evidence_required=evidence,
                extraction_pipeline=used_pipeline,
                context_window=context_window,
                verdict=None,
                source_type=source
            )
            claims.append(claim)

        return claims

# -----------------------------
# Image pipeline (keeps upgrades)
# -----------------------------

class ImageClaimExtractor:
    def __init__(self, ocr_prefer_easyocr: bool = True):
        self.ocr_reader = None
        if OCR_ENABLED:
            try:
                if 'easyocr' in globals() and ocr_prefer_easyocr:
                    self.ocr_reader = easyocr.Reader(['en'])  # can add languages
                else:
                    self.ocr_reader = None
            except Exception as e:
                logger.warning(f"EasyOCR init failed: {e}")
                self.ocr_reader = None

        self.deepfake_detector = None
        self.text_extractor = TextClaimExtractor()

    def ocr_image(self, image_path: str) -> str:
        if OCR_ENABLED and self.ocr_reader is not None:
            try:
                results = self.ocr_reader.readtext(image_path, detail=0)
                text = " ".join(results)
                return text
            except Exception as e:
                logger.warning(f"EasyOCR failed on {image_path}: {e}")
        # fallback to pytesseract
        try:
            from PIL import Image
            import pytesseract
            img = Image.open(image_path)
            text = pytesseract.image_to_string(img)
            return text
        except Exception as e:
            logger.warning(f"Tesseract OCR failed: {e}")
            return ""

    def detect_deepfake(self, image_path: str) -> Optional[Dict[str,Any]]:
        # keep stub — user can plug in a real model (XceptionNet etc.)
        if cv2 is None:
            return None
        try:
            img = cv2.imread(image_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            return {"faces_detected": int(len(faces)), "deepfake_score": None}
        except Exception as e:
            logger.warning(f"Deepfake stub failed: {e}")
            return None

    def extract_from_image(self, image_path: str, source_url: Optional[str]=None) -> List[Claim]:
        ocr_text = self.ocr_image(image_path)
        claims: List[Claim] = []

        if ocr_text and ocr_text.strip():
            text_claims = self.text_extractor.extract_claims(ocr_text, source=f"ocr_image:{image_path}", source_url=source_url)
            for c in text_claims:
                # attach OCR metadata and adjust modality
                c.metadata['ocr_text'] = ocr_text
                c.metadata['image_path'] = image_path
                c.modality = 'image+text'
                claims.append(c)

        # attach deepfake stub claim (if faces detected)
        df_res = self.detect_deepfake(image_path)
        if df_res is not None:
            claim_text = "Image authenticity check"
            claim = Claim(
                id=gen_id('img'),
                claim_text=claim_text,
                normalized_claim=claim_text,
                type='deepfake_verification',
                modality='image',
                span=None,
                speaker=None,
                language='en',
                confidence=0.5 if df_res.get('deepfake_score') is None else float(df_res['deepfake_score']),
                provenance=Provenance(source=f"image:{image_path}", source_url=source_url, raw_snippet=''),
                metadata={'deepfake': df_res},
                entities=[],
                claim_category='media',
                evidence_required=['media_verification'],
                extraction_pipeline='deepfake_stub',
                context_window=None,
                verdict=None,
                source_type=f"image:{image_path}"
            )
            claims.append(claim)

        return claims

# -----------------------------
# Unified agent + CLI
# -----------------------------

class ClaimExtractorAgent:
    def __init__(self):
        self.text = TextClaimExtractor()
        self.image = ImageClaimExtractor()

    def handle_text(self, text: str, source_url: Optional[str] = None) -> Dict[str, Any]:
        claims = self.text.extract_claims(text, source='user_text', source_url=source_url)
        return {'claims': [c.to_json() for c in claims], 'meta': {'num_claims': len(claims)}}

    def handle_image(self, image_path: str, source_url: Optional[str] = None) -> Dict[str, Any]:
        claims = self.image.extract_from_image(image_path, source_url=source_url)
        return {'claims': [c.to_json() for c in claims], 'meta': {'num_claims': len(claims)}}

def main():
    parser = argparse.ArgumentParser(description='Upgraded Claim Extractor Agent CLI (no server)')
    parser.add_argument('--text', type=str, help='Text input to extract claims from')
    parser.add_argument('--image', type=str, help='Image path to extract claims from')
    parser.add_argument('--output', type=str, help='Write JSON output to this file')
    args = parser.parse_args()

    agent = ClaimExtractorAgent()
    out = None
    if args.text:
        out = agent.handle_text(args.text)
    elif args.image:
        out = agent.handle_image(args.image)
    else:
        parser.print_help()
        return

    json_out = json.dumps(out, indent=2)
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(json_out)
        print(f"Wrote output to {args.output}")
    else:
        print(json_out)

if __name__ == '__main__':
    main()
