import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeBiographyAndFirstEntry } from '../services/driveDocsService';
import { Sparkles, ArrowRight, ShieldCheck, BookOpen } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const [backgroundHistory, setBackgroundHistory] = useState('');
  const [coreValues, setCoreValues] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const navigate = useNavigate();

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backgroundHistory.trim() || !coreValues.trim()) {
      alert('PLEASE PROVIDE BOTH BACKGROUND CONTEXT AND CORE VALUES FOR CALIBRATION.');
      return;
    }

    setIsInitializing(true);
    try {
      const { bioDocId, firstEntryId } = await initializeBiographyAndFirstEntry(
        backgroundHistory,
        coreValues
      );

      if (bioDocId || firstEntryId) {
        alert('HOLODECK CALIBRATION COMPLETE. INAUGURAL LOG ESTABLISHED.');
        navigate('/session');
      } else {
        alert('INITIALIZATION FAILED. PLEASE VERIFY GOOGLE DRIVE PERMISSIONS.');
      }
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      alert(`SYSTEM ERROR: ${err.message || 'Calibration failure'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 max-w-3xl space-y-6">
      {/* Header */}
      <div className="border-b-4 border-lcars-yellow pb-3">
        <div className="flex items-center space-x-3">
          <Sparkles className="text-lcars-yellow" size={28} />
          <h2 className="text-lcars-yellow text-3xl font-bold tracking-widest">
            COLD-START CALIBRATION PROTOCOL
          </h2>
        </div>
        <p className="text-lcars-peach text-sm mt-1">
          ZERO PRIOR LOGS DETECTED IN DATABANKS // INITIAL BIOGRAPHICAL ANCHOR REQUIRED
        </p>
      </div>

      {/* Progress Pill Bar */}
      <div className="flex space-x-2">
        <button
          onClick={() => setStep(1)}
          className={`flex-1 py-2 px-4 rounded-l-full font-bold text-sm tracking-wider flex items-center justify-between ${
            step === 1 ? 'bg-lcars-orange text-black' : 'bg-gray-800 text-gray-400'
          }`}
        >
          <span>STAGE 01: BIOGRAPHICAL HISTORY</span>
          <BookOpen size={16} />
        </button>
        <button
          onClick={() => setStep(2)}
          className={`flex-1 py-2 px-4 rounded-r-full font-bold text-sm tracking-wider flex items-center justify-between ${
            step === 2 ? 'bg-lcars-blue text-black' : 'bg-gray-800 text-gray-400'
          }`}
        >
          <span>STAGE 02: CORE VALUES & CODE</span>
          <ShieldCheck size={16} />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleCompleteOnboarding} className="flex-1 flex flex-col space-y-6">
        {step === 1 ? (
          <div className="bg-gray-950 p-6 border-l-4 border-lcars-orange rounded-r-2xl space-y-4 flex-1">
            <h3 className="text-lcars-orange text-xl font-bold">STAGE 01: ORIGIN & CONTEXT</h3>
            <p className="text-lcars-peach text-sm leading-relaxed">
              To anchor the Council's wisdom and ensure accurate continuity in your daily syntheses, provide a concise summary of your current life trajectory, key life chapters, current responsibilities, and ongoing challenges.
            </p>
            <textarea
              rows={8}
              value={backgroundHistory}
              onChange={(e) => setBackgroundHistory(e.target.value)}
              placeholder="e.g. Current career path, major relationships, defining past turning points, present ambitions, key dilemmas..."
              className="w-full bg-black border-2 border-lcars-orange/60 rounded-xl p-4 text-amber-50 placeholder-gray-600 focus:outline-none focus:border-lcars-yellow font-mono text-sm leading-relaxed"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-8 py-3 bg-lcars-orange hover:bg-lcars-yellow text-black font-bold rounded-full flex items-center space-x-2 transition-all"
              >
                <span>PROCEED TO CORE VALUES</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-950 p-6 border-l-4 border-lcars-blue rounded-r-2xl space-y-4 flex-1">
            <h3 className="text-lcars-blue text-xl font-bold">STAGE 02: CORE VALUES & ETHICAL DIRECTIVES</h3>
            <p className="text-lcars-peach text-sm leading-relaxed">
              What principles guide your decisions when faced with pressure? What are your non-negotiables, personal virtues (e.g., courage, honesty, intellectual rigor, family devotion), and ethical compass?
            </p>
            <textarea
              rows={8}
              value={coreValues}
              onChange={(e) => setCoreValues(e.target.value)}
              placeholder="e.g. 1. Deep intellectual honesty\n2. Loyalty to loved ones\n3. Relentless curiosity\n4. Grace in conflict..."
              className="w-full bg-black border-2 border-lcars-blue/60 rounded-xl p-4 text-amber-50 placeholder-gray-600 focus:outline-none focus:border-lcars-yellow font-mono text-sm leading-relaxed"
            />
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-full transition-all text-sm"
              >
                BACK TO STAGE 01
              </button>

              <button
                type="submit"
                disabled={isInitializing}
                className="px-10 py-4 bg-lcars-yellow hover:bg-lcars-orange text-black font-bold rounded-full flex items-center space-x-2 transition-all text-lg disabled:opacity-50"
              >
                {isInitializing ? (
                  <span>ENGAGING CALIBRATION...</span>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>INITIALIZE BIOGRAPHY & COMMENCE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
