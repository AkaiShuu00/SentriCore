import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const teal = '#0F6E6E';

// Matched registration (sample — papalitan ng backend lookup after)
const MATCHED = {
  regType: 'Single',
  resident: 'Marina Lewis',
  address: '34 Cancer St.',
  visitor: 'Jon Snow',
  purpose: 'Board night',
  expectedDate: '06/02/2026',
};

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
              <button onClick={() => setStep('reading')}
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
          <div className="flex flex-col items-center justify-center py-24">
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
                <button onClick={() => alert('Manual search')}
                        className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                  MANUAL SEARCH
                </button>
                <button onClick={() => { alert('Entry confirmed! ✅'); navigate('/guard-home'); }}
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
      </div>
    </div>
  );
}