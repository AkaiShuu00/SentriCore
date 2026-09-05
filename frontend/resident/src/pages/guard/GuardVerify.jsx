import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getResidentsForGuard, getActiveVisitors, getCompanions } from '../../api';

const teal = '#0F6E6E';
const API = 'http://localhost:3000/api';

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
        <div className="w-14 h-16 rounded bg-gray-200 flex items-center justify-center text-2xl">🧑</div>
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

const nameTokens = (s) => (s || '').toUpperCase().replace(/[.,\-]/g, ' ').split(/\s+/).filter((w) => w.length >= 2);
const nameMatches = (scanned, dbName) => {
  const a = nameTokens(scanned);
  const b = nameTokens(dbName);
  if (a.length === 0 || b.length === 0) return false;
  const hits = b.filter((w) => a.includes(w)).length;
  return hits >= Math.min(2, b.length);
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
  const fileRef = useRef(null);
  const [scannedName, setScannedName] = useState(DEFAULT_SCANNED_NAME);
  const [driverName, setDriverName] = useState(DEFAULT_DRIVER_NAME);
  const [ocrError, setOcrError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [matchData, setMatchData] = useState({});

  // ── Real data mula DB ──
  const [residentsDB, setResidentsDB] = useState([]);
  const [activeDB, setActiveDB] = useState([]);
  const [entryCompanions, setEntryCompanions] = useState([]);   // para sa ENTRY accompanying

  const token = () => localStorage.getItem('sentricore_token');

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

  // ── Load companions para sa ENTRY accompanying ──
  // Batch → same batch members (hindi pa pumapasok); Single → expected singles
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
  // Batch scanned → same batch (registration_id) sa taas
  // Linked scanned → same arrival (arrival_id) sa taas
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

  const callResident = (r) => {
    setContactedResident(r);
    window.location.href = `tel:${(r.contact || '').replace(/\s/g, '')}`;
    setShowCallResult(true);
  };

  // ── Save ENTRY sa DATABASE (bawat companion may sariling resident/registration) ──
  const saveArrival = async () => {
    const mk = (name, resId, regId) => ({
      residentId: resId || null,
      registrationId: regId || null,
      visitorName: name,
      visitorType: entryInfo.driver ? 'Driver' : (entryInfo.category === 'DELIVERY' ? 'Delivery' : 'Visitor'),
      purpose: entryInfo.purpose || null,
      plateNumber: plate || null,
      passNumber: entryInfo.passId || null,
      status: 'Active',
    });

    const visitors = [];
    if (entryInfo.visitor) visitors.push(mk(entryInfo.visitor, entryInfo.residentId, entryInfo.registrationId));
    else if (entryInfo.driver) visitors.push(mk(entryInfo.driver, entryInfo.residentId, entryInfo.registrationId));
    for (const c of selectedCompanions) {
      visitors.push(mk(c.name, c.residentId || entryInfo.residentId, c.registrationId || entryInfo.registrationId));
    }

    const res = await fetch(`${API}/entry/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ visitors }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to record entry.');
    }
  };

  // ── Save EXIT sa DATABASE ──
  const saveExit = async () => {
    const exitingIds = [entryInfo.transactionId, ...selectedCompanions.map((c) => c.transactionId)].filter(Boolean);
    if (exitingIds.length === 0) {
      throw new Error('No active transaction to exit. Please scan an active visitor.');
    }
    for (const id of exitingIds) {
      const res = await fetch(`${API}/entry/${id}/exit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
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

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhoto(URL.createObjectURL(file));
    setOcrError('');
    setStep('reading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/ocr/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const data = await res.json();
      console.log('🟢 OCR response:', data);

      if (data.success && data.suggestedName) {
        const scanned = data.suggestedName;

        // ── EXIT: match sa ACTIVE visitors ──
        if (isExit) {
          setScannedName(scanned);
          const list = await loadActive();
          const found = list.find((t) => nameMatches(scanned, t.name));
          if (found) {
            setMatchData({
              transactionId: found.transactionId,
              arrivalId: found.arrivalId,
              registrationId: found.registrationId,
              passId: found.passNumber || ('VST ' + found.transactionId),
              category: (found.regType || 'Single').toUpperCase(),
              regType: found.regType || 'Single',
              resident: found.resident || '',
              address: found.address || '',
              visitor: found.name,
              purpose: found.purpose || 'N/A',
              expectedDate: '',
              residentId: found.residentId,
            });
            setScannedName(found.name);
          } else {
            setOcrError('This visitor is not currently active inside. Please verify or use manual search.');
          }
        }
        // ── ENTRY: driver flow ──
        else if (isDriverFlow) {
          setDriverName(scanned);
        }
        // ── ENTRY: visitor → match sa EXPECTED registrations ──
        else {
          setScannedName(scanned);
          try {
            const matchRes = await fetch(
              `${API}/entry/match?name=${encodeURIComponent(scanned)}`,
              { headers: { Authorization: `Bearer ${token()}` } }
            );
            const matchJson = await matchRes.json();
            console.log('🟣 match result:', matchJson);
            if (matchJson.matched && matchJson.candidates.length > 0) {
              const c = matchJson.candidates[0];
              const dateStr = c.expectedDate ? new Date(c.expectedDate).toLocaleDateString('en-US') : '';
              setMatchData({
                registrationId: c.registrationId,
                passId: 'VST ' + String(c.registrationId).padStart(6, '0'),
                category: (c.registrationType || 'Single').toUpperCase(),
                regType: c.registrationType || 'Single',
                resident: c.residentName || '',
                address: c.residentAddress || '',
                visitor: c.registeredName || scanned,
                purpose: c.purpose || 'N/A',
                expectedDate: dateStr,
                residentId: c.residentId,
              });
            } else {
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

  const afterReading = () => {
    if (isPickup && pickupTarget === 'RESIDENT') return 'pickupResidents';
    return 'matched';
  };

  // I-match ulit gamit ang na-edit na scanned name (entry visitor lang)
  const reRunMatch = async () => {
    const name = (scannedName || '').trim();
    if (!name) { setOcrError('Please type the name first.'); return; }
    setOcrError('');
    try {
      if (isExit) {
        const list = await loadActive();
        const found = list.find((t) => nameMatches(name, t.name));
        if (found) {
          setMatchData({
            transactionId: found.transactionId, arrivalId: found.arrivalId, registrationId: found.registrationId,
            passId: found.passNumber || ('VST ' + found.transactionId),
            category: (found.regType || 'Single').toUpperCase(), regType: found.regType || 'Single',
            resident: found.resident || '', address: found.address || '',
            visitor: found.name, purpose: found.purpose || 'N/A', expectedDate: '', residentId: found.residentId,
          });
          setScannedName(found.name);
        } else {
          setMatchData({});
          setOcrError('Not active inside. Check the name or use manual search.');
        }
      } else {
        const matchRes = await fetch(`${API}/entry/match?name=${encodeURIComponent(name)}`,
          { headers: { Authorization: `Bearer ${token()}` } });
        const matchJson = await matchRes.json();
        if (matchJson.matched && matchJson.candidates.length > 0) {
          const c = matchJson.candidates[0];
          const dateStr = c.expectedDate ? new Date(c.expectedDate).toLocaleDateString('en-US') : '';
          setMatchData({
            registrationId: c.registrationId, passId: 'VST ' + String(c.registrationId).padStart(6, '0'),
            category: (c.registrationType || 'Single').toUpperCase(), regType: c.registrationType || 'Single',
            resident: c.residentName || '', address: c.residentAddress || '',
            visitor: c.registeredName || name, purpose: c.purpose || 'N/A', expectedDate: dateStr, residentId: c.residentId,
          });
          setScannedName(c.registeredName || name);
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
        await saveArrival();
        alert(`Entry approved for ${total} visitor${total > 1 ? 's' : ''}! Time-in logged. ✅`);
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
    // Parehong entry at exit ay nagtatanong ng accompanying
    setShowAccompany(true);
  };

  // Confirmed cards: main + companions (bawat isa may sariling resident/address/purpose)
  const confirmedList = [
    { name: entryInfo.visitor, resident: entryInfo.resident, address: entryInfo.address, purpose: entryInfo.purpose },
    ...selectedCompanions.map((c) => ({
      name: c.name,
      resident: c.resident || entryInfo.resident,
      address: c.address || entryInfo.address,
      purpose: c.purpose || entryInfo.purpose,
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
                  <span className="text-3xl">🧑</span>
                  <span className="text-xs font-bold text-ink">VISITOR</span>
                </button>
                <button onClick={() => setEntryType('DELIVERY')}
                        className={`rounded-2xl p-6 flex flex-col items-center gap-3 border-2 ${entryType === 'DELIVERY' ? 'border-transparent' : 'border-gray-200'}`}
                        style={entryType === 'DELIVERY' ? { backgroundColor: '#CDE7DE' } : {}}>
                  <span className="text-3xl">🚚</span>
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
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-3 mb-4">
              <IDCardPlaceholder />
            </div>
            <p className="text-center text-xs text-ink mb-1">
              PLACE <span className="font-bold">{isDriverFlow ? "DRIVER'S" : "VISITOR'S"} IDENTIFICATION CARD</span> INSIDE THE BOX
            </p>
            <p className="text-center text-xs text-ink/50 mb-5">Ensure the ID is clear and readable</p>
            <div className="flex flex-col items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                     onChange={handlePhoto} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()}
                      className="px-6 py-2 rounded-full text-sm font-bold text-white w-52" style={{ backgroundColor: '#112D31' }}>
                TAKE PHOTO OF ID
              </button>
              <button onClick={() => setStep('reading')}
                      className="px-6 py-2 rounded-full text-sm font-bold text-white w-52" style={{ backgroundColor: '#112D31' }}>
                TYPE INFO MANUALLY
              </button>
              <button onClick={() => setStep(isExit ? 'reading' : 'choose')}
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

        {/* VISITOR MATCHED / DRIVER INFORMATION */}
        {step === 'matched' && (
          isDriverFlow ? (
            <div>
              <div className="bg-white rounded-2xl p-3 shadow mb-4">
                <IDCardPlaceholder name={driverName} />
              </div>
              <h2 className="text-xl font-extrabold text-ink text-center mb-4">DRIVER INFORMATION</h2>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-5">
                {(isDelivery
                  ? [
                      ['Registration Type', 'Single'],
                      ['Resident Name', deliveryResident?.name || ''],
                      ['Address', deliveryResident?.address || ''],
                      ['Purpose', 'Delivery'],
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
                                  passId: 'DRV-1001', category: 'DELIVERY', regType: 'Single',
                                  resident: deliveryResident?.name || '', address: deliveryResident?.address || '',
                                  residentId: deliveryResident?.residentId || null, driver: driverName,
                                  visitor: '', purpose: 'Delivery', expectedDate: '', title: 'DRIVER ENTRY CONFIRMED',
                                }
                              : {
                                  passId: 'DRV-1001', category: 'DELIVERY', regType: 'Single',
                                  resident: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.resident || '') : (pickupResident?.name || ''),
                                  address: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.address || '') : (pickupResident?.address || ''),
                                  residentId: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.residentId || null) : (pickupResident?.residentId || null),
                                  driver: driverName,
                                  visitor: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.name || scannedName) : '',
                                  purpose: pickupTarget === 'RESIDENT' ? 'Pickup resident' : 'Pickup visitor',
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
              <div className="bg-white rounded-2xl p-3 shadow mb-4">
                <IDCardPlaceholder name={scannedName} />
              </div>
              <h2 className="text-xl font-extrabold text-ink text-center mb-4">
                {isExit ? 'ACTIVE VISITOR' : 'VISITOR MATCHED'}
              </h2>

              {/* Editable scanned name — kung mali/kulang ang OCR */}
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

              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2 w-full">
                  <button onClick={() => setStep('residentList')}
                          className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                    MANUAL SEARCH
                  </button>
                  <button disabled={!matchData.visitor} onClick={onConfirmMatch}
                          className="flex-1 py-3 rounded-full text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: '#112D31' }}>
                    CONFIRM MATCH
                  </button>
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
              <span className="text-ink/40">🔍</span>
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

        {/* PICKUP RESIDENT — Notify Gate residents nasa taas */}
        {step === 'pickupResidents' && (() => {
          const notifs = JSON.parse(localStorage.getItem('sentricore_gate_notifications') || '[]');
          const waitingNames = notifs.map((n) => n.name);
          const waitingResidents = notifs.map((n) => {
            const db = residentsDB.find((r) => r.name === n.name) || {};
            return {
              residentId: db.residentId || null, name: n.name,
              address: db.address || n.address || '', waiting: true, rideHailing: n.rideHailing, time: n.time,
            };
          });
          const others = residentsDB.filter((r) => !waitingNames.includes(r.name)).map((r) => ({ ...r, waiting: false }));
          const list = [...waitingResidents, ...others].filter((r) => r.name.toLowerCase().includes(residentSearch.toLowerCase()));
          return (
            <div>
              <h2 className="text-2xl font-extrabold text-ink text-center mb-1">RESIDENT LIST</h2>
              <p className="text-center text-xs text-ink/60 mb-4">Who is being picked up?</p>
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
                <span className="text-ink/40">🔍</span>
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
              <span className="text-ink/40">🔍</span>
              <input value={residentSearch} onChange={(e) => setResidentSearch(e.target.value)}
                     placeholder="Search resident name"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>
            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <p className="text-sm font-semibold text-ink/70 mb-3">All residents expecting a delivery today</p>
              <div className="max-h-[45vh] overflow-y-auto space-y-2">
                {residentsDB.filter((r) => r.name.toLowerCase().includes(residentSearch.toLowerCase())).map((r) => {
                  const selected = deliveryResident?.name === r.name;
                  return (
                    <button key={r.residentId} onClick={() => setDeliveryResident(r)}
                            className="w-full text-left rounded-2xl p-3 border-2 flex items-center justify-between gap-2 shadow-sm"
                            style={{ borderColor: selected ? '#2f6b34' : '#eee' }}>
                      <div>
                        <p className="font-bold text-ink text-sm">{r.name}</p>
                        <p className="text-xs text-ink/60">Address: {r.address}</p>
                      </div>
                      <span className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: selected ? '#2f6b34' : '#d1d5db' }} />
                    </button>
                  );
                })}
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
              <span className="text-ink/40">🔍</span>
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
              <span className="text-ink/40">🔍</span>
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
            <div className="bg-white rounded-2xl p-3 shadow mb-4">
              <IDCardPlaceholder name={scannedName} />
            </div>
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
              {confirmedList.map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                  {[
                    ['Pass ID', entryInfo.passId],
                    ['Resident Name', c.resident],
                    ['Address', c.address],
                    ...(entryInfo.driver ? [['Driver Name', entryInfo.driver]] : []),
                    ['Visitor Name', c.name],
                    ['Purpose', c.purpose],
                  ].filter(([, val]) => val && val !== '—').map(([label, val]) => (
                    <div key={label} className="px-4 py-3">
                      <span className="text-xs text-ink"><span className="font-bold">{label}:</span> {val}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

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

      {/* Accompanying modal (entry at exit) */}
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