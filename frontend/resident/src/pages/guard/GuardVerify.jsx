import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getResidentsForGuard, getActiveVisitors, getCompanions, getSchedule, getGatePickups, checkBlocklist, getExpectedDeliveries } from '../../api';
import { User, Truck, Camera, Search, RefreshCw, ShieldAlert, Phone } from 'lucide-react';

const teal = '#0F6E6E';
// Relative base URL — goes through ngrok/Vite proxy → backend → OCR.
// Avoids mixed-content block when the page is HTTPS (ngrok). Also works on localhost.
const API = '/api';

const DEFAULT_SCANNED_NAME = '';
const DEFAULT_DRIVER_NAME = '';

function IDCardPlaceholder({ name }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm bg-white">
      <div className="h-8 flex items-center justify-center text-[8px] font-bold text-white"
           style={{ background: 'linear-gradient(90deg,#0F5E5E,#7FB0AE)' }}>
        REPUBLIC OF THE PHILIPPINES · NATIONAL ID
      </div>
      <div className="flex gap-3 p-3">
        <div className="w-14 h-16 rounded bg-gray-200 flex items-center justify-center"><User size={26} className="text-gray-400" /></div>
        <div className="flex-1 space-y-1 pt-1">
          <div className="h-2 bg-gray-200 rounded w-3/4" />
          <div className="h-2 bg-gray-200 rounded w-1/2" />
          <div className="h-2 bg-gray-200 rounded w-2/3" />
          <div className="h-2 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
      {name && (
        <div className="border-t border-gray-200 px-3 py-2">
          <span className="text-xs text-ink font-semibold">Name: {name}</span>
        </div>
      )}
    </div>
  );
}

// Get the first value from a list of possible field names (robust across schemas).
const pick = (obj, keys) => {
  for (const k of keys) if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  return null;
};

const nameTokens = (s) => (s || '').toUpperCase().replace(/[.,\-]/g, ' ').split(/\s+/).filter((w) => w.length >= 2);
const nameMatches = (scanned, dbName) => {
  const a = nameTokens(scanned);
  const b = nameTokens(dbName);
  if (a.length === 0 || b.length === 0) return false;
  // Strict: if the scanned name is full (2+ tokens), ALL db-name tokens must match
  // (so a different "Dela Cruz" is not matched)
  if (a.length >= 2) return b.every((w) => a.includes(w)) && a.every((w) => b.includes(w));
  // Surname only — partial fallback
  return b.some((w) => a.includes(w));
};

