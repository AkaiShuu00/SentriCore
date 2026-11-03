# name_extractor.py
# Layout-aware NAME-ONLY extraction. Kinukuha LANG ang pangalan ng tao.
# Walang ibinabalik na DOB, address, numero, atbp.
#
# Input tokens: listahan ng dict { "text": str, "box": optional, "score": optional float }.
#   box (optional) = PaddleOCR quad [[x,y],[x,y],[x,y],[x,y]] o [x,y,w,h]. Para sa ordering/position.
# Output: dict na may firstName/middleName/lastName/fullName + nameConfidence + requiresConfirmation.

import re
from id_layouts import get_layout

NAME_CHAR = re.compile(r"^[A-Za-zÑñ .,'\-]+$")
HAS_DIGIT = re.compile(r"\d")
PARTICLES = {"DELA", "DE", "DEL", "LA", "LOS", "SAN", "SANTA", "STO", "STA", "MC", "MAC", "VDA"}

# Mga salitang LABEL mismo — hindi kailanman dapat maging VALUE (pangalan).
LABEL_WORDS = {
    "name", "names", "last", "first", "middle", "given", "surname", "family",
    "apelyido", "pangalan", "mga", "gitnang", "ngalan", "cardholder", "registered",
    "complete", "full", "initial",
}


def _norm(s):
    return re.sub(r"\s+", " ", (s or "")).strip()


def _box_center(box):
    """Returns (cx, cy) kung may box; else None."""
    if not box:
        return None
    try:
        if isinstance(box[0], (list, tuple)):
            xs = [p[0] for p in box]; ys = [p[1] for p in box]
            return (sum(xs) / len(xs), sum(ys) / len(ys))
        # [x,y,w,h]
        x, y, w, h = box
        return (x + w / 2.0, y + h / 2.0)
    except Exception:
        return None


def _is_name_like(text, anti):
    """Totoong hitsura ng pangalan? (letters lang, walang anti-keyword/digit)."""
    t = _norm(text)
    if not t or HAS_DIGIT.search(t):
        return False
    if not NAME_CHAR.match(t):
        return False
    low = t.lower()
    for a in anti:
        if a in low:
            return False
    words = [w for w in re.split(r"[ ,]+", t) if w]
    if not (1 <= len(words) <= 5):
        return False
    # Hindi dapat lahat ay isang letra lang (hal. "A B C")
    if all(len(w) <= 1 for w in words):
        return False
    # Hindi dapat ALL-CAPS acronym na walang patinig sa bawat salita at maikli
    letters = re.sub(r"[^A-Za-zÑñ]", "", t)
    if len(letters) < 3:
        return False
    # Huwag tanggapin kung ang linya mismo ay LABEL (hal. "Last Name", "Mga Pangalan").
    low_words = set(re.sub(r"[^a-zñ ]", " ", low).split())
    if words and low_words and low_words.issubset(LABEL_WORDS):
        return False
    return True


def _value_after_label(line, label_variants):
    """Kung ang linya ay 'Label: VALUE' o 'Label VALUE', ibalik ang VALUE."""
    low = line.lower()
    for lab in label_variants:
        idx = low.find(lab)
        if idx != -1:
            rest = line[idx + len(lab):]
            rest = rest.lstrip(" :/-")
            if rest.strip():
                return _norm(rest)
    return None


def _line_is_label(line, label_variants):
    low = line.lower()
    return any(lab in low for lab in label_variants)


def _title_case(s):
    out = []
    for w in _norm(s).split():
        if w.upper() in PARTICLES:
            out.append(w.capitalize())
        elif "-" in w:
            out.append("-".join(p.capitalize() for p in w.split("-")))
        else:
            out.append(w.capitalize())
    return " ".join(out)


