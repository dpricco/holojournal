import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { loadGapiAndAuthenticate } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export const WelcomeSettings: React.FC = () => {
  const { setGeminiApiKey, setGoogleClientId, geminiApiKey, googleClientId, isAuthenticated } = useAppStore();
  const [geminiKey, setGeminiKey] = useState(geminiApiKey || '');
  const [googleId, setGoogleId] = useState(googleClientId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    setGeminiApiKey(geminiKey);
    setGoogleClientId(googleId);

    try {
      const success = await loadGapiAndAuthenticate();
      if (success) {
        navigate('/');
      } else {
        setError('AUTH FAILED. CHECK CLIENT ID.');
      }
    } catch (err: any) {
      setError(err?.message || 'FAILED TO AUTHENTICATE WITH DATABANKS.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 max-w-2xl">
      <h2 className="text-lcars-blue text-3xl border-b-4 border-lcars-blue pb-2 mb-6">SYSTEM CONFIGURATION</h2>
      
      <p className="text-lcars-peach text-lg mb-8 uppercase tracking-widest">
        ENTER CREDENTIALS TO ACCESS HOLODECK DATABANKS. DATA STORED LOCALLY.
      </p>

      <form onSubmit={handleConnect} className="space-y-6">
        <div className="flex flex-col">
          <label className="text-xl mb-2 text-lcars-orange">GEMINI API KEY</label>
          <input 
            type="password" 
            required
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="bg-black border-2 border-lcars-orange rounded-full p-4 text-lcars-orange text-lg focus:outline-none focus:border-lcars-yellow"
            placeholder="AIzaSy..."
          />
        </div>
        
        <div className="flex flex-col">
          <label className="text-xl mb-2 text-lcars-orange">GOOGLE OAUTH CLIENT ID</label>
          <input 
            type="text" 
            required
            value={googleId}
            onChange={(e) => setGoogleId(e.target.value)}
            className="bg-black border-2 border-lcars-orange rounded-full p-4 text-lcars-orange text-lg focus:outline-none focus:border-lcars-yellow"
            placeholder="12345-abcde.apps.googleusercontent.com"
          />
        </div>
        
        {error && <p className="text-lcars-red text-xl font-bold bg-black p-2 border-l-4 border-lcars-red">{error}</p>}
        
        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-lcars-red hover:bg-lcars-yellow text-black font-bold text-2xl py-4 px-12 rounded-l-full transition-colors"
          >
            {loading ? 'INITIALIZING...' : isAuthenticated ? 'RECONNECT' : 'INITIALIZE'}
          </button>
        </div>
      </form>
    </div>
  );
};
