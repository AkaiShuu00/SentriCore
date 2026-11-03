# id_classifier.py
# SentriCore OCR enhancement — ID type classification para sa Philippine government IDs.
# Walang external dependency. Input = listahan ng OCR text lines (strings).
# Output = (id_type, confidence, matched_keywords).
#
# Hindi ito nag-aastang authenticity checker — tumutukoy lang kung anong KLASE ng ID,
# gamit ang mga keyword/indicator na nakikita sa harap ng bawat ID.

import re

# Bawat ID: listahan ng (phrase, weight). Mas specific na phrase = mas mataas na weight.
# Lahat ng matching ay case-insensitive at space-normalized.
ID_INDICATORS = {
    "PHILIPPINE_NATIONAL_ID": [
        ("pambansang pagkakakilanlan", 5), ("philippine identification card", 5),
        ("philsys", 4), ("national id", 3), ("republika ng pilipinas", 1),
    ],
    "EPHILID": [
        ("ephilid", 6), ("philippine identification system", 4), ("psn", 2),
    ],
    "UMID": [
        ("unified multi-purpose id", 6), ("umid", 5), ("crn", 2),
        ("social security system", 1), ("gsis", 1),
    ],
    "SSS_ID": [
        ("social security system", 5), ("sss", 3), ("ss number", 3),
    ],
    "GSIS_ID": [
        ("government service insurance system", 6), ("gsis", 4), ("ecard", 2),
    ],
    "PHILHEALTH_ID": [
        ("philhealth", 6), ("philippine health insurance", 5), ("pin", 1),
    ],
    "PAGIBIG_ID": [
        ("home development mutual fund", 6), ("pag-ibig", 5), ("pagibig", 5),
        ("loyalty card", 2), ("mid no", 2),
    ],
    "TIN_ID": [
        ("taxpayer identification number", 6), ("bureau of internal revenue", 5),
        ("tin", 3),
    ],
    "DRIVERS_LICENSE": [
        ("land transportation office", 6), ("driver's license", 5),
        ("non-professional", 3), ("professional", 1), ("lto", 3),
        ("dl no", 3), ("restrictions", 2), ("agency code", 2),
    ],
    "PASSPORT": [
        ("passport", 5), ("pasaporte", 5), ("republic of the philippines", 2),
        ("department of foreign affairs", 4), ("p<phl", 6),  # MRZ signature
    ],
    "POSTAL_ID": [
        ("philippine postal corporation", 6), ("postal id", 5), ("phlpost", 4),
    ],
    "VOTERS_ID": [
        ("commission on elections", 6), ("comelec", 5), ("voter", 3),
        ("precinct", 3),
    ],
    "PRC_ID": [
        ("professional regulation commission", 6), ("prc", 4),
        ("registration no", 2), ("profession", 2),
    ],
    "OWWA_ID": [
        ("overseas workers welfare administration", 6), ("owwa", 5),
    ],
    "SIRB": [
        ("seafarer", 6), ("seaman", 4), ("record book", 3), ("marina", 3),
    ],
    "NBI_CLEARANCE": [
        ("national bureau of investigation", 6), ("nbi clearance", 6), ("nbi", 3),
    ],
    "POLICE_CLEARANCE": [
        ("philippine national police", 6), ("police clearance", 6), ("pnp", 3),
    ],
    "SENIOR_CITIZEN_ID": [
        ("senior citizen", 6), ("osca", 5), ("office for senior citizens", 5),
    ],
    "PWD_ID": [
        ("person with disability", 6), ("pwd", 4), ("persons with disabilities", 5),
    ],
    "SOLO_PARENT_ID": [
        ("solo parent", 6),
    ],
    "BARANGAY_ID": [
        ("barangay", 4), ("barangay id", 6), ("barangay clearance", 5),
        ("certification", 1),
    ],
    "MILITARY_ID": [
        ("armed forces of the philippines", 6), ("afp", 3), ("military", 3),
    ],
    "VETERANS_ID": [
        ("veterans", 6), ("philippine veterans affairs", 6), ("pvao", 5),
    ],
}

# Mga salitang pangkaraniwan sa lahat ng gov ID — hindi sapat para mag-classify mag-isa.
GENERIC_NOISE = {"republic of the philippines", "republika ng pilipinas"}

MIN_SCORE = 4            # pinakamababang total weight bago mag-commit sa isang type
MIN_MARGIN = 2           # kailangang mas mataas ng ganito ang #1 kaysa #2 (kung hindi → UNKNOWN)


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip().lower()


def classify_id(lines):
    """
    lines: listahan ng strings (OCR text lines).
    Returns dict: { id_type, confidence (0..1), scores (top 3), matched }
    """
    blob = " ".join(_norm(l) for l in (lines or []))
    scores = {}
    matched = {}

    for id_type, indicators in ID_INDICATORS.items():
        total = 0
        hits = []
        for phrase, weight in indicators:
            if phrase in GENERIC_NOISE:
                continue
            if phrase in blob:
                total += weight
                hits.append(phrase)
        if total > 0:
            scores[id_type] = total
            matched[id_type] = hits

    if not scores:
        return {"id_type": "UNKNOWN", "confidence": 0.0, "scores": {}, "matched": []}

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    top_type, top_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0

    # Hindi sapat ang ebidensya, o masyadong magkalapit ang dalawa → UNKNOWN (generic fallback).
    if top_score < MIN_SCORE or (top_score - second_score) < MIN_MARGIN:
        return {
            "id_type": "UNKNOWN",
            "confidence": round(min(top_score / 10.0, 0.49), 2),
            "scores": dict(ranked[:3]),
            "matched": matched.get(top_type, []),
        }

    # Confidence: i-scale ang score, i-cap sa 0.98. Mas maraming distinct hits = mas mataas.
    distinct = len(set(matched.get(top_type, [])))
    conf = min(0.55 + 0.09 * top_score + 0.04 * distinct, 0.98)

    return {
        "id_type": top_type,
        "confidence": round(conf, 2),
        "scores": dict(ranked[:3]),
        "matched": matched.get(top_type, []),
    }


if __name__ == "__main__":
    # Mabilisang sanity check
    samples = {
        "national": ["Republika ng Pilipinas", "PhilSys", "Pambansang Pagkakakilanlan",
                     "Apelyido/Last Name", "DELA CRUZ", "Mga Pangalan/Given Names", "JUAN"],
        "license": ["LAND TRANSPORTATION OFFICE", "NON-PROFESSIONAL DRIVER'S LICENSE",
                    "DELA CRUZ, JUAN SANTOS", "DL No. N01-23-456789", "Restrictions 2"],
        "passport": ["REPUBLIC OF THE PHILIPPINES", "PASSPORT", "P<PHLDELACRUZ<<JUAN<SANTOS"],
        "unknown": ["MEMBERSHIP CARD", "GOLD TIER", "JUAN DELA CRUZ"],
    }
    for k, v in samples.items():
        print(k, "->", classify_id(v))