# ── Strategy 1: MRZ (passport) ───────────────────────────────────────────────
def _extract_mrz(lines):
    for ln in lines:
        s = _norm(ln).upper().replace(" ", "")
        if s.startswith("P<PHL") and "<<" in s:
            body = s[5:]
            surname_part, _, given_part = body.partition("<<")
            surname = surname_part.replace("<", " ").strip()
            givens = [g for g in given_part.split("<") if g]
            first = givens[0] if givens else ""
            middle = " ".join(givens[1:]) if len(givens) > 1 else ""
            if surname and first:
                return {
                    "firstName": _title_case(first),
                    "middleName": _title_case(middle),
                    "lastName": _title_case(surname),
                    "_strategy": "mrz",
                    "_score": 0.96,
                }
    return None


# ── Strategy 2: 'SURNAME, GIVEN MIDDLE' sa isang linya (license, atbp.) ───────
def _extract_comma(lines, anti):
    for ln in lines:
        t = _norm(ln)
        if "," not in t or HAS_DIGIT.search(t):
            continue
        low = t.lower()
        if any(a in low for a in anti):
            continue
        left, _, right = t.partition(",")
        left, right = _norm(left), _norm(right)
        if not left or not right:
            continue
        if not NAME_CHAR.match(left) or not NAME_CHAR.match(right):
            continue
        givens = right.split()
        if not givens:
            continue
        first = givens[0]
        middle = " ".join(givens[1:]) if len(givens) > 1 else ""
        return {
            "firstName": _title_case(first),
            "middleName": _title_case(middle),
            "lastName": _title_case(left),
            "_strategy": "surname_comma_given",
            "_score": 0.9,
        }
    return None


# ── Strategy 3: label-based (value sa parehong linya o kasunod na linya) ──────
def _extract_by_labels(lines, layout):
    anti = layout["anti"]

    def find_field(label_variants):
        for i, ln in enumerate(lines):
            # Case A: value sa parehong linya ('Last Name: DELA CRUZ')
            if _line_is_label(ln, label_variants):
                val = _value_after_label(ln, label_variants)
                if val and _is_name_like(val, anti):
                    return val
                # Case B: value sa SUSUNOD na non-label, name-like na linya
                for j in range(i + 1, min(i + 3, len(lines))):
                    nxt = _norm(lines[j])
                    if not nxt:
                        continue
                    if _is_name_like(nxt, anti) and not _line_is_label(nxt, label_variants):
                        return nxt
                    break
        return None

    last = find_field(layout["surname_labels"])
    given = find_field(layout["given_labels"])
    middle = find_field(layout["middle_labels"])

    if last or given:
        return {
            "firstName": _title_case(given or ""),
            "middleName": _title_case(middle or ""),
            "lastName": _title_case(last or ""),
            "_strategy": "labels",
            "_score": 0.85 if (last and given) else 0.6,
        }

    # Full-name label ('Name: JUAN SANTOS DELA CRUZ')
    full = find_field(layout["fullname_labels"])
    if full:
        return _split_full(full, score=0.7, strategy="fullname_label")
    return None


# ── Strategy 4: generic positional fallback ──────────────────────────────────
def _extract_generic(tokens, layout):
    anti = layout["anti"]
    cands = []
    for i, tok in enumerate(tokens):
        text = _norm(tok.get("text"))
        if not _is_name_like(text, anti):
            continue
        words = text.split()
        if len(words) < 2:        # para sa generic, kailangan 2+ salita
            continue
        center = _box_center(tok.get("box"))
        y = center[1] if center else i          # taas-pababa kung walang box
        score = float(tok.get("score") or 0.8)
        # Mas pinapaboran: mas maraming salita (2-4), mataas na OCR score, mas nasa itaas
        wscore = 1.0 if 2 <= len(words) <= 4 else 0.6
        cands.append((wscore * score, -y, text))

    if not cands:
        return None
    cands.sort(reverse=True)
    best = cands[0][2]
    return _split_full(best, score=0.5, strategy="generic")


