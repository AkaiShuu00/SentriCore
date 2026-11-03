import os
os.environ["FLAGS_use_mkldnn"] = "0"

# Pilitin ang UTF-8 sa stdout/stderr — iwas 'charmap' UnicodeEncodeError sa NSSM (cp1252),
# na siyang dahilan kaya nagre-return ng success:false kapag may non-ASCII sa logs (hal. '->').
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

import time
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from PIL import Image
import numpy as np
import io

# ── OCR ENHANCEMENT modules (ID classification + layout-aware, name-only extraction) ──
# Guarded import: kung sakaling kulang ang files, babalik sa legacy extractor sa ibaba
# para hindi mabasag ang service.
try:
    from ocr_enhance import build_response_from_tokens
    _ENHANCE = True
    print("OCR enhancement modules loaded.")
except Exception as _e:
    _ENHANCE = False
    print("OCR enhancement NOT loaded (using legacy extractor):", _e)

app = FastAPI(title="SentriCore OCR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading PaddleOCR MOBILE models...")
ocr = PaddleOCR(
    lang="en",
    enable_mkldnn=False,
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    text_detection_model_name="PP-OCRv5_mobile_det",
    text_recognition_model_name="PP-OCRv5_mobile_rec",
)
print("PaddleOCR ready!")

try:
    print("Warming up OCR model...")
    _warm = np.zeros((320, 320, 3), dtype=np.uint8)
    ocr.predict(_warm)
    print("OCR warm-up complete!")
except Exception as e:
    print("Warm-up skipped:", e)


@app.get("/")
def health():
    return {"status": "OCR service running"}


# ──────────────────────────────────────────────────────────────────────────────
# LEGACY fallback extractor (ginagamit LANG kapag hindi na-load ang ocr_enhance).
# Pinanatili para hindi mabasag ang service kung may problema sa bagong modules.
# ──────────────────────────────────────────────────────────────────────────────
def extract_visitor_name(lines):
    blacklist = [
        "REPUBLIC", "PHILIPPINE", "PHILIPPINES", "POSTAL", "IDENTITY", "CARD",
        "CORPORATION", "SIGNATURE", "HOLDER", "GENERAL", "PREMIUM",
        "SURNAME", "GIVEN", "MIDDLE", "NAME", "ADDRESS", "NATIONALITY",
        "SEX", "DATE", "BIRTH", "UNIFIED", "MULTIPURPOSE", "PURPOSE",
        "METRO", "MANILA", "CITY", "STREET", "BRGY", "BARANGAY", "PROVINCE",
        "VALID", "CRN", "PAN", "LAND", "TRANSPORTATION", "OFFICE", "LICENSE",
        "DRIVER", "NON", "PROFESSIONAL", "DEPARTMENT", "SOCIAL", "SECURITY",
        "SYSTEM", "PHILHEALTH", "PHILSYS", "NATIONAL", "PASSPORT", "COMMISSION",
        "ELECTIONS", "VOTER", "TIN", "GSIS", "PRC", "REGISTRATION", "NO",
        "EXPIRY", "ISSUE", "BLOOD", "TYPE", "WEIGHT", "HEIGHT", "SIGNIFICANT",
        "DL", "AGENCY", "CODE", "CONDITIONS", "RESTRICTIONS", "REGION",
        "GOVERNMENT", "SERVICE", "INSURANCE", "IDENTIFICATION", "NUMBER",
        "MEMBER", "COMMON", "REFERENCE", "OF", "THE", "AND", "REPUBLIKA",
        "PILIPINAS", "KAGAWARAN", "TANGGAPAN", "PASAPORTE", "PLACE", "AUTHORITY",
        "ISSUING", "FILIPINO", "PHL", "DFA", "PETSA", "LUGAR", "KASARIAN",
    ]

    def is_clean(text):
        up = text.upper()
        return not any(b in up.split() or b == up for b in blacklist)

    def has_no_digits(text):
        return not any(c.isdigit() for c in text)

    def clean_name(text):
        return " ".join(text.replace(",", " ").split())

    def title_case(text):
        return " ".join(w.capitalize() for w in text.split())

    for l in lines:
        t = l["text"].strip().upper()
        if t.startswith("P<") and "<<" in t:
            try:
                body = t[2:]
                rest = body[3:] if len(body) > 3 else body
                surname_part, _, given_part = rest.partition("<<")
                surname = surname_part.replace("<", " ").strip()
                given = given_part.replace("<", " ").strip()
                full = " ".join(f"{given} {surname}".split())
                if len(full) >= 4 and has_no_digits(full):
                    return title_case(full)
            except Exception:
                pass

    surname = given = middle = ""
    for i, l in enumerate(lines):
        label = l["text"].upper().replace(" ", "")
        value = lines[i + 1]["text"].strip() if i + 1 < len(lines) else ""
        if not value or not has_no_digits(value):
            continue
        if "APELYIDO" in label or "SURNAME" in label or "LASTNAME" in label:
            if not surname: surname = value
        elif "PANGALAN" in label or "GIVENNAME" in label or "FIRSTNAME" in label:
            if not given: given = value
        elif "GITNANG" in label or "MIDDLENAME" in label:
            if not middle: middle = value
    if given and surname:
        return clean_name(f"{given} {middle} {surname}")

    for l in lines:
        t = l["text"].strip()
        if "," in t and has_no_digits(t) and is_clean(t):
            parts = [p.strip() for p in t.split(",")]
            if len(parts) == 2 and len(parts[0].split()) <= 2 and 1 <= len(parts[1].split()) <= 3:
                letters = [c for c in t if c.isalpha()]
                if letters and sum(1 for c in letters if c.isupper()) / len(letters) > 0.6:
                    return clean_name(f"{parts[1]} {parts[0]}")

    def looks_like_name(text):
        t = text.strip()
        if len(t) < 5 or not has_no_digits(t):
            return False
        words = t.split()
        if len(words) < 2 or len(words) > 5:
            return False
        letters = [c for c in t if c.isalpha()]
        if not letters:
            return False
        return sum(1 for c in letters if c.isupper()) / len(letters) > 0.6

    cands = [l for l in lines if looks_like_name(l["text"]) and is_clean(l["text"])]
    cands.sort(key=lambda l: (l["confidence"], len(l["text"])), reverse=True)
    if cands:
        return clean_name(cands[0]["text"])

    return ""


