# id_layouts.py
# Per-ID extraction strategy config. Walang coordinate-locked templates — gumagamit ng
# LABELS (hanapin ang value katabi/kasunod ng label) + ANTI-LABELS (iwasan ang linyang ito).
#
# Ginagamit ng name_extractor.py. Kung walang entry ang isang ID type dito,
# babagsak ito sa DEFAULT layout (generic label + anti-label extraction).

# Mga label na karaniwang KASUNOD (o KATABI) ng pangalan ng tao.
SURNAME_LABELS   = ["apelyido", "last name", "surname", "family name"]
GIVEN_LABELS     = ["mga pangalan", "given names", "given name", "first name", "pangalan"]
MIDDLE_LABELS    = ["gitnang apelyido", "middle name", "middle initial", "gitnang pangalan"]
FULLNAME_LABELS  = ["name", "ngalan", "pangalan ng may hawak", "cardholder", "registered name",
                    "complete name", "full name"]

# Mga salitang NAGPAPAHIWATIG na HINDI pangalan ang linya (anti-labels / field noise).
# Kung ang isang linya ay naglalaman ng alinman dito, hindi ito kukunin bilang pangalan.
COMMON_ANTI = [
    "republic", "republika", "pilipinas", "philippines", "identification", "card",
    "id no", "id number", "date of birth", "petsa ng kapanganakan", "birth",
    "address", "tirahan", "sex", "kasarian", "nationality", "citizenship",
    "signature", "lagda", "valid", "expiry", "expiration", "issued", "date issued",
    "blood type", "civil status", "place of birth", "lugar ng kapanganakan",
    "number", "no.", "serial", "control", "www.", ".gov", "http", "bureau",
    "department", "office", "administration", "commission", "corporation",
    "system", "fund", "agency", "precinct", "profession", "license", "restriction",
    "weight", "height", "eyes", "sss no", "tin", "crn", "psn", "pin",
]

# Default strategy (ginagamit ng UNKNOWN at ng mga type na walang espesipikong config)
DEFAULT_LAYOUT = {
    "surname_labels": SURNAME_LABELS,
    "given_labels": GIVEN_LABELS,
    "middle_labels": MIDDLE_LABELS,
    "fullname_labels": FULLNAME_LABELS,
    "anti": COMMON_ANTI,
    "order": "given_middle_surname",   # paano buuin ang full name kapag hiwalay ang fields
    "mrz": False,
    "surname_comma_given": False,      # True kapag "SURNAME, GIVEN MIDDLE" sa isang linya
    "notes": "Generic label-based extraction.",
}


def _layout(**over):
    base = dict(DEFAULT_LAYOUT)
    base.update(over)
    return base


LAYOUTS = {
    # Hiwalay na fields na may Filipino + English labels; given-middle-surname order.
    "PHILIPPINE_NATIONAL_ID": _layout(
        notes="PhilID: Apelyido / Mga Pangalan / Gitnang Apelyido. Iwasan ang PhilSys/PSN.",
        anti=COMMON_ANTI + ["philsys", "psn", "pambansang"],
    ),
    "EPHILID": _layout(
        notes="ePhilID: parehong fields ng PhilID, paper-based.",
        anti=COMMON_ANTI + ["philsys", "psn", "ephilid"],
    ),

    # Karamihan sa license: isang linyang 'SURNAME, GIVEN MIDDLE'
    "DRIVERS_LICENSE": _layout(
        surname_comma_given=True,
        notes="LTO license: 'DELA CRUZ, JUAN SANTOS'. Iwasan DL No/Restrictions/Address.",
        anti=COMMON_ANTI + ["land transportation", "dl no", "restrictions", "conditions",
                            "agency code", "non-professional", "professional"],
    ),

    # Passport: gamitin ang MRZ (P<PHLSURNAME<<GIVEN<MIDDLE) kung meron; else Surname/Given labels.
    "PASSPORT": _layout(
        mrz=True,
        notes="Passport: MRZ-first (P<PHL...), fallback Surname/Given names labels.",
        anti=COMMON_ANTI + ["passport", "pasaporte", "foreign affairs", "type", "code",
                            "authority", "date of issue", "date of expiry"],
    ),

    "UMID": _layout(
        notes="UMID: SURNAME / GIVEN NAME / MIDDLE NAME; iwasan CRN at agency names.",
        anti=COMMON_ANTI + ["unified", "multi-purpose", "crn", "common reference"],
    ),
    "SSS_ID": _layout(anti=COMMON_ANTI + ["social security", "ss number"]),
    "GSIS_ID": _layout(anti=COMMON_ANTI + ["government service", "insurance", "ecard", "bp no"]),
    "PHILHEALTH_ID": _layout(anti=COMMON_ANTI + ["philhealth", "health insurance", "pin"]),
    "PAGIBIG_ID": _layout(anti=COMMON_ANTI + ["pag-ibig", "pagibig", "mutual fund", "mid no", "loyalty"]),
    "TIN_ID": _layout(anti=COMMON_ANTI + ["taxpayer", "internal revenue", "tin"]),
    "POSTAL_ID": _layout(anti=COMMON_ANTI + ["postal", "phlpost"]),
    "VOTERS_ID": _layout(anti=COMMON_ANTI + ["comelec", "elections", "precinct", "voter"]),

    "PRC_ID": _layout(
        notes="PRC: prioritize registered professional name; iwasan ang profession/reg no.",
        anti=COMMON_ANTI + ["regulation", "registration no", "profession", "valid until"],
    ),
    "OWWA_ID": _layout(anti=COMMON_ANTI + ["overseas workers", "welfare"]),
    "SIRB": _layout(anti=COMMON_ANTI + ["seafarer", "seaman", "marina", "record book"]),

    # Document-style (clearance): hanapin ang 'Name' label; iwasan ang agency/title lines.
    "NBI_CLEARANCE": _layout(
        notes="NBI clearance: document layout, 'NAME' label. Iwasan ang agency/title.",
        anti=COMMON_ANTI + ["bureau of investigation", "clearance", "nbi"],
    ),
    "POLICE_CLEARANCE": _layout(
        notes="Police clearance: document layout. Iwasan ang PNP/clearance title.",
        anti=COMMON_ANTI + ["national police", "clearance", "pnp"],
    ),

    "SENIOR_CITIZEN_ID": _layout(anti=COMMON_ANTI + ["senior citizen", "osca"]),
    "PWD_ID": _layout(anti=COMMON_ANTI + ["disability", "pwd", "disabilities"]),
    "SOLO_PARENT_ID": _layout(anti=COMMON_ANTI + ["solo parent"]),
    "BARANGAY_ID": _layout(anti=COMMON_ANTI + ["barangay", "clearance", "certification"]),
    "MILITARY_ID": _layout(anti=COMMON_ANTI + ["armed forces", "military", "afp"]),
    "VETERANS_ID": _layout(anti=COMMON_ANTI + ["veterans", "pvao"]),

    "UNKNOWN": _layout(notes="Unknown ID → generic label-based + positional fallback."),
}


def get_layout(id_type: str) -> dict:
    return LAYOUTS.get(id_type, DEFAULT_LAYOUT)