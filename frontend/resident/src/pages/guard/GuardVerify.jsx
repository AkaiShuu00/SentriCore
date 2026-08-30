import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getResidentsForGuard, getActiveVisitors } from '../../api';

const teal = '#0F6E6E';
const API = 'http://localhost:3000/api';

// Matched registration (sample — papalitan ng backend lookup after)
const MATCHED = {
  passId: 'LNK 260602-2001',
  category: 'SINGLE',
  regType: 'Single',
  resident: 'Marina Lewis',
  address: '34 Cancer St.',
  visitor: 'Jon Snow',
  purpose: 'Board night',
  expectedDate: '06/02/2026',
};

// Pool ng expected pre-registered visitors (para sa accompanying visitors)
const PREREG_POOL = [
  { name: 'Rhaenyra Targaryen', resident: 'Marina Lewis',    address: '34 Cancer St',            purpose: 'Board night' },
  { name: 'Theon Greyjoy',      resident: 'Marina Lewis',    address: '34 Cancer St',            purpose: 'Board night' },
  { name: 'Juan Dela Cruz',     resident: 'Reina Magpantay', address: '207 Gemini St. Block A',  purpose: 'Visiting a friend' },
  { name: 'Adrianne Pawhay',    resident: 'Reina Magpantay', address: '207 Gemini St. Block A',  purpose: 'N/A' },
  { name: 'Naveah Lim',         resident: 'Reina Magpantay', address: '207 Gemini St. Block A',  purpose: 'Casual visit' },
  { name: 'Delia Samaco',       resident: 'Reina Magpantay', address: '207 Gemini St. Block A',  purpose: 'Family gathering' },
];

// Batch match (kapag personal visit na may sasakyan → tumugma sa batch registration)
const MATCHED_BATCH = {
  batchNo: '260602-1001',
  category: 'BATCH',
  passId: 'BTC 260602-1001-1',
  regType: 'Batch',
  resident: 'Reina Magpantay',
  address: '207 Gemini St. Block A',
  visitor: 'Tony Hawk',
  purpose: 'Birthday celebration',
  expectedDate: '06/02/2026',
  subtitle: 'Batch 260602-1001 | Arrival 1',
};

// Ibang miyembro ng parehong batch (para sa Register Batch Visitors)
const BATCH_POOL = [
  { name: 'Madeleine Mina',   resident: 'Reina Magpantay', address: '207 Gemini St. Block A', purpose: 'Birthday celebration' },
  { name: 'Angel Libunao',    resident: 'Reina Magpantay', address: '207 Gemini St. Block A', purpose: 'Birthday celebration' },
  { name: 'Love Licuanan',    resident: 'Reina Magpantay', address: '207 Gemini St. Block A', purpose: 'Birthday celebration' },
  { name: 'Jericho Gonzales', resident: 'Reina Magpantay', address: '207 Gemini St. Block A', purpose: 'Birthday celebration' },
  { name: 'Jefferson Moong',  resident: 'Reina Magpantay', address: '207 Gemini St. Block A', purpose: 'Birthday celebration' },
];

// Fallback names kung walang OCR result (hal. manual entry o pumalya ang OCR)
const DEFAULT_SCANNED_NAME = 'Jon Snow';
const DEFAULT_DRIVER_NAME = 'Angelie Roman';

// Residents na may inaasahang delivery ngayon (para sa delivery flow)
const DELIVERY_RESIDENTS = [
  { name: 'Reina Magpantay', address: '207 Gemini St. Block A', orderId: 'PH 268358905823K' },
];

// Active visitors sa loob ngayon (para sa pickup)
const ACTIVE_VISITORS = [
  { name: 'Jon Snow',           resident: 'Marina Lewis',    address: '34 Cancer St.',           purpose: 'Board night' },
  { name: 'Rhaenyra Targaryen', resident: 'Marina Lewis',    address: '34 Cancer St.',           purpose: 'Board night' },
  { name: 'Theon Greyjoy',      resident: 'Marina Lewis',    address: '34 Cancer St.',           purpose: 'Board night' },
  { name: 'Joshua Mina',        resident: 'Reina Magpantay', address: '207 Gemini St. Block A',  purpose: 'Visiting a friend' },
];