export default function GuardVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExit = searchParams.get('mode') === 'exit';
  const [step, setStep] = useState(isExit ? 'scan' : 'choose');
  const [entryType, setEntryType] = useState(null);
  const [drivePurpose, setDrivePurpose] = useState('');
  const [plate, setPlate] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [showAccompany, setShowAccompany] = useState(false);
  const [selectedCompanions, setSelectedCompanions] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const [entryInfo, setEntryInfo] = useState({});
  const [manualSelected, setManualSelected] = useState(null);
  const [contactedResident, setContactedResident] = useState(null);
  const [showCallResult, setShowCallResult] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('All');
  const [pickupTarget, setPickupTarget] = useState('');
  const [pickedUpVisitor, setPickedUpVisitor] = useState(null);
  const [pickupResident, setPickupResident] = useState(null);
  const [activeSearch, setActiveSearch] = useState('');
  const [deliveryResident, setDeliveryResident] = useState(null);
  const [deliveryRegs, setDeliveryRegs] = useState([]);   // residents na may expected delivery ngayong linggo
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [scannedName, setScannedName] = useState(DEFAULT_SCANNED_NAME);
  const [driverName, setDriverName] = useState(DEFAULT_DRIVER_NAME);
  const [ocrError, setOcrError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exitNote, setExitNote] = useState('');                 // optional exit note (1 of 4 choices)
  const [exitAdditionalNote, setExitAdditionalNote] = useState(''); // optional free-text
  const [matchData, setMatchData] = useState({});
  const [candidates, setCandidates] = useState([]);   // all matching candidates (disambiguation)
  const multiRef = useRef(false);                      // may 2+ candidate ba?
  const exitMultiRef = useRef(false);                  // exit: need to pick from the active list?

  // ── Real data mula DB ──
  const [residentsDB, setResidentsDB] = useState([]);
  const [activeDB, setActiveDB] = useState([]);
  const [entryCompanions, setEntryCompanions] = useState([]);   // for ENTRY accompanying
  const [registeredDB, setRegisteredDB] = useState([]);         // all registered/expected visitors (manual search)
  const [regSearch, setRegSearch] = useState('');
  const [passMap, setPassMap] = useState({});                   // preview: NAME(UPPER) → pass number (V-001/D-001)
  const [gatePickups, setGatePickups] = useState([]);           // residents waiting for pickup (DB, cross-device)
  const [blockInfo, setBlockInfo] = useState(null);             // { blocked, matches } for the scanned visitor
  const [blockNote, setBlockNote] = useState('');               // note when the guard confirms it is a different person

  const token = () => localStorage.getItem('sentricore_token');
  // Header so ngrok-free does not return the HTML warning page on API calls.
  const NGROK = { 'ngrok-skip-browser-warning': 'true' };
  const authHeaders = (extra = {}) => ({ Authorization: `Bearer ${token()}`, ...NGROK, ...extra });

  // EXIT matching — same as backend entry: it is enough that ALL tokens of
  // the DB name are in the scan (accepts extra OCR noise).
  const exitMatches = (scanned, dbName) => {
    const a = nameTokens(scanned), b = nameTokens(dbName);
    if (a.length === 0 || b.length === 0) return false;
    if (a.length >= 2) return b.every((w) => a.includes(w));
    return b.some((w) => a.includes(w));
  };
  // Build exit matchData from an active-visitor row
  const fromActive = (v) => ({
    transactionId: v.transactionId, arrivalId: v.arrivalId, registrationId: v.registrationId,
    passId: v.passNumber || ('VST ' + v.transactionId),
    category: (v.regType || 'Single').toUpperCase(), regType: v.regType || 'Single',
    resident: v.resident || '', address: v.address || '',
    visitor: v.name, purpose: v.purpose || 'N/A', expectedDate: '', residentId: v.residentId,
  });

  const loadActive = () =>
    getActiveVisitors().then((res) => {
      const list = (res.data || []).map((t) => ({
        transactionId: t.transaction_id,
        name: t.visitor_name,
        resident: t.resident_name,
        address: t.unit_address,
        residentId: t.resident_id,
        purpose: t.purpose || 'N/A',
        regType: t.registration_type || 'Single',
        registrationId: t.registration_id,
        arrivalId: t.arrival_id,
        passNumber: t.pass_number,
      }));
      setActiveDB(list);
      return list;
    }).catch(() => { setActiveDB([]); return []; });

  // ── Get ALL registered/expected visitors for manual search ──
  // Robust sa iba't ibang field name at kaya ang batch (visitors array) o single row.
  const loadRegistered = () =>
    getSchedule().then((res) => {
      const rows = res.data || [];
      const flat = [];
      rows.forEach((reg) => {
        const base = {
          registrationId: pick(reg, ['registrationId', 'registration_id']),
          registrationType: pick(reg, ['registrationType', 'registration_type']) || 'Single',
          purpose: pick(reg, ['purpose']) || 'N/A',
          expectedDate: pick(reg, ['expectedDate', 'expected_date', 'expected_time', 'visit_date']) || '',
          residentName: pick(reg, ['residentName', 'resident_name', 'resident']) || '',
          residentAddress: pick(reg, ['residentAddress', 'resident_address', 'unit_address', 'address']) || '',
          residentId: pick(reg, ['residentId', 'resident_id']) || null,
        };
        const list = Array.isArray(reg.visitors) && reg.visitors.length ? reg.visitors : [reg];
        list.forEach((v) => {
          const nm = pick(v, ['registeredName', 'registered_name', 'visitorName', 'visitor_name', 'name', 'full_name']);
          if (!nm) return;
          const status = String(pick(v, ['status', 'entry_status']) || '').toUpperCase();
          // Show only those who have NOT entered yet (no time-in / not active / not departed)
          const entered = pick(v, ['timeIn', 'entry_time', 'time_in']);
          if (status === 'ACTIVE' || status === 'DEPARTED' || status === 'EXPIRED' || entered) return;
          flat.push({
            ...base,
            registeredName: nm,
            residentName: pick(v, ['residentName', 'resident_name', 'resident']) || base.residentName,
            residentAddress: pick(v, ['residentAddress', 'resident_address', 'unit_address', 'address']) || base.residentAddress,
            residentId: pick(v, ['residentId', 'resident_id']) || base.residentId,
            purpose: pick(v, ['purpose']) || base.purpose,
          });
        });
      });
      setRegisteredDB(flat);
      return flat;
    }).catch(() => { setRegisteredDB([]); return []; });

  useEffect(() => {
    getResidentsForGuard()
      .then((res) => setResidentsDB((res.data || []).map((r) => ({
        residentId: r.resident_id,
        name: r.full_name,
        address: r.unit_address,
        contact: r.contact_number || '',
      }))))
      .catch(() => setResidentsDB([]));
    loadActive();
  }, []);

  const isPickup = drivePurpose === 'PICKUP';
  const isDelivery = entryType === 'DELIVERY';
  const isDriverFlow = isPickup || isDelivery;

  // ── Load companions for ENTRY accompanying ──
  // Batch → same batch members (not yet entered); Single → expected singles
  const loadCompanions = async () => {
    try {
      const isBatch = (entryInfo.regType || matchData.regType || '').toLowerCase() === 'batch';
      const params = isBatch ? { registrationId: entryInfo.registrationId } : { single: 1 };
      const res = await getCompanions(params);
      const list = (res.data || []).filter((c) => c.name !== entryInfo.visitor);
      setEntryCompanions(list);
    } catch {
      setEntryCompanions([]);
    }
  };

  // ── EXIT accompanying pool: active visitors, prioritized ──
  // Batch scanned → same batch (registration_id) on top
  // Linked scanned → same arrival (arrival_id) on top
  const prioritizedActive = (() => {
    const scannedArrivalId = entryInfo.arrivalId;
    const scannedRegId = entryInfo.registrationId;
    const isBatchScanned = (entryInfo.regType || '').toLowerCase() === 'batch';
    const others = activeDB.filter((v) => v.transactionId !== entryInfo.transactionId);
    const onTop = others.filter((v) =>
      isBatchScanned
        ? (scannedRegId && v.registrationId === scannedRegId)
        : (scannedArrivalId && v.arrivalId === scannedArrivalId)
    );
    const rest = others.filter((v) => !onTop.some((o) => o.transactionId === v.transactionId));
    return [...onTop, ...rest];
  })();

  const additionalPool = isExit ? prioritizedActive : entryCompanions;

  const blocks = ['All', ...Array.from(new Set(
    residentsDB.map((r) => {
      const m = (r.address || '').match(/Block\s+([A-Za-z0-9]+)/);
      return m ? `Block ${m[1]}` : null;
    }).filter(Boolean)
  ))];

  const filteredResidents = residentsDB.filter((r) => {
    const q = residentSearch.toLowerCase();
    const matchQ = r.name.toLowerCase().includes(q) || (r.address || '').toLowerCase().includes(q);
    const matchBlock = blockFilter === 'All' || (r.address || '').includes(blockFilter);
    return matchQ && matchBlock;
  });

  // Call Resident → open the Phone app using the resident’s REAL contact number
  // (from DB: contact_number). After the call, the guard returns to SentriCore.
  const callResident = (r) => {
    setContactedResident(r);
    const number = String(r.contact || r.contact_number || r.phone || '').replace(/[^\d+]/g, '');
    if (!number) {
      alert('This resident has no contact number.');
    } else {
      window.location.href = `tel:${number}`;
    }
    setShowCallResult(true);
  };

  // ── Build the visitors payload (used by saveArrival AND the pass preview) ──
  const buildEntryVisitors = () => {
    // typeOverride: per-row visitor type (Visitor / Driver / Delivery)
    const mk = (name, resId, regId, typeOverride) => ({
      residentId: resId || null,
      registrationId: regId || null,
      visitorName: name,
      visitorType: typeOverride || 'Visitor',
      purpose: entryInfo.purpose || null,
      plateNumber: plate || null,
      passNumber: entryInfo.passId || null,
      status: 'Active',
    });

    // Driver type: Delivery if delivery flow; Driver if pickup/drop-off;
    // Visitor if personal visit (the visitor drove themselves).
    const driverType = entryInfo.visitorType || (entryInfo.category === 'DELIVERY' ? 'Delivery' : 'Driver');

    const visitors = [];
    // 1) DRIVER (if there is a vehicle) — always record who the driver is
    if (entryInfo.driver) {
      visitors.push(mk(entryInfo.driver, entryInfo.residentId, entryInfo.registrationId, driverType));
    }
    // 2) MAIN VISITOR (walk-in, or the one picked up/dropped off) — Visitor
    if (entryInfo.visitor && entryInfo.visitor !== entryInfo.driver) {
      visitors.push(mk(entryInfo.visitor, entryInfo.residentId, entryInfo.registrationId, 'Visitor'));
    }
    // 3) Companions — Visitor
    for (const c of selectedCompanions) {
      visitors.push(mk(c.name, c.residentId || entryInfo.residentId, c.registrationId || entryInfo.registrationId, 'Visitor'));
    }
    // Fallback: no driver and no visitor but there is a scanned name
    if (visitors.length === 0 && entryInfo.visitor) {
      visitors.push(mk(entryInfo.visitor, entryInfo.residentId, entryInfo.registrationId, 'Visitor'));
    }
    // Delivery na walang pangalan ng rider — gamitin ang placeholder (optional ang pangalan)
    if (visitors.length === 0 && entryInfo.category === 'DELIVERY') {
      visitors.push(mk(entryInfo.driver || 'Delivery Rider', entryInfo.residentId, entryInfo.registrationId, 'Delivery'));
    }
    return visitors;
  };

  // ── Save ENTRY to DATABASE (each companion has its own resident/registration) ──
  const saveArrival = async () => {
    const visitors = buildEntryVisitors();

    const res = await fetch(`${API}/entry/group`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ visitors }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to record entry.');
    }
    const data = await res.json().catch(() => ({}));
    return data.passes || [];   // auto-generated passes (V-001 / D-001 ...)
  };

  // ── Save EXIT to DATABASE ──
  const saveExit = async () => {
    const exitingIds = [entryInfo.transactionId, ...selectedCompanions.map((c) => c.transactionId)].filter(Boolean);
    if (exitingIds.length === 0) {
      throw new Error('No active transaction to exit. Please scan an active visitor.');
    }
    for (const id of exitingIds) {
      const res = await fetch(`${API}/entry/${id}/exit`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          exitNote: exitNote || null,
          exitAdditionalNote: exitAdditionalNote || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to record exit.');
      }
    }
  };

  const toggleCompanion = (v) => {
    setSelectedCompanions((prev) =>
      prev.find((p) => p.name === v.name)
        ? prev.filter((p) => p.name !== v.name)
        : [...prev, v]
    );
  };

  // Build matchData from a candidate
  const candidateToMatch = (c, fallbackName) => {
    const dateStr = c.expectedDate ? new Date(c.expectedDate).toLocaleDateString('en-US') : '';
    return {
      registrationId: c.registrationId,
      passId: 'VST ' + String(c.registrationId).padStart(6, '0'),
      category: (c.registrationType || 'Single').toUpperCase(),
      regType: c.registrationType || 'Single',
      resident: c.residentName || '',
      address: c.residentAddress || '',
      visitor: c.registeredName || fallbackName,
      purpose: c.purpose || 'N/A',
      expectedDate: dateStr,
      residentId: c.residentId,
    };
  };

  // Pick a candidate from the SELECT VISITOR list
  const pickCandidate = (c) => {
    setMatchData(candidateToMatch(c, scannedName));
    setScannedName(c.registeredName || scannedName);
    multiRef.current = false;
    setStep('matched');
  };

  // ── Resize image client-side (max 1000px) to speed up OCR and avoid timeouts ──
  const fileToResized = (file, maxDim = 1000, quality = 0.85) =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (b) => resolve(b ? new File([b], 'id.jpg', { type: 'image/jpeg' }) : file),
          'image/jpeg', quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });

  // ── Live camera (getUserMedia) — needs HTTPS (ngrok) or localhost ──
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setCameraError('Cannot access the camera. Make sure the URL is HTTPS (ngrok) and the camera is allowed. Use "TAKE PHOTO OF ID" as an alternative.');
    }
  };

  const stopCamera = () => {
    const s = streamRef.current;
    if (s) { s.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // Start/stop the camera based on the 'scan' step; also stop when leaving the page
  useEffect(() => {
    if (step === 'scan') startCamera();
    else stopCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Capture a frame from the live video → process it like a photo
  const captureFromCamera = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setCameraError('The camera is not ready yet, please wait.'); return; }
    const maxDim = 1000;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale), h = Math.round(video.videoHeight * scale);
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    canvas.toBlob(async (blob) => {
      if (!blob) { setCameraError('Capture failed, please try again.'); return; }
      stopCamera();
      await processImageFile(new File([blob], 'id-capture.jpg', { type: 'image/jpeg' }), true);
    }, 'image/jpeg', 0.85);
  };

  // ── Core: scan the image file (from file-input OR live camera) ──
  const processImageFile = async (rawFile, alreadyResized = false) => {
    const file = alreadyResized ? rawFile : await fileToResized(rawFile).catch(() => rawFile);
    multiRef.current = false;
    setPhotoFile(file);
    setPhoto(URL.createObjectURL(file));
    setOcrError('');
    setStep('reading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/ocr/scan`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      console.log('🟢 OCR response:', data);

      if (data.success && data.suggestedName) {
        const scanned = data.suggestedName;

        // ── EXIT: match against ACTIVE visitors (tolerant, same as entry) ──
        if (isExit) {
          setScannedName(scanned);
          const list = await loadActive();
          const matches = list.filter((t) => exitMatches(scanned, t.name));
          if (matches.length === 1) {
            setMatchData(fromActive(matches[0]));
            setScannedName(matches[0].name);
            exitMultiRef.current = false;
          } else {
            // 0 or 2+ matches → show the active visitors list to choose from
            exitMultiRef.current = true;
            setMatchData({});
            if (matches.length === 0) {
              setOcrError('No exact match from the scan. Select the visitor from the active visitors list.');
            } else {
              setOcrError('Multiple active matches. Select the correct visitor from the list.');
            }
          }
        }
        // ── ENTRY: driver flow ──
        else if (isDriverFlow) {
          setDriverName(scanned);
        }
        // ── ENTRY: visitor → match against EXPECTED registrations ──
        else {
          setScannedName(scanned);
          try {
            const matchRes = await fetch(
              `${API}/entry/match?name=${encodeURIComponent(scanned)}`,
              { headers: authHeaders() }
            );
            const matchJson = await matchRes.json();
            console.log('🟣 match result:', matchJson);
            if (matchJson.matched && matchJson.candidates.length === 1) {
              // Only one → auto-select
              const c = matchJson.candidates[0];
              setMatchData(candidateToMatch(c, scanned));
              setScannedName(c.registeredName || scanned);
              multiRef.current = false;
            } else if (matchJson.matched && matchJson.candidates.length > 1) {
              // Multiple → SELECT VISITOR (guard chooses)
              setCandidates(matchJson.candidates);
              multiRef.current = true;
            } else {
              setMatchData({});
              multiRef.current = false;
              setOcrError('No matching registration found. Please use manual search or contact the resident.');
            }
          } catch (mErr) {
            console.log('match error:', mErr);
          }
        }
      } else {
        setOcrError('Could not read the name clearly. Please verify or type it manually.');
      }
    } catch (err) {
      setOcrError('OCR service unavailable. Please type the name manually.');
    } finally {
      setStep(afterReading());
    }
  };

  // File-input fallback ("TAKE PHOTO OF ID" / native camera app)
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  const afterReading = () => {
    if (isPickup && pickupTarget === 'RESIDENT') return 'pickupResidents';
    if (isExit && exitMultiRef.current) return 'exitSelect';
    if (multiRef.current) return 'selectVisitor';
    return 'matched';
  };

  // Re-match using the edited scanned name (entry visitor only)
  const reRunMatch = async () => {
    const name = (scannedName || '').trim();
    if (!name) { setOcrError('Please type the name first.'); return; }
    setOcrError('');
    try {
      if (isExit) {
        const list = await loadActive();
        const matches = list.filter((t) => exitMatches(name, t.name));
        if (matches.length === 1) {
          setMatchData(fromActive(matches[0]));
          setScannedName(matches[0].name);
        } else {
          setMatchData({});
          setOcrError(matches.length === 0
            ? 'No match. Select from the active visitors list.'
            : 'Multiple matches. Select from the active visitors list.');
          setStep('exitSelect');
        }
      } else {
        const matchRes = await fetch(`${API}/entry/match?name=${encodeURIComponent(name)}`,
          { headers: authHeaders() });
        const matchJson = await matchRes.json();
        if (matchJson.matched && matchJson.candidates.length === 1) {
          const c = matchJson.candidates[0];
          setMatchData(candidateToMatch(c, name));
          setScannedName(c.registeredName || name);
        } else if (matchJson.matched && matchJson.candidates.length > 1) {
          setCandidates(matchJson.candidates);
          multiRef.current = true;
          setStep('selectVisitor');
        } else {
          setMatchData({});
          setOcrError('No matching registration. Check the name or use manual search.');
        }
      }
    } catch {
      setOcrError('Match failed. Please try again.');
    }
  };

  useEffect(() => {
    if (step === 'reading' && !photoFile) {
      const t = setTimeout(() => setStep(afterReading()), 1200);
      return () => clearTimeout(t);
    }
  }, [step, photoFile]);

  // ── On entering the PICKUP RESIDENT step → fetch waiting pickups from DB ──
  useEffect(() => {
    if (step !== 'pickupResidents') return;
    getGatePickups().then((res) => setGatePickups(res.data || [])).catch(() => setGatePickups([]));
  }, [step]);

  // ── On entering the DELIVERY RESIDENTS step → fetch this week's expected deliveries ──
  useEffect(() => {
    if (step !== 'deliveryResidents') return;
    getExpectedDeliveries().then((res) => setDeliveryRegs(res.data || [])).catch(() => setDeliveryRegs([]));
  }, [step]);

  // ── On entering MATCHED (entry visitor) → check if it matches the blocklist ──
  useEffect(() => {
    if (step !== 'matched' || isExit || isDriverFlow) { return; }
    const nm = (matchData.visitor || scannedName || '').trim();
    if (!nm) { setBlockInfo(null); return; }
    checkBlocklist(nm)
      .then((res) => setBlockInfo(res.data || { blocked: false, matches: [] }))
      .catch(() => setBlockInfo(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, matchData.visitor, scannedName]);

  // ── On entering the CONFIRM step (entry) → preview the real pass numbers ──
  // Uses the same payload and backend logic so it matches what will actually be stored.
  useEffect(() => {
    if (step !== 'confirmed' || isExit) return;
    const visitors = buildEntryVisitors();
    if (visitors.length === 0) { setPassMap({}); return; }
    fetch(`${API}/entry/preview-pass`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ visitors }),
    })
      .then((r) => r.json())
      .then((d) => {
        const m = {};
        (d.passes || []).forEach((p) => {
          if (p.visitorName != null) m[String(p.visitorName).toUpperCase()] = p.passNumber;
        });
        setPassMap(m);
      })
      .catch(() => setPassMap({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const close = () => navigate('/guard-home');

  const handleApprove = async () => {
    if (submitting) return;
    setSubmitting(true);
    const total = 1 + selectedCompanions.length;
    try {
      if (isExit) {
        await saveExit();
        alert(`Exit approved for ${total} visitor${total > 1 ? 's' : ''}! Time-out logged. ✅`);
      } else {
        const passes = await saveArrival();
        const passLines = (passes || []).map((p) => `• ${p.visitorName}: ${p.passNumber}`).join('\n');
        alert(
          `Entry approved for ${total} visitor${total > 1 ? 's' : ''}! Time-in logged. ✅` +
          (passLines ? `\n\nVisitor Pass:\n${passLines}` : '')
        );
      }
      navigate('/guard-home');
    } catch (err) {
      alert(err.message || 'Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirm-match handler (entry o exit) ──
  const onConfirmMatch = async () => {
    const info = { ...matchData, visitor: matchData.visitor || scannedName, transactionId: matchData.transactionId || null };
    setEntryInfo(info);
    setSelectedCompanions([]);
    // Both entry and exit ask about accompanying visitors
    setShowAccompany(true);
  };

  // Confirmed cards: main + companions (each has its own resident/address/purpose)
  const confirmedList = [
    { name: entryInfo.visitor, resident: entryInfo.resident, address: entryInfo.address, purpose: entryInfo.purpose, pass: entryInfo.passId },
    ...selectedCompanions.map((c) => ({
      name: c.name,
      resident: c.resident || entryInfo.resident,
      address: c.address || entryInfo.address,
      purpose: c.purpose || entryInfo.purpose,
      // each active companion has its own pass_number from the DB (for EXIT)
      pass: c.passNumber || c.passId || '',
    })),
  ].filter((x, i) => i === 0 || x.name);

  // ── Modal steps (choose / vehicle) ──
  if (step === 'choose' || step === 'vehicle') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={close}>
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => (step === 'vehicle' ? setStep('choose') : close())}
                  className="absolute top-4 left-4 w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-ink font-bold">‹</button>

          {step === 'choose' && (
            <>
              <h2 className="text-xl font-extrabold text-ink text-center mt-2 mb-5">Choose Entry Purpose</h2>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setEntryType('VISITOR')}
                        className={`rounded-2xl p-6 flex flex-col items-center gap-3 border-2 ${entryType === 'VISITOR' ? 'border-transparent' : 'border-gray-200'}`}
                        style={entryType === 'VISITOR' ? { backgroundColor: '#CDE7DE' } : {}}>
                  <User size={30} className="text-ink" />
                  <span className="text-xs font-bold text-ink">VISITOR</span>
                </button>
                <button onClick={() => setEntryType('DELIVERY')}
                        className={`rounded-2xl p-6 flex flex-col items-center gap-3 border-2 ${entryType === 'DELIVERY' ? 'border-transparent' : 'border-gray-200'}`}
                        style={entryType === 'DELIVERY' ? { backgroundColor: '#CDE7DE' } : {}}>
                  <Truck size={30} className="text-ink" />
                  <span className="text-xs font-bold text-ink">DELIVERY</span>
                </button>
              </div>

              {entryType && (
                <>
                  <p className="text-center italic text-ink/70 mt-5 mb-3 border-t border-gray-100 pt-4">
                    {entryType === 'VISITOR' ? 'visitor arrived with vehicle?' : 'driver arrived with vehicle?'}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setStep(entryType === 'DELIVERY' ? 'deliveryResidents' : 'scan')}
                            className="px-6 py-2 rounded-full border border-gray-300 text-sm font-bold text-ink">NO</button>
                    <button onClick={() => setStep('vehicle')}
                            className="px-6 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: teal }}>YES</button>
                  </div>
                </>
              )}
            </>
          )}

          {step === 'vehicle' && (
            <>
              {isDelivery ? (
                <>
                  <p className="text-center text-xs text-ink/70 mb-2 mt-2">Enter plate number of the vehicle</p>
                  <input value={plate} onChange={(e) => setPlate(e.target.value)}
                         placeholder="DTF 102938573"
                         className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm text-center mb-5 outline-none focus:border-teal-600" />
                  <div className="flex justify-center">
                    <button onClick={() => {
                              if (!plate.trim()) { alert('Please enter the plate number.'); return; }
                              setStep('deliveryResidents');
                            }}
                            className="px-8 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                      PROCEED
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-base font-bold text-ink text-center mt-2 mb-4">
                    What is the driver's purpose of visit?
                  </h2>
                  <div className="flex gap-2 justify-center flex-wrap mb-5">
                    {['PERSONAL VISIT', 'PICKUP', 'DROP-OFF'].map((p) => (
                      <button key={p} onClick={() => setDrivePurpose(p)}
                              className={`px-3 py-2 rounded-full text-[11px] font-bold border ${drivePurpose === p ? 'text-ink border-transparent' : 'text-ink border-gray-300'}`}
                              style={drivePurpose === p ? { backgroundColor: '#CDE7DE' } : {}}>
                        {p}
                      </button>
                    ))}
                  </div>

                  {drivePurpose === 'PICKUP' && (
                    <>
                      <p className="text-center text-xs text-ink/70 mb-2 border-t border-gray-100 pt-4">Who is being picked up?</p>
                      <div className="flex gap-2 justify-center mb-5">
                        {['RESIDENT', 'VISITOR'].map((t) => (
                          <button key={t} onClick={() => setPickupTarget(t)}
                                  className={`px-5 py-2 rounded-full text-[11px] font-bold border ${pickupTarget === t ? 'text-ink border-transparent' : 'text-ink border-gray-300'}`}
                                  style={pickupTarget === t ? { backgroundColor: '#CDE7DE' } : {}}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <p className="text-center text-xs text-ink/70 mb-2">Enter plate number of the vehicle</p>
                  <input value={plate} onChange={(e) => setPlate(e.target.value)}
                         placeholder="DTF 102938573"
                         className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm text-center mb-5 outline-none focus:border-teal-600" />
                  <div className="flex justify-center">
                    <button onClick={() => {
                              if (!drivePurpose) { alert("Please select the driver's purpose."); return; }
                              if (drivePurpose === 'PICKUP' && !pickupTarget) { alert('Please select who is being picked up.'); return; }
                              if (!plate.trim()) { alert('Please enter the plate number.'); return; }
                              if (drivePurpose === 'PICKUP' && pickupTarget === 'VISITOR') { setStep('activeVisitors'); return; }
                              setStep('scan');
                            }}
                            className="px-8 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                      PROCEED
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Full-screen steps ──
  return (
    <div className="min-h-screen bg-cream max-w-md mx-auto">
      <header className="bg-ink px-5 py-5 flex items-center gap-3">
        <button onClick={close} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-ink font-bold">‹</button>
        <span className="text-white font-bold text-lg">Back to Home</span>
      </header>

      <div className="px-6 py-8">
        {/* SCAN ID */}
        {step === 'scan' && (
          <div className="bg-white rounded-3xl p-6 shadow">
            <h2 className="text-xl font-extrabold text-ink text-center mb-4">SCAN ID</h2>

            {/* LIVE CAMERA preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black mb-4" style={{ aspectRatio: '4 / 3' }}>
              <video ref={videoRef} playsInline muted autoPlay
                     className="w-full h-full object-cover" />
              {/* guide box overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white/80 rounded-xl" style={{ width: '82%', height: '62%' }} />
              </div>
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-4">
                  <p className="text-[11px] text-center text-white">{cameraError}</p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <p className="text-center text-xs text-ink mb-1">
              ALIGN THE <span className="font-bold">{isDriverFlow ? "DRIVER'S" : "VISITOR'S"} ID</span> INSIDE THE BOX
            </p>
            <p className="text-center text-xs text-ink/50 mb-5">Ensure the ID is clear and readable</p>

            <div className="flex flex-col items-center gap-2">
              <button onClick={captureFromCamera}
                      className="px-6 py-3 rounded-full text-sm font-bold text-white w-52 inline-flex items-center justify-center gap-2" style={{ backgroundColor: '#0F6E6E' }}>
                <Camera size={16} /> CAPTURE ID
              </button>

              {/* Fallback: native camera app / file (works even without camera permission) */}
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                     onChange={handlePhoto} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()}
                      className="px-6 py-2 rounded-full text-sm font-bold text-white w-52" style={{ backgroundColor: '#112D31' }}>
                TAKE PHOTO OF ID
              </button>
              {isExit ? (
                // EXIT manual fallback (kapag down ang OCR): piliin mula sa listahan ng
                // active visitors at deliveries na nasa loob pa ng subdivision.
                <button onClick={() => { stopCamera(); loadActive(); setActiveSearch(''); setStep('exitSelect'); }}
                        className="px-6 py-2 rounded-full text-sm font-bold text-white w-52" style={{ backgroundColor: '#112D31' }}>
                  SELECT FROM INSIDE LIST
                </button>
              ) : (!isDriverFlow) ? (
                <button onClick={() => { stopCamera(); loadRegistered(); setRegSearch(''); setStep('visitorSearch'); }}
                        className="px-6 py-2 rounded-full text-sm font-bold text-white w-52" style={{ backgroundColor: '#112D31' }}>
                  SEARCH REGISTERED VISITOR
                </button>
              ) : (
                <button onClick={() => { stopCamera(); setStep('reading'); }}
                        className="px-6 py-2 rounded-full text-sm font-bold text-white w-52" style={{ backgroundColor: '#112D31' }}>
                  TYPE INFO MANUALLY
                </button>
              )}
              <button onClick={() => { stopCamera(); setStep(isExit ? 'exitSelect' : 'choose'); }}
                      className="px-6 py-2 rounded-full text-sm font-bold text-ink border border-gray-300 w-40">
                {isExit ? 'MANUAL SEARCH' : 'BACK'}
              </button>
            </div>
          </div>
        )}

        {/* READING ID */}
        {step === 'reading' && (
          <div className="flex flex-col items-center justify-center py-16">
            {photo && (
              <img src={photo} alt="ID capture" className="w-48 rounded-xl shadow mb-6 border border-gray-200" />
            )}
            <div className="w-16 h-16 rounded-full border-4 border-ink border-t-transparent animate-spin mb-6" />
            <p className="text-lg font-bold text-ink">Reading ID...</p>
            <p className="text-sm text-ink/60 mb-6">Please wait a moment</p>
            {ocrError && (
              <p className="text-xs text-center text-red-700 bg-red-100 rounded-xl px-4 py-2 mb-4 max-w-xs">{ocrError}</p>
            )}
            <button onClick={() => setStep(afterReading())}
                    className="px-8 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
              CONTINUE
            </button>
          </div>
        )}

        {/* SELECT VISITOR — when multiple names match (different residents) */}
        {step === 'selectVisitor' && (
          <div>
            <h2 className="text-xl font-extrabold text-ink text-center mb-1">SELECT VISITOR</h2>
            <p className="text-center text-xs text-ink/60 mb-4">
              Multiple visitors match this name. Ask which resident they're visiting, then select.
            </p>

            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <div className="max-h-[50vh] overflow-y-auto space-y-2">
                {candidates.map((c, i) => (
                  <button key={i} onClick={() => pickCandidate(c)}
                          className="w-full text-left rounded-2xl p-3 border border-gray-200 shadow-sm active:scale-[0.99] transition hover:border-teal-500">
                    <p className="font-bold text-ink text-sm">{c.registeredName}</p>
                    <p className="text-xs text-ink/70 mt-1"><span className="font-bold">Resident:</span> {c.residentName}</p>
                    <p className="text-xs text-ink/60"><span className="font-bold">Address:</span> {c.residentAddress}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-800">{c.registrationType || 'Single'}</span>
                      {c.purpose && <span className="text-[9px] text-ink/50 py-1">Purpose: {c.purpose}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button onClick={() => setStep('residentList')}
                      className="w-60 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">
                NONE OF THESE — CONTACT RESIDENT
              </button>
              <button onClick={() => setStep('scan')}
                      className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300 w-40">
                RETRY SCAN
              </button>
            </div>
          </div>
        )}

        {/* SEARCH REGISTERED VISITOR — manual (type-to-search) instead of scan */}
        {step === 'visitorSearch' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-1">SEARCH REGISTERED VISITOR</h2>
            <p className="text-center text-xs text-ink/60 mb-4">
              Type the name to search the list of registered visitors. Tap the correct one to continue.
            </p>

            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
              <Search size={18} className="text-ink/40" />
              <input value={regSearch} onChange={(e) => setRegSearch(e.target.value)} autoFocus
                     placeholder="Search visitor name"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>

            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <div className="max-h-[52vh] overflow-y-auto space-y-2">
                {registeredDB.length === 0 ? (
                  <p className="text-center text-ink/50 py-8 text-sm">No registered visitors listed.</p>
                ) : (() => {
                  const q = regSearch.toLowerCase();
                  const results = registeredDB.filter((c) =>
                    (c.registeredName || '').toLowerCase().includes(q) ||
                    (c.residentName || '').toLowerCase().includes(q) ||
                    (c.residentAddress || '').toLowerCase().includes(q)
                  );
                  if (results.length === 0) {
                    return <p className="text-center text-ink/50 py-8 text-sm">No matching visitor.</p>;
                  }
                  return results.map((c, i) => (
                    <button key={(c.registrationId || i) + '-' + c.registeredName} onClick={() => pickCandidate(c)}
                            className="w-full text-left rounded-2xl p-3 border border-gray-200 shadow-sm active:scale-[0.99] transition hover:border-teal-500">
                      <p className="font-bold text-ink text-sm">{c.registeredName}</p>
                      <p className="text-xs text-ink/70 mt-1"><span className="font-bold">Resident:</span> {c.residentName || '—'}</p>
                      <p className="text-xs text-ink/60"><span className="font-bold">Address:</span> {c.residentAddress || '—'}</p>
                      <div className="flex gap-2 mt-1 items-center">
                        <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-800">{c.registrationType || 'Single'}</span>
                        {c.purpose && <span className="text-[9px] text-ink/50 py-1">Purpose: {c.purpose}</span>}
                      </div>
                    </button>
                  ));
                })()}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button onClick={() => loadRegistered()}
                      className="w-60 py-2 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm inline-flex items-center justify-center gap-2">
                <RefreshCw size={16} /> REFRESH LIST
              </button>
              <button onClick={() => setStep('residentList')}
                      className="w-60 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">
                NOT LISTED — CONTACT RESIDENT
              </button>
              <button onClick={() => setStep('scan')}
                      className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300 w-40">
                BACK TO SCAN
              </button>
            </div>
          </div>
        )}

        {/* EXIT — SELECT ACTIVE VISITOR (fallback / disambiguation) */}
        {step === 'exitSelect' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-1">SELECT WHO IS EXITING</h2>
            <p className="text-center text-xs text-ink/60 mb-4">
              All visitors and deliveries currently ACTIVE inside the subdivision.
              Tap the one who is exiting (fallback kapag hindi mabasa ng OCR).
            </p>

            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
              <Search size={18} className="text-ink/40" />
              <input value={activeSearch} onChange={(e) => setActiveSearch(e.target.value)}
                     placeholder="Search visitor name"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>

            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <div className="max-h-[52vh] overflow-y-auto space-y-2">
                {activeDB.length === 0 ? (
                  <p className="text-center text-ink/50 py-8 text-sm">No active visitors right now.</p>
                ) : activeDB
                    .filter((v) => v.name.toLowerCase().includes(activeSearch.toLowerCase()))
                    .map((v) => (
                      <button key={v.transactionId} onClick={() => {
                                setMatchData(fromActive(v));
                                setScannedName(v.name);
                                setOcrError('');
                                exitMultiRef.current = false;
                                setStep('matched');
                              }}
                              className="w-full text-left rounded-2xl p-3 border border-gray-200 shadow-sm active:scale-[0.99] transition hover:border-teal-500">
                        <p className="font-bold text-ink text-sm">{v.name}</p>
                        <p className="text-xs text-ink/70 mt-1"><span className="font-bold">Resident:</span> {v.resident} | {v.address}</p>
                        <div className="flex gap-2 mt-1 items-center">
                          <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-800">{v.regType || 'Single'}</span>
                          {v.passNumber && <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-gray-100 text-ink">Pass: {v.passNumber}</span>}
                          <span className="text-[9px] text-ink/50">Purpose: {v.purpose}</span>
                        </div>
                      </button>
                    ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button onClick={() => { loadActive(); }}
                      className="w-60 py-2 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm inline-flex items-center justify-center gap-2">
                <RefreshCw size={16} /> REFRESH LIST
              </button>
              <button onClick={() => setStep('scan')}
                      className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300 w-40">
                RETRY SCAN
              </button>
            </div>
          </div>
        )}

        {/* VISITOR MATCHED / DRIVER INFORMATION */}
        {step === 'matched' && (
          isDriverFlow ? (
            <div>
              <h2 className="text-xl font-extrabold text-ink text-center mb-4">DRIVER INFORMATION</h2>

              {/* Editable driver/rider name — para sa manual entry o pag-ayos ng OCR */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 mb-3">
                <label className="block text-[10px] font-bold text-ink/60 mb-1">
                  {isDelivery ? 'DELIVERY RIDER NAME (editable)' : "DRIVER NAME (editable)"}
                </label>
                <input value={driverName} onChange={(e) => setDriverName(e.target.value)}
                       placeholder="Type the name"
                       className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-600" />
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-5">
                {(isDelivery
                  ? [
                      ['Registration Type', 'Delivery'],
                      ['Resident Name', deliveryResident?.name || ''],
                      ['Address', deliveryResident?.address || ''],
                      ['Rider Name', driverName || '—'],
                      ['Purpose', deliveryResident?.purpose || 'Delivery'],
                      ['Expected Date', deliveryResident?.expectedDate || '—'],
                    ]
                  : [
                      ['Registration Type', 'Single'],
                      ...(pickupTarget === 'VISITOR'
                        ? [['Resident Name', pickedUpVisitor?.resident || '']]
                        : [['Resident Name', pickupResident?.name || '']]),
                      ['Address', pickupTarget === 'VISITOR' ? (pickedUpVisitor?.address || '') : (pickupResident?.address || '')],
                      ['Driver Name', driverName],
                      ...(pickupTarget === 'VISITOR' ? [['Visitor Name', pickedUpVisitor?.name || scannedName]] : []),
                      ['Purpose', pickupTarget === 'RESIDENT' ? 'Pickup resident' : 'Pickup visitor'],
                    ]
                ).map(([label, val]) => (
                  <div key={label} className="px-4 py-3">
                    <span className="text-xs text-ink"><span className="font-bold">{label}:</span> {val}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2 w-full">
                  <button onClick={() => setStep('residentList')}
                          className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                    MANUAL SEARCH
                  </button>
                  <button onClick={() => {
                            setEntryInfo(isDelivery
                              ? {
                                  passId: 'DRV-1001', category: 'DELIVERY', regType: 'Delivery',
                                  resident: deliveryResident?.name || '', address: deliveryResident?.address || '',
                                  residentId: deliveryResident?.residentId || null,
                                  registrationId: deliveryResident?.registrationId || null,
                                  driver: driverName,
                                  visitor: '', purpose: deliveryResident?.purpose || 'Delivery', visitorType: 'Delivery',
                                  expectedDate: deliveryResident?.expectedDate || '', title: 'DELIVERY ENTRY CONFIRMED',
                                }
                              : {
                                  passId: 'DRV-1001', category: 'VISITOR', regType: 'Single',
                                  resident: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.resident || '') : (pickupResident?.name || ''),
                                  address: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.address || '') : (pickupResident?.address || ''),
                                  residentId: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.residentId || null) : (pickupResident?.residentId || null),
                                  driver: driverName,
                                  visitor: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.name || scannedName) : '',
                                  purpose: drivePurpose === 'PICKUP'
                                    ? (pickupTarget === 'RESIDENT' ? 'Pickup resident' : 'Pickup visitor')
                                    : (drivePurpose === 'DROP-OFF' ? 'Drop-off' : 'Personal visit'),
                                  // Personal visit = the visitor themselves (Visitor); pickup/drop-off = Driver
                                  visitorType: drivePurpose === 'PERSONAL VISIT' ? 'Visitor' : 'Driver',
                                  expectedDate: '', title: 'DRIVER ENTRY CONFIRMED',
                                });
                            setSelectedCompanions([]);
                            setStep('confirmed');
                          }}
                          className="flex-1 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                    CONFIRM MATCH
                  </button>
                </div>
                <button onClick={() => setStep('scan')}
                        className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300 w-40">
                  RETRY
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-extrabold text-ink text-center mb-4">
                {isExit ? 'ACTIVE VISITOR' : 'VISITOR MATCHED'}
              </h2>

              {/* Editable scanned name — if the OCR is wrong/incomplete */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 mb-3">
                <label className="block text-[10px] font-bold text-ink/60 mb-1">SCANNED NAME (editable)</label>
                <div className="flex gap-2">
                  <input value={scannedName} onChange={(e) => setScannedName(e.target.value)}
                         placeholder="Type the full name"
                         className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-600" />
                  {!isExit && (
                    <button onClick={reRunMatch}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-white shrink-0" style={{ backgroundColor: '#0F6E6E' }}>
                      RE-MATCH
                    </button>
                  )}
                </div>
                {ocrError && <p className="text-[11px] text-red-600 mt-1">{ocrError}</p>}
              </div>

              {matchData.visitor ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-5">
                  {[
                    ['Registration Type', matchData.regType],
                    ['Resident Name', matchData.resident],
                    ['Address', matchData.address],
                    ['Visitor Name', matchData.visitor || scannedName],
                    ['Purpose', matchData.purpose],
                    ...(isExit ? [] : [['Expected Date', matchData.expectedDate]]),
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} className="px-4 py-3">
                      <span className="text-xs text-ink"><span className="font-bold">{label}:</span> {val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-center">
                  <p className="text-sm font-bold text-red-700">No match found</p>
                  <p className="text-xs text-red-600 mt-1">
                    {isExit ? 'This visitor is not active inside.' : 'No matching registration.'} Use manual search or contact the resident.
                  </p>
                </div>
              )}

              {/* BLOCKLIST FLAG — when the name matches a blocked person */}
              {!isExit && blockInfo?.blocked && (
                <div className="rounded-2xl p-4 mb-4 border-2" style={{ backgroundColor: '#FDECEC', borderColor: '#9b2c2c' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert size={20} style={{ color: '#9b2c2c' }} />
                    <p className="text-sm font-extrabold" style={{ color: '#9b2c2c' }}>BLOCKLIST MATCH</p>
                  </div>
                  <p className="text-xs text-ink/70">
                    This name matches {blockInfo.matches.length} blocklisted {blockInfo.matches.length > 1 ? 'entries' : 'entry'}.
                    Verify identity before allowing entry — it could be a different person with the same name.
                  </p>
                </div>
              )}

              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2 w-full">
                  <button onClick={() => setStep(isExit ? 'exitSelect' : 'residentList')}
                          className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                    MANUAL SEARCH
                  </button>
                  {!isExit && blockInfo?.blocked ? (
                    <button disabled={!matchData.visitor} onClick={() => { setBlockNote(''); setStep('blocklistAlert'); }}
                            className="flex-1 py-3 rounded-full text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: '#9b2c2c' }}>
                      REVIEW BLOCKLIST
                    </button>
                  ) : (
                    <button disabled={!matchData.visitor} onClick={onConfirmMatch}
                            className="flex-1 py-3 rounded-full text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: '#112D31' }}>
                      CONFIRM MATCH
                    </button>
                  )}
                </div>
                <button onClick={() => setStep('scan')}
                        className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300 w-40">
                  RETRY
                </button>
              </div>
            </div>
          )
        )}

        {/* ACCOMPANYING VISITORS (entry=companions, exit=active prioritized) + search bar */}
        {step === 'additional' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-1">
              {isExit ? 'VISITORS EXITING TOGETHER'
                : (entryInfo.regType || '').toLowerCase() === 'batch' ? 'SAME-BATCH VISITORS'
                : 'EXPECTED VISITORS'}
            </h2>
            <p className="text-center text-xs text-ink/60 mb-4">
              {isExit ? 'Select who is exiting with this visitor' : 'Select who is entering with this visitor'}
            </p>

            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
              <Search size={18} className="text-ink/40" />
              <input value={addSearch} onChange={(e) => setAddSearch(e.target.value)}
                     placeholder="Search visitor name"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>

            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <div className="max-h-[45vh] overflow-y-auto space-y-2">
                {additionalPool.length === 0 ? (
                  <p className="text-center text-ink/50 py-6 text-sm">
                    {isExit ? 'No other active visitors.' : 'No other visitors to add.'}
                  </p>
                ) : additionalPool
                  .filter((v) => v.name.toLowerCase().includes(addSearch.toLowerCase()))
                  .map((v) => {
                    const selected = !!selectedCompanions.find((p) => p.name === v.name);
                    return (
                      <button key={v.transactionId || v.registrationId + v.name} onClick={() => toggleCompanion(v)}
                              className="w-full text-left rounded-2xl p-3 border-2 flex items-center justify-between gap-2 shadow-sm"
                              style={{ borderColor: selected ? '#2f6b34' : '#eee' }}>
                        <div>
                          <p className="font-bold text-ink text-sm">{v.name}</p>
                          <p className="text-xs text-ink/60">{v.resident} | {v.address}</p>
                          <p className="text-xs text-ink/60">Purpose: {v.purpose}</p>
                        </div>
                        <span className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: selected ? '#2f6b34' : '#d1d5db' }} />
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex gap-3 justify-center mb-8">
              <button onClick={() => { setSelectedCompanions([]); setStep('confirmed'); }}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">
                SKIP
              </button>
              <button onClick={() => setStep('confirmed')}
                      className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                PROCEED
              </button>
            </div>

            <p className="text-center text-xs font-semibold text-ink/60 mb-3">CAN'T FIND VISITOR ON THE LIST?</p>
            <div className="flex justify-center">
              <button onClick={() => setStep('residentList')}
                      className="w-60 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">
                CONTACT RESIDENT
              </button>
            </div>
          </div>
        )}

        {/* PICKUP RESIDENT — Notify Gate residents on top */}
        {step === 'pickupResidents' && (() => {
          // Waiting pickups from DB (cross-device) — pinned on top
          const fmtWhen = (ts) => ts
            ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : '';
          const waitingResidents = gatePickups.map((n) => {
            const db = residentsDB.find((r) => r.residentId === n.resident_id) || {};
            return {
              residentId: n.resident_id, name: n.full_name || db.name,
              address: n.unit_address || db.address || '',
              contact: n.contact_number || db.contact || '',
              waiting: true, rideHailing: !!n.ride_hailing, time: fmtWhen(n.created_at),
              pickupId: n.pickup_id,
            };
          });
          const waitingIds = new Set(waitingResidents.map((w) => w.residentId));
          const others = residentsDB.filter((r) => !waitingIds.has(r.residentId)).map((r) => ({ ...r, waiting: false }));
          const list = [...waitingResidents, ...others].filter((r) => (r.name || '').toLowerCase().includes(residentSearch.toLowerCase()));
          return (
            <div>
              <h2 className="text-2xl font-extrabold text-ink text-center mb-1">RESIDENT LIST</h2>
              <p className="text-center text-xs text-ink/60 mb-4">Who is being picked up?</p>
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
                <Search size={18} className="text-ink/40" />
                <input value={residentSearch} onChange={(e) => setResidentSearch(e.target.value)}
                       placeholder="Search resident name"
                       className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
              </div>
              <div className="bg-white rounded-3xl p-4 shadow mb-4">
                <div className="max-h-[45vh] overflow-y-auto space-y-2">
                  {list.map((r) => {
                    const selected = pickupResident?.name === r.name;
                    return (
                      <button key={r.name} onClick={() => setPickupResident(r)}
                              className="w-full text-left rounded-2xl p-3 border-2 flex items-center justify-between gap-2 shadow-sm"
                              style={{ borderColor: selected ? '#2f6b34' : (r.waiting ? '#F1D88A' : '#eee') }}>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-ink text-sm">{r.name}</p>
                            {r.waiting && (
                              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1D88A', color: '#8a6d12' }}>
                                WAITING FOR PICK-UP
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink/60">Address: {r.address}</p>
                          {r.waiting && (
                            <p className="text-[10px] text-ink/50">
                              {r.rideHailing ? 'Ride-hailing' : 'Personal pickup'} · notified {r.time}
                            </p>
                          )}
                        </div>
                        <span className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: selected ? '#2f6b34' : '#d1d5db' }} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 justify-center mb-6">
                <button onClick={() => setStep('scan')}
                        className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">BACK</button>
                <button onClick={() => {
                          if (!pickupResident) { alert('Please select the resident being picked up.'); return; }
                          setStep('matched');
                        }}
                        className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>PROCEED</button>
              </div>
              <p className="text-center text-xs font-semibold text-ink/60 mb-3">CAN'T FIND RESIDENT ON THE LIST?</p>
              <div className="flex justify-center">
                <button onClick={() => setStep('residentList')}
                        className="w-60 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">CONTACT RESIDENT</button>
              </div>
            </div>
          );
        })()}

        {/* DELIVERY residents */}
        {step === 'deliveryResidents' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-4">RESIDENT LIST</h2>
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
              <Search size={18} className="text-ink/40" />
              <input value={residentSearch} onChange={(e) => setResidentSearch(e.target.value)}
                     placeholder="Search resident name"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>
            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <p className="text-sm font-semibold text-ink/70 mb-3">Residents expecting a delivery this week</p>
              <div className="max-h-[45vh] overflow-y-auto space-y-2">
                {(() => {
                  const list = deliveryRegs.filter((r) => (r.name || '').toLowerCase().includes(residentSearch.toLowerCase()));
                  if (deliveryRegs.length === 0) {
                    return <p className="text-center text-ink/50 py-8 text-sm">No expected deliveries registered this week.</p>;
                  }
                  if (list.length === 0) {
                    return <p className="text-center text-ink/50 py-8 text-sm">No matching resident.</p>;
                  }
                  return list.map((r) => {
                    const selected = deliveryResident?.registrationId === r.registrationId;
                    return (
                      <button key={r.registrationId} onClick={() => setDeliveryResident(r)}
                              className="w-full text-left rounded-2xl p-3 border-2 flex items-center justify-between gap-2 shadow-sm"
                              style={{ borderColor: selected ? '#2f6b34' : '#eee' }}>
                        <div className="min-w-0">
                          <p className="font-bold text-ink text-sm truncate">{r.name}</p>
                          <p className="text-xs text-ink/60 truncate">Address: {r.address}</p>
                          <p className="text-xs text-ink/60">Expected: {r.expectedDate || '—'}{r.purpose ? ` · ${r.purpose}` : ''}</p>
                        </div>
                        <span className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: selected ? '#2f6b34' : '#d1d5db' }} />
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
            <div className="flex gap-3 justify-center mb-6">
              <button onClick={() => setStep('choose')}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">BACK</button>
              <button onClick={() => {
                        if (!deliveryResident) { alert('Please select the resident expecting the delivery.'); return; }
                        setStep('scan');
                      }}
                      className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>PROCEED</button>
            </div>
            <p className="text-center text-xs font-semibold text-ink/60 mb-3">CAN'T FIND RESIDENT ON THE LIST?</p>
            <div className="flex justify-center">
              <button onClick={() => setStep('residentList')}
                      className="w-60 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">CONTACT RESIDENT</button>
            </div>
          </div>
        )}

        {/* ACTIVE VISITORS — pickup */}
        {step === 'activeVisitors' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-4">ACTIVE VISITORS</h2>
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
              <Search size={18} className="text-ink/40" />
              <input value={activeSearch} onChange={(e) => setActiveSearch(e.target.value)}
                     placeholder="Search visitor name"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>
            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <p className="text-center text-sm font-semibold text-ink/70 mb-3">ACTIVE VISITORS AS OF TODAY</p>
              <div className="max-h-[42vh] overflow-y-auto space-y-2">
                {activeDB.length === 0 ? (
                  <p className="text-center text-ink/50 py-6 text-sm">No active visitors right now.</p>
                ) : activeDB.filter((v) => v.name.toLowerCase().includes(activeSearch.toLowerCase())).map((v) => {
                  const selected = pickedUpVisitor?.name === v.name;
                  return (
                    <button key={v.transactionId} onClick={() => setPickedUpVisitor(v)}
                            className="w-full text-left rounded-2xl p-3 border-2 flex items-center justify-between gap-2 shadow-sm"
                            style={{ borderColor: selected ? '#2f6b34' : '#eee' }}>
                      <div>
                        <p className="font-bold text-ink text-sm">{v.name}</p>
                        <p className="text-xs text-ink/60">{v.resident} | {v.address}</p>
                        <p className="text-xs text-ink/60">Purpose: {v.purpose}</p>
                      </div>
                      <span className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: selected ? '#2f6b34' : '#d1d5db' }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 justify-center mb-6">
              <button onClick={() => { setPickedUpVisitor(null); setStep('scan'); }}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">SKIP</button>
              <button onClick={() => {
                        if (!pickedUpVisitor) { alert('Please select the visitor being picked up.'); return; }
                        setStep('scan');
                      }}
                      className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>PROCEED</button>
            </div>
          </div>
        )}

        {/* BLOCKLIST ALERT — verify identity (call reporting resident + exact name check) */}
        {step === 'blocklistAlert' && (
          <div>
            <div className="rounded-2xl p-4 mb-4 border-2 text-center" style={{ backgroundColor: '#FDECEC', borderColor: '#9b2c2c' }}>
              <div className="flex justify-center mb-2"><ShieldAlert size={34} style={{ color: '#9b2c2c' }} /></div>
              <h2 className="text-xl font-extrabold" style={{ color: '#9b2c2c' }}>BLOCKLIST MATCH</h2>
              <p className="text-xs text-ink/70 mt-1">
                "{matchData.visitor || scannedName}" matches a blocklisted person. This may be a different person with
                the same name — verify before deciding.
              </p>
            </div>

            {/* Matching blocklist entries + call the reporter */}
            <div className="space-y-3 mb-4">
              {(blockInfo?.matches || []).map((m, i) => {
                const num = String(m.reported_by_contact || '').replace(/[^\d+]/g, '');
                return (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <p className="font-bold text-ink text-sm">{m.person_name}</p>
                    {m.reason && <p className="text-xs text-ink/70 mt-1"><span className="font-bold">Reason:</span> {m.reason}</p>}
                    <p className="text-xs text-ink/60 mt-1"><span className="font-bold">Reported by:</span> {m.reported_by || '—'}{m.unit_address ? ` · ${m.unit_address}` : ''}</p>
                    <button onClick={() => {
                              if (!num) { alert('The reporting resident has no contact number.'); return; }
                              window.location.href = `tel:${num}`;
                            }}
                            className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold text-white"
                            style={{ backgroundColor: '#1a5fa8' }}>
                      <Phone size={16} /> Call {m.reported_by || 'reporting resident'} to verify
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Verification note (required when admitting as a different person) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
              <label className="block text-[11px] font-bold text-ink/60 mb-1">VERIFICATION NOTE</label>
              <p className="text-[11px] text-ink/50 mb-2">
                Confirm the full name on the physical ID and, if possible, by calling the reporter.
                Enter the verification result before continuing.
              </p>
              <textarea value={blockNote} onChange={(e) => setBlockNote(e.target.value)} rows={2}
                        placeholder="e.g. Talked to the resident — different person, just a namesake. ID name exact match."
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-600 resize-none" />
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={() => {
                        console.log('[BLOCKLIST] DENY', { name: matchData.visitor || scannedName, matches: blockInfo?.matches });
                        alert(`Entry DENIED — "${matchData.visitor || scannedName}" is on the blocklist.`);
                        navigate('/guard-home');
                      }}
                      className="w-full py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#9b2c2c' }}>
                DENY ENTRY (blocklisted)
              </button>
              <button onClick={() => {
                        if (!blockNote.trim()) { alert('Please add a short verification note first.'); return; }
                        console.log('[BLOCKLIST] VERIFIED DIFFERENT PERSON', { name: matchData.visitor || scannedName, note: blockNote });
                        onConfirmMatch();
                      }}
                      className="w-full py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#0F6E6E' }}>
                VERIFIED — DIFFERENT PERSON, PROCEED
              </button>
              <button onClick={() => setStep('matched')}
                      className="w-full py-2 rounded-full text-sm font-bold text-ink border border-gray-300">
                BACK
              </button>
            </div>
          </div>
        )}

        {/* RESIDENT LIST — Contact Resident / Manual search */}
        {step === 'residentList' && (
          <div>
            <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between" style={{ backgroundColor: '#FBE0E0' }}>
              <div>
                <p className="font-bold text-ink text-xs">Need assistance or have concerns?</p>
                <p className="text-[11px] text-ink/60">Contact the HOA administrator</p>
              </div>
              <button onClick={() => { window.location.href = 'tel:0000'; }}
                      className="text-white font-bold text-[11px] px-4 py-2 rounded-full" style={{ backgroundColor: '#C0392B' }}>CALL</button>
            </div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-4">RESIDENT LIST</h2>
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-3">
              <Search size={18} className="text-ink/40" />
              <input value={residentSearch} onChange={(e) => setResidentSearch(e.target.value)}
                     placeholder="Search resident name or street"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
              {blocks.map((b) => (
                <button key={b} onClick={() => setBlockFilter(b)}
                        className={`px-4 py-2 rounded-full text-xs font-bold shadow shrink-0 ${blockFilter === b ? 'text-white' : 'bg-white text-ink'}`}
                        style={blockFilter === b ? { backgroundColor: '#0F6E6E' } : {}}>
                  {b === 'All' ? 'All Areas' : b}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <p className="text-sm font-semibold text-ink/70 mb-3">Select resident to contact</p>
              <div className="max-h-[45vh] overflow-y-auto space-y-2">
                {filteredResidents.length === 0 ? (
                  <p className="text-center text-ink/50 py-6 text-sm">No resident found.</p>
                ) : filteredResidents.map((r) => (
                  <div key={r.residentId} className="rounded-2xl p-3 border border-gray-200 shadow-sm flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink text-sm">{r.name}</p>
                      <p className="text-xs text-ink/60">Address: {r.address}</p>
                      <p className="text-xs text-ink/60">Contact Number: {r.contact}</p>
                    </div>
                    <button onClick={() => callResident(r)}
                            className="text-white text-[11px] font-bold px-4 py-2 rounded-full shrink-0" style={{ backgroundColor: '#1a5fa8' }}>CALL</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center mb-4">
              <button onClick={() => setStep(isExit ? 'scan' : 'matched')}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">BACK</button>
            </div>
          </div>
        )}

        {/* UNLISTED VISITOR INFORMATION */}
        {step === 'unlisted' && (
          <div>
            <h2 className="text-xl font-extrabold text-ink text-center mb-4">UNLISTED VISITOR INFORMATION</h2>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-5">
              {[
                ['Registration Type', 'Single'],
                ['Resident Name', contactedResident?.name || ''],
                ['Address', contactedResident?.address || ''],
                ['Visitor Name', scannedName],
              ].map(([label, val]) => (
                <div key={label} className="px-4 py-3">
                  <span className="text-xs text-ink"><span className="font-bold">{label}:</span> {val}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setStep('residentList')}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">BACK</button>
              <button onClick={() => {
                        setEntryInfo({
                          passId: '', category: 'SINGLE', regType: 'Single',
                          resident: contactedResident?.name || '', address: contactedResident?.address || '',
                          residentId: contactedResident?.residentId || null, visitor: scannedName,
                          purpose: 'Unlisted visit', expectedDate: '',
                        });
                        setSelectedCompanions([]);
                        setStep('confirmed');
                      }}
                      className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>CONFIRM DETAILS</button>
            </div>
          </div>
        )}

        {/* CONFIRMED (entry/exit) — per-visitor cards */}
        {step === 'confirmed' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-1">
              {isExit ? 'VISITOR EXIT CONFIRMED' : (entryInfo.title || 'VISITOR ENTRY CONFIRMED')}
            </h2>
            {entryInfo.subtitle && <p className="text-center text-xs text-ink/60 mb-4">{entryInfo.subtitle}</p>}
            {!entryInfo.subtitle && <div className="mb-4" />}

            <div className="space-y-4 max-h-[55vh] overflow-y-auto mb-4">
              {confirmedList.map((c, i) => {
                const cPass = isExit
                  ? (c.pass || '')  // per-visitor pass from DB (no longer a single pass for all)
                  : (passMap[(c.name || '').toUpperCase()] || '');
                const driverPass = passMap[(entryInfo.driver || '').toUpperCase()] || '';
                return (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                  {[
                    ...(entryInfo.driver ? [['Driver Name', entryInfo.driver]] : []),
                    ...(!isExit && entryInfo.driver && i === 0 ? [['Driver Pass', driverPass]] : []),
                    ['Visitor Name', c.name],
                    ['Visitor Pass', cPass],
                    ['Resident Name', c.resident],
                    ['Address', c.address],
                    ['Purpose', c.purpose],
                  ].filter(([, val]) => val && val !== '—').map(([label, val]) => (
                    <div key={label} className="px-4 py-3">
                      <span className="text-xs text-ink"><span className="font-bold">{label}:</span> {val}</span>
                    </div>
                  ))}
                </div>
                );
              })}
            </div>

            {/* OPTIONAL EXIT NOTE — only on exit, before final approval (not required) */}
            {isExit && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-ink">Exit Note</label>
                  <span className="text-[10px] text-ink/40 font-semibold">OPTIONAL</span>
                </div>
                <p className="text-[11px] text-ink/50 mb-3">Log any observation for this exit. You can leave this blank.</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    ['No Problem', '#B4E4BE', '#1e6b2e'],
                    ['Small Issue', '#F1D88A', '#8a6d12'],
                    ['Security Concern', '#F3C9C9', '#9b2c2c'],
                    ['Incident Happened', '#D9C2E9', '#5b2c86'],
                  ].map(([label, bg, fg]) => {
                    const active = exitNote === label;
                    return (
                      <button key={label} type="button"
                              onClick={() => setExitNote(active ? '' : label)}
                              className="rounded-xl px-3 py-2 text-[11px] font-bold border-2 transition"
                              style={active
                                ? { backgroundColor: bg, color: fg, borderColor: fg }
                                : { backgroundColor: '#fff', color: '#112D31', borderColor: '#e5e7eb' }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <label className="block text-[10px] font-bold text-ink/60 mb-1">ADDITIONAL NOTE (optional)</label>
                <textarea value={exitAdditionalNote} onChange={(e) => setExitAdditionalNote(e.target.value)}
                          rows={2} placeholder="Add any extra detail (optional)"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-600 resize-none" />
              </div>
            )}

            <div className="rounded-xl px-4 py-3 text-center text-xs font-medium mb-5"
                 style={{ backgroundColor: '#DCF3E4', color: '#1e6b2e' }}>
              {isExit
                ? 'Time out will automatically be logged when guard approves of exit'
                : 'Time in will automatically be logged when guard approves of entry'}
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => setStep('matched')}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">BACK</button>
              <button onClick={handleApprove} disabled={submitting}
                      className="px-8 py-3 rounded-full text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: '#112D31' }}>
                {submitting ? 'SAVING...' : (isExit ? 'APPROVE EXIT' : 'APPROVE ENTRY')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accompanying modal (entry and exit) */}
      {showAccompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h2 className="text-base font-bold text-ink text-center mb-4">
              {isExit
                ? 'Are there visitors exiting together with this one?'
                : 'Are there accompanying visitors under the same visit?'}
            </h2>
            <hr className="border-gray-100 mb-5" />
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setSelectedCompanions([]); setShowAccompany(false); setStep('confirmed'); }}
                      className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300">NO</button>
              <button onClick={async () => {
                        setShowAccompany(false);
                        if (!isExit) await loadCompanions();
                        setStep('additional');
                      }}
                      className="px-8 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>YES</button>
            </div>
          </div>
        </div>
      )}

      {/* CALL RESULT modal */}
      {showCallResult && contactedResident && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative">
            <button onClick={() => setShowCallResult(false)}
                    className="absolute top-4 left-4 w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-ink font-bold">‹</button>
            <h2 className="text-base font-extrabold text-ink text-center mt-2 mb-4">CALL RESULT</h2>
            <div className="border border-gray-200 rounded-xl p-3 mb-4">
              <p className="font-bold text-ink text-sm">{contactedResident.name}</p>
              <p className="text-xs text-ink/60">Address: {contactedResident.address}</p>
              <p className="text-xs text-ink/60 italic mt-1">Visitor Verification Status: (choose below)</p>
            </div>
            <div className="flex gap-2 mb-2">
              <button onClick={() => { alert('Entry denied by resident — noted in records.'); navigate('/guard-home'); }}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>DENY ENTRY</button>
              <button onClick={() => { setShowCallResult(false); setStep('unlisted'); }}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#1a5fa8' }}>APPROVE ENTRY</button>
            </div>
            <div className="flex justify-center">
              <button onClick={() => { alert('No answer from resident.'); navigate('/guard-home'); }}
                      className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300">NO ANSWER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}