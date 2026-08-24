import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const teal = '#0F6E6E';

// Matched registration (sample — papalitan ng backend lookup after)
const MATCHED = {
  passId: 'LNK 260602-2001',
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

// Scanned name mula OCR (placeholder muna)
const SCANNED_NAME = 'Jon Snow';

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
  const [step, setStep] = useState('choose'); // choose | vehicle | scan | reading | matched
  const [entryType, setEntryType] = useState(null); // VISITOR | DELIVERY
  const [drivePurpose, setDrivePurpose] = useState('');
  const [plate, setPlate] = useState('');
  const [photo, setPhoto] = useState(null);       // preview URL
  const [photoFile, setPhotoFile] = useState(null); // aktwal na File (para sa OCR mamaya)
  const [showAccompany, setShowAccompany] = useState(false);
  // Pre-selected: mga bisitang kaparehong resident ng matched (auto-suggest na kasama)
  const [selectedCompanions, setSelectedCompanions] = useState(
    PREREG_POOL.filter((v) => v.resident === MATCHED.resident)
  );
  const [addSearch, setAddSearch] = useState('');
  const [entryInfo, setEntryInfo] = useState(MATCHED);         // details na ipapakita sa confirmed
  const [manualSelected, setManualSelected] = useState(null);  // napiling visitor sa manual search
  const [contactedResident, setContactedResident] = useState(null);
  const [showCallResult, setShowCallResult] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('All');
  const fileRef = useRef(null);

  // Address filter options (blocks na nakuha mula sa data)
  const blocks = ['All', ...Array.from(new Set(
    RESIDENT_LIST.map((r) => {
      const m = r.address.match(/Block\s+([A-Za-z0-9]+)/);
      return m ? `Block ${m[1]}` : null;
    }).filter(Boolean)
  ))];

  const filteredResidents = RESIDENT_LIST.filter((r) => {
    const q = residentSearch.toLowerCase();
    const matchQ = r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q);
    const matchBlock = blockFilter === 'All' || r.address.includes(blockFilter);
    return matchQ && matchBlock;
  });

  const callResident = (r) => {
    setContactedResident(r);
    window.location.href = `tel:${r.contact.replace(/\s/g, '')}`; // bubukas ang phone app
    setShowCallResult(true);
  };

  const toggleCompanion = (v) => {
    setSelectedCompanions((prev) =>
      prev.find((p) => p.name === v.name)
        ? prev.filter((p) => p.name !== v.name)
        : [...prev, v]
    );
  };

  // Kapag may nakuhang litrato ng ID → i-preview at pumunta sa Reading step
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhoto(URL.createObjectURL(file));
    setStep('reading');
    // TODO (mamaya): dito ipapadala ang `file` sa PaddleOCR backend, tapos i-match ang pangalan
  };

  // Auto-advance ang "Reading ID..." pagkatapos ng ilang segundo
  useEffect(() => {
    if (step === 'reading') {
      const t = setTimeout(() => setStep('matched'), 1800);
      return () => clearTimeout(t);
    }
  }, [step]);

  const close = () => navigate('/guard-home');

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

              {/* Vehicle question — lumalabas kapag may napiling type */}
              {entryType && (
                <>
                  <p className="text-center italic text-ink/70 mt-5 mb-3 border-t border-gray-100 pt-4">
                    {entryType === 'VISITOR' ? 'visitor arrived with vehicle?' : 'delivery arrived with vehicle?'}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setStep('scan')}
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
              <p className="text-center text-xs text-ink/70 mb-2">Enter plate number of the vehicle</p>
              <input value={plate} onChange={(e) => setPlate(e.target.value)}
                     placeholder="DTF 102938573"
                     className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm text-center mb-5 outline-none focus:border-teal-600" />
              <div className="flex justify-center">
                <button onClick={() => {
                          if (!drivePurpose) { alert("Please select the driver's purpose."); return; }
                          if (!plate.trim()) { alert('Please enter the plate number.'); return; }
                          setStep('scan');
                        }}
                        className="px-8 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                  PROCEED
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Full-screen steps (scan / reading / matched) ──
  return (
    <div className="min-h-screen bg-cream max-w-md mx-auto">
      {/* Sub-page header */}
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
              PLACE <span className="font-bold">VISITOR'S IDENTIFICATION CARD</span> INSIDE THE BOX
            </p>
            <p className="text-center text-xs text-ink/50 mb-5">Ensure the ID is clear and readable</p>
            <div className="flex flex-col items-center gap-2">
              {/* Hidden camera/file input — kukuha ng ID photo */}
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
            <button onClick={() => setStep('matched')}
                    className="px-8 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
              CONTINUE
            </button>
          </div>
        )}

        {/* VISITOR MATCHED */}
        {step === 'matched' && (
          <div>
            <div className="bg-white rounded-2xl p-3 shadow mb-4">
              <IDCardPlaceholder name={MATCHED.visitor} />
            </div>

            <h2 className="text-xl font-extrabold text-ink text-center mb-4">VISITOR MATCHED</h2>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-5">
              {[
                ['Registration Type', MATCHED.regType],
                ['Resident Name', MATCHED.resident],
                ['Address', MATCHED.address],
                ['Visitor Name', MATCHED.visitor],
                ['Purpose', MATCHED.purpose],
                ['Expected Date', MATCHED.expectedDate],
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
                <button onClick={() => setShowAccompany(true)}
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
        )}

        {/* REGISTER ADDITIONAL VISITORS (YES path) */}
        {step === 'additional' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-4">REGISTER ADDITIONAL VISITORS</h2>
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow mb-4">
              <span className="text-ink/40">🔍</span>
              <input value={addSearch} onChange={(e) => setAddSearch(e.target.value)}
                     placeholder="Search visitor name"
                     className="flex-1 outline-none bg-transparent text-ink placeholder-ink/40" />
            </div>

            <div className="bg-white rounded-3xl p-4 shadow mb-4">
              <p className="text-center text-sm font-semibold text-ink/70 mb-3">EXPECTED PRE-REGISTERED VISITORS AS OF TODAY</p>
              <div className="max-h-[45vh] overflow-y-auto space-y-2">
                {PREREG_POOL
                  .filter((v) => v.name.toLowerCase().includes(addSearch.toLowerCase()))
                  .map((v) => {
                    const selected = !!selectedCompanions.find((p) => p.name === v.name);
                    return (
                      <button key={v.name} onClick={() => toggleCompanion(v)}
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
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => alert('Add manual registration — iko-connect after')}
                      className="w-72 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">
                ADD MANUAL REGISTRATION
              </button>
              <button onClick={() => alert('Contact resident')}
                      className="w-60 py-3 rounded-xl text-sm font-bold text-ink border border-gray-300 bg-white shadow-sm">
                CONTACT RESIDENT
              </button>
            </div>
          </div>
        )}

        {/* MANUAL SEARCH — no match / mali ang scan (hanapin sa expected list) */}
        {step === 'manualSearch' && (
          <div>
            <div className="bg-white rounded-2xl p-3 shadow mb-4">
              <IDCardPlaceholder name={SCANNED_NAME} />
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
                          regType: 'Single',
                          resident: manualSelected.resident,
                          address: manualSelected.address,
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

        {/* RESIDENT LIST — para tawagan ang resident (unregistered visitor) */}
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

            {/* Address filter (by block) */}
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
                    <div key={r.name} className="rounded-2xl p-3 border border-gray-200 shadow-sm flex items-center justify-between gap-2">
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

        {/* UNLISTED VISITOR INFORMATION — pagkatapos i-approve ng resident */}
        {step === 'unlisted' && (
          <div>
            <div className="bg-white rounded-2xl p-3 shadow mb-4">
              <IDCardPlaceholder name={SCANNED_NAME} />
            </div>
            <h2 className="text-xl font-extrabold text-ink text-center mb-4">UNLISTED VISITOR INFORMATION</h2>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-5">
              {[
                ['Registration Type', 'Single'],
                ['Resident Name', contactedResident?.name || ''],
                ['Address', contactedResident?.address || ''],
                ['Visitor Name', SCANNED_NAME],
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
                          regType: 'Single',
                          resident: contactedResident?.name || '',
                          address: contactedResident?.address || '',
                          visitor: SCANNED_NAME,
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

        {/* VISITOR ENTRY CONFIRMED (main + accompanying) */}
        {step === 'confirmed' && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink text-center mb-4">VISITOR ENTRY CONFIRMED</h2>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto mb-4">
              {[entryInfo.visitor, ...selectedCompanions.map((c) => c.name)].map((vname, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                  {[
                    ['Pass ID', entryInfo.passId],
                    ['Resident Name', entryInfo.resident],
                    ['Address', entryInfo.address],
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
              Time in will automatically be logged when guard approves of entry
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => setStep('matched')}
                      className="px-8 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                BACK
              </button>
              <button onClick={() => {
                        const total = 1 + selectedCompanions.length;
                        alert(`Entry approved for ${total} visitor${total > 1 ? 's' : ''}! Time-in logged. ✅`);
                        navigate('/guard-home');
                      }}
                      className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                APPROVE ENTRY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accompanying visitors modal (pagkatapos ng Confirm Match) */}
      {showAccompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h2 className="text-base font-bold text-ink text-center mb-4">
              Are there accompanying visitors under the same visit?
            </h2>
            <hr className="border-gray-100 mb-5" />
            <div className="flex gap-3 justify-center">
              {/* NO — walang kasama */}
              <button onClick={() => { setSelectedCompanions([]); setShowAccompany(false); setStep('confirmed'); }}
                      className="px-8 py-2 rounded-full text-sm font-bold text-ink border border-gray-300">
                NO
              </button>
              {/* YES — pumili ng accompanying visitors */}
              <button onClick={() => { setShowAccompany(false); setStep('additional'); }}
                      className="px-8 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALL RESULT modal (pagkatapos tawagan ang resident) */}
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
                        // TODO: i-note sa DB na DENIED
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