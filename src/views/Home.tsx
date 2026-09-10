import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { loadGapiAndAuthenticate } from '../services/authService';
import { getJournalEntriesCount } from '../services/driveDocsService';

export const Home: React.FC = () => {
  const { isAuthenticated, googleClientId } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      if (googleClientId) {
        loadGapiAndAuthenticate().catch(() => navigate('/settings'));
      } else {
        navigate('/settings');
      }
    }
  }, [isAuthenticated, googleClientId, navigate]);

  if (!isAuthenticated) return <div className="text-lcars-blue text-2xl p-8">AUTHORIZING...</div>;

  const handleStartJournaling = async () => {
    try {
      const count = await getJournalEntriesCount();
      if (count === 0) {
        navigate('/onboarding');
      } else {
        navigate('/session');
      }
    } catch {
      navigate('/session');
    }
  };

  return (
    <div className="flex flex-col flex-1 space-y-4 max-w-3xl">
      <h2 className="text-lcars-blue text-3xl border-b-4 border-lcars-blue pb-2 mb-6">SELECT PROGRAM</h2>
      
      <button 
        onClick={handleStartJournaling}
        className="h-20 w-full bg-lcars-orange hover:bg-lcars-yellow transition-colors rounded-l-full flex justify-between items-center px-8 cursor-pointer"
      >
        <span className="text-black font-bold text-3xl">DAILY JOURNALING</span>
        <span className="text-black font-bold text-xl tracking-widest">01</span>
      </button>

      <button 
        onClick={() => navigate('/council')}
        className="h-20 w-[90%] bg-lcars-purple hover:bg-lcars-yellow transition-colors rounded-l-full flex justify-between items-center px-8 cursor-pointer"
      >
        <span className="text-black font-bold text-3xl">THE COUNCIL</span>
        <span className="text-black font-bold text-xl tracking-widest">02</span>
      </button>

      <button 
        onClick={() => navigate('/synthesis')}
        className="h-20 w-[80%] bg-lcars-blue hover:bg-lcars-yellow transition-colors rounded-l-full flex justify-between items-center px-8 cursor-pointer"
      >
        <span className="text-black font-bold text-3xl">PERIODIC SYNTHESIS</span>
        <span className="text-black font-bold text-xl tracking-widest">03</span>
      </button>
    </div>
  );
};