def _run_ocr(img_array):
    """Patakbuhin ang PaddleOCR; ibalik ang listahan ng {text, confidence, box}."""
    result = ocr.predict(img_array)
    lines = []
    if result:
        for res in result:
            texts = res.get("rec_texts", [])
            scores = res.get("rec_scores", [])
            # Bounding boxes (para sa positional fallback) — optional, iba-iba ang key name.
            polys = res.get("rec_polys", None)
            if polys is None:
                polys = res.get("dt_polys", None)
            for i, text in enumerate(texts):
                confidence = float(scores[i]) if i < len(scores) else 0.0
                box = None
                try:
                    if polys is not None and i < len(polys):
                        p = polys[i]
                        box = p.tolist() if hasattr(p, "tolist") else list(p)
                except Exception:
                    box = None
                lines.append({"text": text, "confidence": confidence, "box": box})
    return lines


@app.post("/ocr")
async def extract_name(file: UploadFile = File(...)):
    try:
        t0 = time.time()
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        max_width = 800
        if image.width > max_width:
            ratio = max_width / image.width
            image = image.resize((max_width, int(image.height * ratio)))

        img_array = np.array(image)
        t1 = time.time()

        # First attempt (+ retry once kung walang nabasa)
        lines = _run_ocr(img_array)
        print(f"OCR predict attempt 1: {time.time() - t1:.2f}s")
        if not lines:
            print("OCR returned no text. Retrying once...", flush=True)
            rs = time.time()
            lines = _run_ocr(img_array)
            print(f"OCR predict attempt 2: {time.time() - rs:.2f}s", flush=True)

        # ── BAGONG daloy: classify ID + layout-aware, NAME-ONLY extraction ──
        if _ENHANCE:
            tokens = [{"text": l["text"], "score": l["confidence"], "box": l.get("box")} for l in lines]
            resp = build_response_from_tokens(tokens)
            # Iisang format (ALL CAPS) para tugma sa matching logic ng backend/frontend.
            resp["suggestedName"] = (resp.get("suggestedName") or "").upper()
            if isinstance(resp.get("extractedName"), dict):
                resp["extractedName"]["fullName"] = (resp["extractedName"].get("fullName") or "").upper()
            resp["candidates"] = [(c or "").upper() for c in resp.get("candidates", [])]
            print(f"TOTAL: {time.time() - t0:.2f}s  ->  id: {resp.get('detectedIdType')}  name: '{resp.get('suggestedName')}'")
            # Privacy: WALANG allLines / raw OCR text na ibinabalik.
            return resp

        # ── Legacy fallback (kung hindi na-load ang modules) ──
        suggested_name = (extract_visitor_name(lines) or "").upper()
        print(f"TOTAL (legacy): {time.time() - t0:.2f}s  ->  name: '{suggested_name}'")
        return {"success": bool(suggested_name), "suggestedName": suggested_name,
                "detectedIdType": "UNKNOWN", "requiresConfirmation": True, "candidates": []}

    except Exception as e:
        # Iwas mag-expose ng personal info sa error; mensahe lang.
        return {"success": False, "error": str(e), "suggestedName": ""}