def _split_full(full, score, strategy):
    """Hatiin ang full name sa first/middle/last gamit ang Filipino conventions."""
    words = _norm(full).split()
    if not words:
        return None
    if len(words) == 1:
        return {"firstName": _title_case(words[0]), "middleName": "", "lastName": "",
                "_strategy": strategy, "_score": min(score, 0.45)}

    # I-handle ang particles (DELA CRUZ, DE LEON) bilang parte ng apelyido.
    last_tokens = [words[-1]]
    k = len(words) - 2
    while k >= 1 and words[k].upper() in PARTICLES:
        last_tokens.insert(0, words[k]); k -= 1
    last = " ".join(last_tokens)

    remaining = words[:len(words) - len(last_tokens)]
    if len(remaining) >= 2:
        first = remaining[0]
        middle = " ".join(remaining[1:])
    else:
        first = remaining[0] if remaining else ""
        middle = ""
    return {
        "firstName": _title_case(first),
        "middleName": _title_case(middle),
        "lastName": _title_case(last),
        "_strategy": strategy,
        "_score": score,
    }


def extract_name(tokens, id_type):
    """
    tokens: list of { text, box?, score? }
    id_type: galing sa id_classifier
    Returns: { firstName, middleName, lastName, fullName, nameConfidence,
               requiresConfirmation, strategy }
    """
    layout = get_layout(id_type)
    lines = [_norm(t.get("text")) for t in (tokens or []) if _norm(t.get("text"))]

    result = None
    if layout.get("mrz"):
        result = _extract_mrz(lines)
    if not result and layout.get("surname_comma_given"):
        result = _extract_comma(lines, layout["anti"])
    if not result:
        result = _extract_by_labels(lines, layout)
    if not result:
        result = _extract_comma(lines, layout["anti"])   # minsan may comma kahit di license
    if not result:
        result = _extract_generic(tokens, layout)

    if not result:
        return {
            "firstName": "", "middleName": "", "lastName": "", "fullName": "",
            "nameConfidence": 0.0, "requiresConfirmation": True, "strategy": "none",
        }

    parts = [result.get("firstName", ""), result.get("middleName", ""), result.get("lastName", "")]
    full = _norm(" ".join(p for p in parts if p))
    conf = float(result.get("_score", 0.5))

    # I-penalize kung kulang (walang apelyido o walang first) — kailangan ng confirmation.
    if not result.get("lastName") or not result.get("firstName"):
        conf = min(conf, 0.55)

    return {
        "firstName": result.get("firstName", ""),
        "middleName": result.get("middleName", ""),
        "lastName": result.get("lastName", ""),
        "fullName": full,
        "nameConfidence": round(conf, 2),
        "requiresConfirmation": conf < 0.80,
        "strategy": result.get("_strategy", "unknown"),
    }


if __name__ == "__main__":
    tests = [
        ("DRIVERS_LICENSE", [{"text": "LAND TRANSPORTATION OFFICE"},
                              {"text": "DELA CRUZ, JUAN SANTOS"},
                              {"text": "DL No. N01-23-456789"}]),
        ("PHILIPPINE_NATIONAL_ID", [{"text": "Apelyido/Last Name"}, {"text": "DELA CRUZ"},
                                     {"text": "Mga Pangalan/Given Names"}, {"text": "JUAN"},
                                     {"text": "Gitnang Apelyido/Middle Name"}, {"text": "SANTOS"}]),
        ("PASSPORT", [{"text": "REPUBLIC OF THE PHILIPPINES"}, {"text": "PASSPORT"},
                       {"text": "P<PHLDELACRUZ<<JUAN<SANTOS<<<<<<<<"}]),
        ("UNKNOWN", [{"text": "MEMBERSHIP CARD"}, {"text": "JUAN SANTOS DELA CRUZ"}]),
    ]
    for idt, toks in tests:
        print(idt, "->", extract_name(toks, idt))