// Resident directory (para sa Contact Resident)
const RESIDENT_LIST = [
  { name: 'Reina Magpantay',   address: '207 Gemini St. Block A', contact: '0912 456 3857' },
  { name: 'Marina Lewis',      address: '34 Cancer St.',          contact: '0956 395 7985' },
  { name: 'Stemis Bardheon',   address: '108 Cypress St. Block D', contact: '0870 409 1236' },
  { name: 'Petyr Baelish',     address: '65 Taurus St.',          contact: '0818 448 1968' },
  { name: 'Padrick Payne',     address: '31 Pisces St. Block D',  contact: '0664 159 7569' },
  { name: 'Olenna Tyrell',     address: '74 Gemini St. Block B',  contact: '0644 154 2495' },
  { name: 'Maester Aemon',     address: '870 Leo St. Block E',    contact: '0919 653 8895' },
  { name: 'Jeor Mormont',      address: '745 Sagittarius St.',    contact: '0929 307 9889' },
  { name: 'Daenerys Targaryen',address: '89 Pisces St. Block C',  contact: '0656 760 5454' },
];

// Stylized ID-card placeholder (hindi totoong ID)
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

export default function GuardVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExit = searchParams.get('mode') === 'exit';
  const [step, setStep] = useState(isExit ? 'scan' : 'choose'); // exit: start sa scan
  const [entryType, setEntryType] = useState(null); // VISITOR | DELIVERY
  const [drivePurpose, setDrivePurpose] = useState('');
  const [plate, setPlate] = useState('');
  const [photo, setPhoto] = useState(null);       // preview URL
  const [photoFile, setPhotoFile] = useState(null); // aktwal na File
  const [showAccompany, setShowAccompany] = useState(false);
  const [selectedCompanions, setSelectedCompanions] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const [entryInfo, setEntryInfo] = useState(MATCHED);         // details na ipapakita sa confirmed
  const [manualSelected, setManualSelected] = useState(null);  // napiling visitor sa manual search
  const [contactedResident, setContactedResident] = useState(null);
  const [showCallResult, setShowCallResult] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('All');
  const [pickupTarget, setPickupTarget] = useState('');       // RESIDENT | VISITOR
  const [pickedUpVisitor, setPickedUpVisitor] = useState(null);
  const [pickupResident, setPickupResident] = useState(null);
  const [activeSearch, setActiveSearch] = useState('');
  const [deliveryResident, setDeliveryResident] = useState(null);
  const fileRef = useRef(null);
  const [scannedName, setScannedName] = useState(DEFAULT_SCANNED_NAME);
  const [driverName, setDriverName] = useState(DEFAULT_DRIVER_NAME);
  const [ocrError, setOcrError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Real data mula DB ──
  const [residentsDB, setResidentsDB] = useState([]);     // para sa delivery/pickup/contact
  const [activeDB, setActiveDB] = useState([]);           // active visitors (para sa exit/pickup)

  // Kunin ang residents directory (guard) at active visitors
  useEffect(() => {
    getResidentsForGuard()
      .then((res) => setResidentsDB((res.data || []).map((r) => ({
        residentId: r.resident_id,
        name: r.full_name,
        address: r.unit_address,
        contact: r.contact_number || '',
      }))))
      .catch(() => setResidentsDB([]));

    getActiveVisitors()
      .then((res) => setActiveDB((res.data || []).map((t) => ({
        transactionId: t.transaction_id,
        name: t.visitor_name,
        resident: t.resident_name,
        address: t.unit_address,
        residentId: t.resident_id,
        purpose: t.purpose || 'N/A',
      }))))
      .catch(() => setActiveDB([]));
  }, []);

  const isPickup = drivePurpose === 'PICKUP';
  const isDelivery = entryType === 'DELIVERY';
  const isDriverFlow = isPickup || isDelivery; // parehong nag-scan ng DRIVER'S ID
  const isBatchMatch = drivePurpose === 'PERSONAL VISIT';
  const [matchData, setMatchData] = useState(MATCHED);

  const token = () => localStorage.getItem('sentricore_token');

  // Panatilihin ang tamang default match data (batch demo vs normal) kapag walang OCR match pa
  useEffect(() => {
    setMatchData(isBatchMatch ? MATCHED_BATCH : MATCHED);
  }, [isBatchMatch]);

  // Pool para sa accompanying step (exit → active mula DB; batch → batch pool; else → prereg)
  const additionalPool = isExit
    ? activeDB.filter((v) => v.name !== entryInfo?.visitor)
    : isBatchMatch ? BATCH_POOL : PREREG_POOL;

  // Address filter options (blocks na nakuha mula sa DB residents)
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
    window.location.href = `tel:${r.contact.replace(/\s/g, '')}`; // bubukas ang phone app
    setShowCallResult(true);
  };

  // ── I-save ang na-approve na entry sa DATABASE (POST /api/entry/group) ──
  const saveArrival = async () => {
    const names = [entryInfo.visitor, ...selectedCompanions.map((c) => c.name)].filter(Boolean);
    // Kung driver-only (walang visitor name, hal. pickup resident/delivery), gamitin ang driver
    const entryNames = names.length ? names : (entryInfo.driver ? [entryInfo.driver] : []);

    const visitors = entryNames.map((name) => ({
      residentId: entryInfo.residentId || null,
      registrationId: entryInfo.registrationId || null,
      visitorName: name,
      visitorType: entryInfo.driver ? 'Driver' : (entryInfo.category === 'DELIVERY' ? 'Delivery' : 'Visitor'),
      purpose: entryInfo.purpose || null,
      plateNumber: plate || null,
      passNumber: entryInfo.passId || null,
      status: 'Active',
    }));

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

  // ── I-log ang exit sa DATABASE (POST /api/entry/:id/exit) ──
  const saveExit = async () => {
    const exitingIds = [entryInfo.transactionId, ...selectedCompanions.map((c) => c.transactionId)].filter(Boolean);
    if (exitingIds.length === 0) {
      throw new Error('No active transaction to exit. (Exit matching needs the active-visitor list from the database.)');
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

  // Kapag may nakuhang litrato ng ID → i-preview, tumawag sa OCR, tapos i-match sa DB
  const handlePhoto = async (e) => {
    console.log('🔵 handlePhoto triggered');
    const file = e.target.files?.[0];
    if (!file) { console.log('🔴 no file — stopped'); return; }
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
        if (isDriverFlow) {
          setDriverName(data.suggestedName);
        } else {
          setScannedName(data.suggestedName);
          // Hanapin ang scanned name sa expected registrations (real matching)
          try {
            const matchRes = await fetch(
              `${API}/entry/match?name=${encodeURIComponent(data.suggestedName)}`,
              { headers: { Authorization: `Bearer ${token()}` } }
            );
            const matchJson = await matchRes.json();
            console.log('🟣 match result:', matchJson);

            if (matchJson.matched && matchJson.candidates.length > 0) {
              const c = matchJson.candidates[0]; // best match
              const dateStr = c.expectedDate
                ? new Date(c.expectedDate).toLocaleDateString('en-US')
                : '';
              setMatchData({
                registrationId: c.registrationId,
                passId: 'VST ' + String(c.registrationId).padStart(6, '0'),
                category: (c.registrationType || 'Single').toUpperCase(),
                regType: c.registrationType || 'Single',
                resident: c.residentName || '',
                address: c.residentAddress || '',
                visitor: c.registeredName || data.suggestedName,
                purpose: c.purpose || 'N/A',
                expectedDate: dateStr,
                residentId: c.residentId,
              });
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

  // Saan pupunta pagkatapos ng reading (pickup-resident → pumili ng resident muna)
  const afterReading = () => {
    if (isPickup && pickupTarget === 'RESIDENT') return 'pickupResidents';
    return 'matched';
  };

  // Auto-advance para sa MANUAL entry lang (walang photo/OCR)
  useEffect(() => {
    if (step === 'reading' && !photoFile) {
      const t = setTimeout(() => setStep(afterReading()), 1200);
      return () => clearTimeout(t);
    }
  }, [step, photoFile]);

  const close = () => navigate('/guard-home');

  // Handler ng APPROVE (entry o exit) — DB save + error handling
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

  // ── Full-screen steps (scan / reading / matched / ...) ──
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
              <button onClick={() => setStep('choose')}
                      className="px-6 py-2 rounded-full text-sm font-bold text-ink border border-gray-300 w-40">
                BACK
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
                        ? [['Resident Name', pickedUpVisitor?.resident || MATCHED.resident]]
                        : [['Resident Name', pickupResident?.name || '']]),
                      ['Address', pickupTarget === 'VISITOR' ? (pickedUpVisitor?.address || MATCHED.address) : (pickupResident?.address || '')],
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
                  <button onClick={() => setStep('manualSearch')}
                          className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                    MANUAL SEARCH
                  </button>
                  <button onClick={() => {
                            setEntryInfo(isDelivery
                              ? {
                                  passId: 'DRV-1001',
                                  category: 'DELIVERY',
                                  regType: 'Single',
                                  resident: deliveryResident?.name || '',
                                  address: deliveryResident?.address || '',
                                  residentId: deliveryResident?.residentId || null,
                                  driver: driverName,
                                  visitor: '',
                                  purpose: 'Delivery',
                                  expectedDate: '',
                                  title: 'DRIVER ENTRY CONFIRMED',
                                }
                              : {
                                  passId: 'DRV-1001',
                                  category: 'DELIVERY',
                                  regType: 'Single',
                                  resident: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.resident || MATCHED.resident) : (pickupResident?.name || ''),
                                  address: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.address || MATCHED.address) : (pickupResident?.address || ''),
                                  residentId: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.residentId || null) : (pickupResident?.residentId || null),
                                  driver: driverName,
                                  visitor: pickupTarget === 'VISITOR' ? (pickedUpVisitor?.name || scannedName) : '',
                                  purpose: pickupTarget === 'RESIDENT' ? 'Pickup resident' : 'Pickup visitor',
                                  expectedDate: '',
                                  title: 'DRIVER ENTRY CONFIRMED',
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

              <h2 className="text-xl font-extrabold text-ink text-center mb-4">VISITOR MATCHED</h2>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-5">
                {[
                  ['Registration Type', matchData.regType],
                  ['Resident Name', matchData.resident],
                  ['Address', matchData.address],
                  ['Visitor Name', scannedName],
                  ['Purpose', matchData.purpose],
                  ['Expected Date', matchData.expectedDate],
                ].map(([label, val]) => (
                  <div key={label} className="px-4 py-3">
                    <span className="text-xs text-ink"><span className="font-bold">{label}:</span> {val}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2 w-full">
                  <button onClick={() => setStep('manualSearch')}
                          className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                    MANUAL SEARCH
                  </button>
                  <button onClick={() => {
                            // Sa EXIT, hanapin ang transactionId ng na-scan na bisita mula active list
                            const act = isExit ? activeDB.find((v) => v.name === scannedName) : null;
                            setEntryInfo({ ...matchData, visitor: scannedName, transactionId: act?.transactionId || null });
                            setSelectedCompanions([]);
                            setShowAccompany(true);
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
          )
        )}

        {/* REGISTER ADDITIONAL / BATCH / ACTIVE VISITORS (accompanying) */}
        {step === 'additional' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-4">
              {isExit ? 'ACTIVE VISITORS' : isBatchMatch ? 'REGISTER BATCH VISITORS' : 'REGISTER ADDITIONAL VISITORS'}
            </h2>
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
              <span className="text-ink/40">🔍</span>
              <input value={addSearch} onChange={(e) => setAddSearch(e.target.value)}
                     placeholder="Search visitor name"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>

            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <p className="text-center text-sm font-semibold text-ink/70 mb-3">
                {isExit
                  ? 'ACTIVE VISITORS AS OF TODAY'
                  : isBatchMatch
                    ? `EXPECTED BATCH ${MATCHED_BATCH.batchNo} VISITORS AS OF TODAY`
                    : 'EXPECTED PRE-REGISTERED VISITORS AS OF TODAY'}
              </p>
              <div className="max-h-[45vh] overflow-y-auto space-y-2">
                {additionalPool
                  .filter((v) => v.name.toLowerCase().includes(addSearch.toLowerCase()))
                  .map((v) => {
                    const selected = !!selectedCompanions.find((p) => p.name === v.name);
                    return (
                      <button key={v.name} onClick={() => toggleCompanion(v)}
                              className="w-full text-left rounded-2xl p-3 border-2 flex items-center justify-between gap-2 shadow-sm"
                              style={{ borderColor: selected ? '#2f6b34' : '#eee' }}>
                        <div>
                          <p className="font-bold text-ink text-sm">{v.name}</p>
                          {!isBatchMatch && <p className="text-xs text-ink/60">{v.resident} | {v.address}</p>}
                          {!isBatchMatch && <p className="text-xs text-ink/60">Purpose: {v.purpose}</p>}
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
            <div className="flex flex-col items-center gap-2">
              {!isExit && (
                <button onClick={() => alert('Add manual registration — iko-connect after')}
                        className="w-72 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">
                  ADD MANUAL REGISTRATION
                </button>
              )}
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
          // I-match ang notify-gate sa DB residents para makuha ang residentId + address
          const waitingResidents = notifs.map((n) => {
            const db = residentsDB.find((r) => r.name === n.name) || {};
            return {
              residentId: db.residentId || null,
              name: n.name,
              address: db.address || n.address || '',
              waiting: true, rideHailing: n.rideHailing, time: n.time,
            };
          });
          const others = residentsDB
            .filter((r) => !waitingNames.includes(r.name))
            .map((r) => ({ ...r, waiting: false }));
          const list = [...waitingResidents, ...others]
            .filter((r) => r.name.toLowerCase().includes(residentSearch.toLowerCase()));
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
                        className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">
                  BACK
                </button>
                <button onClick={() => {
                          if (!pickupResident) { alert('Please select the resident being picked up.'); return; }
                          setStep('matched');
                        }}
                        className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                  PROCEED
                </button>
              </div>

              <p className="text-center text-xs font-semibold text-ink/60 mb-3">CAN'T FIND RESIDENT ON THE LIST?</p>
              <div className="flex justify-center">
                <button onClick={() => setStep('residentList')}
                        className="w-60 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">
                  CONTACT RESIDENT
                </button>
              </div>
            </div>
          );
        })()}

        {/* DELIVERY — residents na may inaasahang delivery ngayon */}
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
                {residentsDB
                  .filter((r) => r.name.toLowerCase().includes(residentSearch.toLowerCase()))
                  .map((r) => {
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
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">
                BACK
              </button>
              <button onClick={() => {
                        if (!deliveryResident) { alert('Please select the resident expecting the delivery.'); return; }
                        setStep('scan');
                      }}
                      className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                PROCEED
              </button>
            </div>

            <p className="text-center text-xs font-semibold text-ink/60 mb-3">CAN'T FIND RESIDENT ON THE LIST?</p>
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => alert('Add manual registration — iko-connect after')}
                      className="w-72 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">
                ADD MANUAL REGISTRATION
              </button>
              <button onClick={() => setStep('residentList')}
                      className="w-60 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">
                CONTACT RESIDENT
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE VISITORS — piliin kung sino ang susunduin (pickup) */}
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
                {activeDB
                  .filter((v) => v.name.toLowerCase().includes(activeSearch.toLowerCase()))
                  .map((v) => {
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
                {activeDB.length === 0 && (
                  <p className="text-center text-ink/50 py-6 text-sm">No active visitors right now.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-center mb-6">
              <button onClick={() => { setPickedUpVisitor(null); setStep('scan'); }}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">
                SKIP
              </button>
              <button onClick={() => {
                        if (!pickedUpVisitor) { alert('Please select the visitor being picked up.'); return; }
                        setStep('scan');
                      }}
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

        {/* MANUAL SEARCH */}
        {step === 'manualSearch' && (
          <div>
            <div className="bg-white rounded-2xl p-3 shadow mb-4">
              <IDCardPlaceholder name={scannedName} />
            </div>
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
              <span className="text-ink/40">🔍</span>
              <input value={addSearch} onChange={(e) => setAddSearch(e.target.value)}
                     placeholder="Search visitor name"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>

            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <p className="text-center text-sm font-semibold text-ink/70 mb-3">EXPECTED PRE-REGISTERED VISITORS AS OF TODAY</p>
              <div className="max-h-[42vh] overflow-y-auto space-y-2">
                {PREREG_POOL
                  .filter((v) => v.name.toLowerCase().includes(addSearch.toLowerCase()))
                  .map((v) => {
                    const selected = manualSelected?.name === v.name;
                    return (
                      <button key={v.name} onClick={() => setManualSelected(v)}
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
              <button onClick={() => setStep('matched')}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">
                BACK
              </button>
              <button onClick={() => {
                        if (!manualSelected) { alert('Please select a visitor, or contact the resident.'); return; }
                        setEntryInfo({
                          passId: 'VST 260602-1001',
                          category: 'SINGLE',
                          regType: 'Single',
                          resident: manualSelected.resident,
                          address: manualSelected.address,
                          residentId: manualSelected.residentId || null,
                          registrationId: manualSelected.registrationId || null,
                          visitor: manualSelected.name,
                          purpose: manualSelected.purpose,
                          expectedDate: '06/02/2026',
                        });
                        setSelectedCompanions([]);
                        setStep('confirmed');
                      }}
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

        {/* RESIDENT LIST — Contact Resident */}
        {step === 'residentList' && (
          <div>
            <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between" style={{ backgroundColor: '#FBE0E0' }}>
              <div>
                <p className="font-bold text-ink text-xs">Need assistance or have concerns?</p>
                <p className="text-[11px] text-ink/60">Contact the HOA administrator</p>
              </div>
              <button onClick={() => { window.location.href = 'tel:0000'; }}
                      className="text-white font-bold text-[11px] px-4 py-2 rounded-full" style={{ backgroundColor: '#C0392B' }}>
                CALL
              </button>
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
                ) : (
                  filteredResidents.map((r) => (
                    <div key={r.residentId} className="rounded-2xl p-3 border border-gray-200 shadow-sm flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-ink text-sm">{r.name}</p>
                        <p className="text-xs text-ink/60">Address: {r.address}</p>
                        <p className="text-xs text-ink/60">Contact Number: {r.contact}</p>
                      </div>
                      <button onClick={() => callResident(r)}
                              className="text-white text-[11px] font-bold px-4 py-2 rounded-full shrink-0" style={{ backgroundColor: '#1a5fa8' }}>
                        CALL
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <button onClick={() => setStep('manualSearch')}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">
                BACK
              </button>
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
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                BACK
              </button>
              <button onClick={() => {
                        setEntryInfo({
                          passId: 'UNL 260602-0001',
                          category: 'SINGLE',
                          regType: 'Single',
                          resident: contactedResident?.name || '',
                          address: contactedResident?.address || '',
                          residentId: contactedResident?.residentId || null,
                          visitor: scannedName,
                          purpose: '',
                          expectedDate: '',
                        });
                        setSelectedCompanions([]);
                        setStep('confirmed');
                      }}
                      className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                CONFIRM DETAILS
              </button>
            </div>
          </div>
        )}

        {/* VISITOR / DRIVER ENTRY CONFIRMED / EXIT CONFIRMED */}
        {step === 'confirmed' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-1">
              {isExit ? 'VISITOR EXIT CONFIRMED' : (entryInfo.title || 'VISITOR ENTRY CONFIRMED')}
            </h2>
            {entryInfo.subtitle && (
              <p className="text-center text-xs text-ink/60 mb-4">{entryInfo.subtitle}</p>
            )}
            {!entryInfo.subtitle && <div className="mb-4" />}

            <div className="space-y-4 max-h-[55vh] overflow-y-auto mb-4">
              {[entryInfo.visitor, ...selectedCompanions.map((c) => c.name)]
                .filter((v, i) => i === 0 || v)
                .map((vname, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                  {[
                    ['Pass ID', entryInfo.passId],
                    ['Resident Name', entryInfo.resident],
                    ['Address', entryInfo.address],
                    ...(entryInfo.driver ? [['Driver Name', entryInfo.driver]] : []),
                    ['Visitor Name', vname],
                    ['Purpose', entryInfo.purpose],
                    ['Expected Date', entryInfo.expectedDate],
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
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                BACK
              </button>
              <button onClick={handleApprove} disabled={submitting}
                      className="px-8 py-3 rounded-full text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: '#112D31' }}>
                {submitting ? 'SAVING...' : (isExit ? 'APPROVE EXIT' : 'APPROVE ENTRY')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accompanying visitors modal */}
      {showAccompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h2 className="text-base font-bold text-ink text-center mb-4">
              Are there accompanying visitors under the same visit?
            </h2>
            <hr className="border-gray-100 mb-5" />
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setSelectedCompanions([]); setShowAccompany(false); setStep('confirmed'); }}
                      className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300">
                NO
              </button>
              <button onClick={() => { setShowAccompany(false); setStep('additional'); }}
                      className="px-8 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                YES
              </button>
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
              <p className="text-xs text-ink/60">Date Contacted: 06/02/2026</p>
              <p className="text-xs text-ink/60 italic mt-1">Visitor Verification Status: (choose below)</p>
            </div>

            <div className="flex gap-2 mb-2">
              <button onClick={() => {
                        alert('Entry denied by resident — noted in records.');
                        navigate('/guard-home');
                      }}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                DENY ENTRY
              </button>
              <button onClick={() => { setShowCallResult(false); setStep('unlisted'); }}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#1a5fa8' }}>
                APPROVE ENTRY
              </button>
            </div>
            <div className="flex justify-center">
              <button onClick={() => { alert('No answer from resident.'); navigate('/guard-home'); }}
                      className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300">
                NO ANSWER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}