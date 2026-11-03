# image_preprocessing.py
# Image enhancement bago mag-OCR. Gumagamit ng OpenCV+NumPy kung available;
# kung wala, gumagana pa rin ang buong pipeline (walang enhancement — graceful fallback).
#
# Public: preprocess(image_path) -> (processed_bgr_or_None, meta_dict)
#         is_blurry(image_bgr) -> (bool, score)
# Ang app.py ang bahalang mag-decode/encode; pwede ring ipasa ang numpy image diretso sa
# preprocess_array().

try:
    import cv2
    import numpy as np
    _CV = True
except Exception:
    _CV = False

BLUR_THRESHOLD = 90.0     # variance of Laplacian; mas mababa = mas blurry (configurable)
MAX_DIM = 1600            # i-resize pababa kung mas malaki (bilis + tamang OCR scale)


def available():
    return _CV


def is_blurry(img):
    """Returns (is_blurry, sharpness_score). Nangangailangan ng OpenCV."""
    if not _CV or img is None:
        return (False, None)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return (score < BLUR_THRESHOLD, round(score, 1))


def _auto_orient_osd(gray):
    """Subukang i-correct ang 90/180/270 rotation gamit ang Tesseract OSD kung meron.
       Optional lang — kung walang pytesseract, laktawan."""
    try:
        import pytesseract
        osd = pytesseract.image_to_osd(gray)
        import re
        m = re.search(r"Rotate: (\d+)", osd)
        if m:
            return int(m.group(1))
    except Exception:
        pass
    return 0


def preprocess_array(img, meta=None):
    """
    img: BGR numpy image. Returns (processed_img, meta).
    Mga hakbang: grayscale-aware enhance → resize → denoise → contrast (CLAHE) → sharpen.
    """
    meta = meta or {}
    if not _CV or img is None:
        meta["preprocessed"] = False
        return img, meta

    h, w = img.shape[:2]
    meta["original_size"] = [int(w), int(h)]

    # Blur detection (bago ang enhance)
    blurry, sharp = is_blurry(img)
    meta["blurry"] = blurry
    meta["sharpness"] = sharp

    # Orientation (optional, kung may pytesseract)
    rot = _auto_orient_osd(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    if rot in (90, 180, 270):
        code = {90: cv2.ROTATE_90_CLOCKWISE, 180: cv2.ROTATE_180, 270: cv2.ROTATE_90_COUNTERCLOCKWISE}[rot]
        img = cv2.rotate(img, code)
        meta["rotated"] = rot

    # Resize (preserve aspect; i-upscale lang ang maliliit para readable)
    h, w = img.shape[:2]
    scale = 1.0
    longest = max(h, w)
    if longest > MAX_DIM:
        scale = MAX_DIM / float(longest)
    elif longest < 900:
        scale = 900.0 / float(longest)
    if abs(scale - 1.0) > 1e-3:
        img = cv2.resize(img, (int(w * scale), int(h * scale)),
                         interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)
        meta["resized_scale"] = round(scale, 3)

    # Denoise (banayad) + CLAHE contrast sa luminance + unsharp mask
    try:
        img = cv2.bilateralFilter(img, 5, 50, 50)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        img = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)
        blur = cv2.GaussianBlur(img, (0, 0), 1.0)
        img = cv2.addWeighted(img, 1.4, blur, -0.4, 0)   # unsharp
        meta["enhanced"] = True
    except Exception as e:
        meta["enhance_error"] = str(e)

    meta["preprocessed"] = True
    return img, meta


def preprocess(image_path, meta=None):
    """Mula sa path. Returns (processed_img_or_None, meta)."""
    meta = meta or {}
    if not _CV:
        meta["preprocessed"] = False
        meta["reason"] = "opencv-not-installed"
        return None, meta
    img = cv2.imread(image_path)
    if img is None:
        meta["preprocessed"] = False
        meta["reason"] = "unreadable-image"
        return None, meta
    return preprocess_array(img, meta)