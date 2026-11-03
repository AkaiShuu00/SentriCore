# ocr_enhance.py
# Orchestrator na pinagdurugtong ang classify → layout → name extraction.
# Ito ang TAWAGIN ng iyong app.py PAGKATAPOS tumakbo ang PaddleOCR.
#
# Dalawang entry points:
#   build_response_from_tokens(tokens) -> structured dict  (preferred; may boxes/scores)
#   build_response_from_lines(lines)   -> structured dict  (kung text lines lang meron ka)
#
# WALANG raw OCR text sa output. Pangalan + ID type metadata lang.

from id_classifier import classify_id
from name_extractor import extract_name, _is_name_like, _norm
from id_layouts import get_layout


def _alt_candidates(tokens, id_type, chosen_full, limit=3):
    """Mga alternatibong buong-pangalan (strings) para sa frontend retry loop.
       Name-like lines na may 2+ salita, maliban sa napiling pangalan."""
    layout = get_layout(id_type)
    anti = layout["anti"]
    seen = set()
    out = []
    chosen_up = (chosen_full or "").upper()
    for t in (tokens or []):
        txt = _norm(t.get("text"))
        if not txt or not _is_name_like(txt, anti):
            continue
        if len(txt.split()) < 2:
            continue
        up = txt.upper()
        if up == chosen_up or up in seen:
            continue
        seen.add(up)
        out.append(txt)
        if len(out) >= limit:
            break
    return out


def _tokens_to_lines(tokens):
    out = []
    for t in (tokens or []):
        s = (t.get("text") or "").strip()
        if s:
            out.append(s)
    return out


def build_response_from_tokens(tokens, preprocess_meta=None):
    """
    tokens: list of { text, box?, score? } galing sa PaddleOCR.
    Returns ang structured, name-only na response.
    """
    lines = _tokens_to_lines(tokens)
    cls = classify_id(lines)
    id_type = cls["id_type"]
    name = extract_name(tokens, id_type)

    requires = bool(name["requiresConfirmation"] or cls["confidence"] < 0.5 or not name["fullName"])

    resp = {
        "success": bool(name["fullName"]),
        "detectedIdType": id_type,
        "classificationConfidence": cls["confidence"],
        "extractedName": {
            "firstName": name["firstName"],
            "middleName": name["middleName"],
            "lastName": name["lastName"],
            "fullName": name["fullName"],
        },
        "nameConfidence": name["nameConfidence"],
        "requiresConfirmation": requires,
        # Pang-UI lang; hindi raw OCR text:
        "confidenceBand": _band(name["nameConfidence"]),
        "strategy": name["strategy"],
        # Backward-compat sa kasalukuyang frontend (GuardVerify):
        "suggestedName": name["fullName"],
        "candidates": _alt_candidates(tokens, id_type, name["fullName"]),
    }
    if preprocess_meta is not None:
        resp["imageQuality"] = {
            "blurry": preprocess_meta.get("blurry"),
            "sharpness": preprocess_meta.get("sharpness"),
            "preprocessed": preprocess_meta.get("preprocessed"),
        }
    return resp


def build_response_from_lines(lines, preprocess_meta=None):
    tokens = [{"text": l} for l in (lines or [])]
    return build_response_from_tokens(tokens, preprocess_meta)


def _band(conf):
    if conf >= 0.80:
        return "HIGH"
    if conf >= 0.55:
        return "MEDIUM"
    return "LOW"


# Helper para kay app.py: i-convert ang raw PaddleOCR result → tokens.
# Sinusuportahan ang karaniwang hugis: result = [[ [box, (text, score)], ... ]]
def paddle_result_to_tokens(paddle_result):
    tokens = []
    try:
        pages = paddle_result if paddle_result and isinstance(paddle_result[0], list) else [paddle_result]
        for page in pages:
            if not page:
                continue
            for item in page:
                # item = [box, (text, score)]  O  [box, text]
                box = item[0] if len(item) > 0 else None
                payload = item[1] if len(item) > 1 else None
                if isinstance(payload, (list, tuple)):
                    text = payload[0]
                    score = payload[1] if len(payload) > 1 else None
                else:
                    text, score = payload, None
                if text:
                    tokens.append({"text": text, "box": box, "score": score})
    except Exception:
        # Huling fallback: subukang kunin ang anumang string
        pass
    return tokens