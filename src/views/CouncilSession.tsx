import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CouncilAvatar, COUNCIL_PERSONAS, type PersonaInfo } from '../components/CouncilAvatars';
import { AudioWaveform } from '../components/AudioWaveform';
import { AudioService } from '../services/audioService';
import { getLatestSystemDocsContext, createAndPopulateDoc } from '../services/driveDocsService';
import { getCouncilResponse, synthesizeCouncilChat } from '../services/geminiService';
import { playBase64Audio, playBrowserTTS, unlockAudioContext } from '../utils/audioPlayer';
import { Volume2, VolumeX, Send, RefreshCw, Save, Trash2, ArrowLeft } from 'lucide-react';

interface CouncilMessage {
  id: string;
  sender: string; // 'USER' or Persona name
  text: string;
  audioBase64?: string | null;
  mimeType?: string;
  timestamp: string;
}

const COUNCIL_BACKUP_KEY = 'holojournal_council_backup';

export const CouncilSession: React.FC = () => {
  const [selectedPersona, setSelectedPersona] = useState<PersonaInfo>(COUNCIL_PERSONAS[0]); // default Picard
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [systemContext, setSystemContext] = useState<{ combinedText: string; loadedDocs: {name: string; id: string}[] } | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showRecoverPrompt, setShowRecoverPrompt] = useState(false);

  const audioService = useRef<AudioService | null>(null);
  if (!audioService.current) {
    audioService.current = new AudioService();
  }
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ messages, inputText, selectedPersona });
  const navigate = useNavigate();

  useEffect(() => {
    stateRef.current = { messages, inputText, selectedPersona };
  }, [messages, inputText, selectedPersona]);

  useEffect(() => {
    // 1. Check for recoverable interrupted session
    const savedData = localStorage.getItem(COUNCIL_BACKUP_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (!parsed.isArchived && (parsed.messages?.length > 0 || parsed.inputText?.length > 0)) {
          setShowRecoverPrompt(true);
        }
      } catch (e) {
        console.error('Failed to parse council backup', e);
      }
    }

    // 2. Load system docs context
    getLatestSystemDocsContext().then(context => setSystemContext(context));

    audioService.current!.onTranscriptUpdate = (text) => {
      setInputText(text);
    };

    // 3. Setup auto-save interval
    const backupInterval = setInterval(() => {
      // Retain the isArchived flag if it exists, so we don't accidentally wipe it
      const currentSavedData = localStorage.getItem(COUNCIL_BACKUP_KEY);
      let isArchived = false;
      if (currentSavedData) {
        try {
          isArchived = JSON.parse(currentSavedData).isArchived || false;
        } catch (e) {}
      }

      localStorage.setItem(COUNCIL_BACKUP_KEY, JSON.stringify({
        messages: stateRef.current.messages,
        inputText: stateRef.current.inputText,
        selectedPersona: stateRef.current.selectedPersona,
        isArchived: isArchived
      }));
    }, 3000);

    return () => {
      clearInterval(backupInterval);
      audioService.current?.stopRecording();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isConsulting]);

  const handleRecoverSession = () => {
    const savedData = localStorage.getItem(COUNCIL_BACKUP_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.messages) setMessages(parsed.messages);
        if (parsed.inputText) setInputText(parsed.inputText);
        if (parsed.selectedPersona) setSelectedPersona(parsed.selectedPersona);
      } catch (e) {}
    }
    setShowRecoverPrompt(false);
  };

  const handleDiscardRecovery = () => {
    localStorage.removeItem(COUNCIL_BACKUP_KEY);
    setShowRecoverPrompt(false);
  };

  const toggleRecording = async () => {
    unlockAudioContext();
    if (isRecording) {
      setIsRecording(false);
      setStatusMessage('FINALIZING AUDIO BUFFER...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await audioService.current!.stopRecording();
      setStatusMessage('');
    } else {
      await audioService.current!.startRecording();
      setIsRecording(true);
    }
  };

  const handleSendMessage = async (personaToAsk: PersonaInfo = selectedPersona) => {
    unlockAudioContext();
    if (isConsulting || !systemContext) return;

    if (isRecording) {
      setIsRecording(false);
      setStatusMessage('FINALIZING AUDIO BUFFER...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await audioService.current!.stopRecording();
    }

    const textToSend = stateRef.current.inputText.trim();
    if (!textToSend) {
      setStatusMessage('');
      return;
    }

    const userMsg: CouncilMessage = {
      id: Date.now().toString(),
      sender: 'USER',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsConsulting(true);

    try {
      const response = await getCouncilResponse(
        systemContext.combinedText, 
        personaToAsk.name, 
        textToSend, 
        voiceEnabled,
        (status) => setStatusMessage(status)
      );

      const councilMsg: CouncilMessage = {
        id: (Date.now() + 1).toString(),
        sender: personaToAsk.name,
        text: response.text || `[Audio Transmission from ${personaToAsk.name}]`,
        audioBase64: response.audioBase64,
        mimeType: response.mimeType,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, councilMsg]);

      // Play audio automatically if available
      if (response.audioBase64) {
        setIsPlayingAudio(true);
        try {
          await playBase64Audio(response.audioBase64, response.mimeType);
        } catch (audioErr) {
          console.error('Audio playback error:', audioErr);
        } finally {
          setIsPlayingAudio(false);
        }
      } else if (voiceEnabled) {
        setIsPlayingAudio(true);
        try {
          await playBrowserTTS(response.text || '');
        } finally {
          setIsPlayingAudio(false);
        }
      }
    } catch (err: any) {
      console.error('Council query failed:', err);
      const errorMsg: CouncilMessage = {
        id: (Date.now() + 1).toString(),
        sender: personaToAsk.name,
        text: `Subspace interference detected: ${err.message || 'Unable to establish link.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsConsulting(false);
    }
  };

  const handlePlayAudio = async (msg: CouncilMessage) => {
    unlockAudioContext();
    if (isPlayingAudio) return;
    
    if (msg.audioBase64) {
      setIsPlayingAudio(true);
      try {
        await playBase64Audio(msg.audioBase64, msg.mimeType || 'audio/pcm;rate=24000');
      } catch (err) {
        console.error('Error playing message audio:', err);
      } finally {
        setIsPlayingAudio(false);
      }
      return;
    }

    // On-demand synthesis
    setIsPlayingAudio(true);
    try {
      const { PERSONA_VOICE_MAP } = await import('../services/geminiService');
      const voiceName = PERSONA_VOICE_MAP[msg.sender] || 'Puck';
      const audio = await (await import('../services/geminiService')).speakText(msg.text, voiceName);
      if (audio) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, audioBase64: audio.audioBase64, mimeType: audio.mimeType } : m));
        await playBase64Audio(audio.audioBase64, audio.mimeType);
      } else {
        await playBrowserTTS(msg.text);
      }
    } catch (e: any) {
      console.warn(`TTS API failed (${e.message}). Falling back to browser TTS.`);
      await playBrowserTTS(msg.text);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleFinishAndSave = async () => {
    if (messages.length === 0) {
      alert('NO TRANSMISSIONS TO ARCHIVE.');
      return;
    }

    if (confirm('ARCHIVE THIS COUNCIL CHAMBER SESSION TO DATABANKS?')) {
      setIsConsulting(true);
      setStatusMessage('SYNTHESIZING COUNCIL RECORD...');

      try {
        const dateStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '').substring(0, 4);
        const title = `Holojournal-Council-${dateStr}-${timeStr}`;

        const summary = await synthesizeCouncilChat(messages, systemContext?.combinedText || '');
        const transcriptBody = messages.map(m => `[${m.timestamp}] ${m.sender}: ${m.text}`).join('\n\n');
        const docContent = `HOLOJOURNAL COUNCIL SESSION\nDATE: ${dateStr}\nPARTICIPANTS: ${Array.from(new Set(messages.map(m => m.sender))).join(', ')}\n\n=== COUNCIL SUMMARY ===\n\n${summary}\n\n--- RAW TRANSCRIPT ---\n\n${transcriptBody}`;

        setStatusMessage('CREATING GOOGLE DOC ARCHIVE...');
        const docId = await createAndPopulateDoc(title, docContent);
        if (docId) {
          // Mark the localStorage backup as archived instead of clearing it
          const savedData = localStorage.getItem(COUNCIL_BACKUP_KEY);
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              parsed.isArchived = true;
              localStorage.setItem(COUNCIL_BACKUP_KEY, JSON.stringify(parsed));
            } catch (e) {}
          }

          // Clear React state, but LEAVE localStorage backup intact as a fail-safe restore option!
          setMessages([]);
          setInputText('');
          
          alert(`COUNCIL SESSION ARCHIVED: ${title}`);
          navigate('/');
        }
      } catch (err: any) {
        alert(`FAILED TO ARCHIVE SESSION TO GOOGLE DOCS: ${err.message || 'Unknown Error'}`);
      } finally {
        setIsConsulting(false);
        setStatusMessage('');
      }
    }
  };

  const handleDiscard = () => {
    if (confirm('PURGE CURRENT COUNCIL CHAMBER BUFFER? ALL LOGS WILL BE LOST.')) {
      setMessages([]);
      setInputText('');
      localStorage.removeItem(COUNCIL_BACKUP_KEY);
      navigate('/');
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      
      {/* Recovery Prompt */}
      {showRecoverPrompt && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-gray-900 border-2 border-lcars-purple p-8 rounded-xl max-w-md w-full text-center space-y-6">
            <h2 className="text-lcars-purple text-2xl font-bold tracking-widest">UNSAVED LOG DETECTED</h2>
            <p className="text-amber-50">A previous Council session was interrupted. Restore from local databanks?</p>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={handleRecoverSession}
                className="w-full py-4 bg-lcars-purple text-black font-bold rounded hover:bg-lcars-yellow transition-colors"
              >
                RESUME SESSION
              </button>
              <button 
                onClick={handleDiscardRecovery}
                className="w-full py-4 bg-gray-800 text-gray-400 font-bold rounded hover:bg-lcars-red hover:text-black transition-colors"
              >
                DISCARD LOGS
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full space-y-4">
      {/* Header bar */}
      <div className="flex flex-col border-b-4 border-lcars-purple pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/')} 
              className="p-2 bg-lcars-purple hover:bg-lcars-yellow text-black rounded-full transition-colors"
              title="Return to Hub"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-lcars-purple text-3xl font-bold tracking-wider">THE COUNCIL CHAMBERS</h2>
              <p className="text-lcars-orange text-sm tracking-widest uppercase">
                {statusMessage || 'AWAITING TRANSMISSION...'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => getLatestSystemDocsContext().then(setSystemContext)}
            disabled={!systemContext && statusMessage !== ''}
            className="flex items-center space-x-2 text-lcars-purple hover:text-lcars-yellow transition-colors disabled:opacity-50"
            title="Refresh System Directives"
          >
            <RefreshCw size={20} className={statusMessage ? 'animate-spin' : ''} />
            <span className="hidden sm:inline font-bold tracking-wider">SYNC DIRECTIVES</span>
          </button>
        </div>

        {/* Loaded Docs Display */}
        {systemContext && systemContext.loadedDocs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] sm:text-xs">
            <span className="text-gray-500 uppercase tracking-widest mr-1 flex items-center">Loaded Directives:</span>
            {systemContext.loadedDocs.map(doc => (
              <a 
                key={doc.id}
                href={`https://docs.google.com/document/d/${doc.id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-900 border border-lcars-purple text-lcars-purple px-2 py-0.5 rounded hover:bg-lcars-purple hover:text-black transition-colors"
                title="Open Document in Google Drive"
              >
                {doc.name.replace('Holojournal-', '')}
              </a>
            ))}
          </div>
        )}
      </div>


      {/* Council Avatars Selector Strip */}
      <div className="bg-gray-950 p-4 border-2 border-lcars-purple rounded-2xl">
        <div className="flex items-center justify-between overflow-x-auto pb-2 gap-3 scrollbar-thin">
          {COUNCIL_PERSONAS.map((persona) => {
            const isSelected = selectedPersona.name === persona.name;
            return (
              <div 
                key={persona.name}
                onClick={() => setSelectedPersona(persona)}
                className={`flex flex-col items-center p-2 rounded-xl cursor-pointer transition-all min-w-[90px] ${
                  isSelected ? 'bg-lcars-purple/30 border-2 border-lcars-yellow scale-105' : 'hover:bg-gray-900 border border-transparent'
                }`}
              >
                <CouncilAvatar name={persona.name} size="sm" selected={isSelected} />
                <span className={`text-xs font-bold mt-1 tracking-wider ${isSelected ? 'text-lcars-yellow' : 'text-lcars-peach'}`}>
                  {persona.name}
                </span>
                <span className="text-[10px] text-gray-400 text-center leading-tight mt-1 min-h-[28px] max-w-[90px]">
                  {persona.modality}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected Persona Detail Banner */}
        <div className="mt-2 pt-2 border-t border-gray-800 flex flex-col md:flex-row md:items-center justify-between text-xs gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-lcars-yellow text-black font-bold px-2 py-0.5 rounded text-[10px] whitespace-nowrap">ACTIVE ADVISOR</span>
            <span className="text-lcars-orange font-bold text-sm">{selectedPersona.name}</span>
            <span className="text-gray-400 hidden sm:inline">— {selectedPersona.title}</span>
            <span className="text-lcars-purple border border-lcars-purple/30 bg-lcars-purple/10 px-1.5 py-0.5 rounded text-[10px]">
              {selectedPersona.modality}
            </span>
          </div>
          <div className="text-lcars-peach italic truncate w-full md:max-w-md text-right">
            "{selectedPersona.description}"
          </div>
        </div>
      </div>

      {/* Conversation Terminal */}
      <div className="flex-1 bg-black p-6 border-l-4 border-lcars-purple rounded-r-xl overflow-y-auto space-y-4 font-mono text-sm leading-relaxed max-h-[50vh]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 space-y-4">
            <div className="space-y-2">
              <span className="text-3xl">🏛️</span>
              <p className="text-lcars-peach uppercase tracking-widest text-base">
                THE COUNCIL CHAMBER IS OPEN.
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Speak or submit an inquiry to receive counsel from {selectedPersona.name}.
              </p>
            </div>
            {(() => {
              const saved = localStorage.getItem(COUNCIL_BACKUP_KEY);
              if (!saved) return null;
              try {
                const parsed = JSON.parse(saved);
                if (parsed.messages?.length > 0) {
                  return (
                    <button
                      onClick={() => handleRecoverSession()}
                      className="mt-4 px-4 py-2 bg-gray-900 border border-lcars-purple text-lcars-purple hover:bg-gray-800 text-xs rounded-full transition-colors"
                    >
                      RESTORE PREVIOUS SESSION
                    </button>
                  );
                }
              } catch (e) {}
              return null;
            })()}
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'USER';
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col p-4 rounded-xl border ${
                  isUser 
                    ? 'bg-gray-900/90 border-lcars-orange text-amber-50 ml-8' 
                    : 'bg-gray-950 border-lcars-purple text-lcars-peach mr-8 shadow-[0_0_10px_rgba(204,153,255,0.15)]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`font-bold tracking-wider ${isUser ? 'text-lcars-orange' : 'text-lcars-purple'}`}>
                      {msg.sender}
                    </span>
                    {!isUser && msg.audioBase64 && (
                      <span className="text-[10px] bg-lcars-purple/20 text-lcars-purple px-1.5 py-0.5 rounded">
                        SYNTHETIC AUDIO
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handlePlayAudio(msg)}
                        disabled={isPlayingAudio}
                        className={`p-1 rounded transition-colors ${isPlayingAudio ? 'text-lcars-orange animate-pulse' : 'text-lcars-yellow hover:bg-gray-800'}`}
                        title={msg.audioBase64 ? "Replay Spoken Audio" : "Generate Voice Audio"}
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                  {msg.text}
                </div>
              </div>
            );
          })
        )}

        {isConsulting && (
          <div className="flex items-center space-x-3 p-4 bg-gray-950 border border-lcars-yellow rounded-xl animate-pulse">
            <RefreshCw className="animate-spin text-lcars-yellow" size={20} />
            <span className="text-lcars-yellow font-bold text-sm tracking-widest">
              {statusMessage || `${selectedPersona.name.toUpperCase()} IS FORMULATING COUNSEL...`}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar & Controls */}
      <div className="bg-black p-4 border-t-4 border-lcars-purple flex flex-col items-center gap-4">
        
        {/* Row 1: Input and voice toggle */}
        <div className="flex flex-col md:flex-row w-full items-center gap-3">
          {/* Waveform indicator */}
          <div className="w-full md:w-36 bg-gray-900 rounded-full p-2 flex items-center justify-center">
            <AudioWaveform isActive={isRecording} />
          </div>

          {/* Input box */}
          <div className="flex-1 w-full flex items-center bg-gray-900 border-2 border-lcars-purple rounded-full px-4 py-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Ask ${selectedPersona.name}...`}
              disabled={isConsulting}
              className="flex-1 bg-transparent text-amber-50 placeholder-gray-500 focus:outline-none text-base"
            />
          </div>

          {/* Voice Response Toggle */}
          <div className="flex items-center space-x-2 bg-gray-900 rounded-full px-4 py-2 border border-gray-800">
            <span className="text-gray-400 text-xs font-bold tracking-wider">VOICE</span>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                voiceEnabled ? 'bg-lcars-purple' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-black transition-transform ${
                  voiceEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            {voiceEnabled ? (
              <Volume2 size={14} className="text-lcars-purple" />
            ) : (
              <VolumeX size={14} className="text-gray-500" />
            )}
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            onClick={toggleRecording}
            disabled={isConsulting}
            className={`flex-1 md:flex-none px-6 py-3.5 rounded-full font-bold text-black transition-all flex items-center justify-center space-x-2 ${
              isRecording ? 'bg-lcars-red hover:bg-lcars-yellow animate-pulse' : 'bg-lcars-orange hover:bg-lcars-yellow'
            }`}
          >
            <span>{isRecording ? 'HALT MIC' : 'SPEAK'}</span>
          </button>

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isConsulting}
            className="flex-1 md:flex-none px-8 py-3.5 bg-lcars-purple hover:bg-lcars-yellow disabled:bg-gray-800 disabled:text-gray-600 text-black rounded-full font-bold transition-all flex items-center justify-center space-x-2"
          >
            <Send size={18} />
            <span>TRANSMIT</span>
          </button>

          <button
            onClick={handleFinishAndSave}
            disabled={messages.length === 0 || isConsulting}
            className="flex-1 md:flex-none px-6 py-3.5 bg-lcars-blue hover:bg-lcars-yellow disabled:bg-gray-800 disabled:text-gray-600 text-black rounded-full font-bold transition-all text-sm flex items-center justify-center space-x-2"
            title="Archive Council Chamber session to databanks"
          >
            <Save size={18} />
            <span className="hidden sm:inline">CONCLUDE & ARCHIVE</span>
            <span className="sm:hidden">ARCHIVE</span>
          </button>

          <button
            onClick={handleDiscard}
            disabled={isConsulting}
            className="px-4 py-3.5 bg-lcars-red hover:bg-lcars-yellow text-black rounded-full transition-all font-bold text-sm flex items-center justify-center space-x-1"
            title="Purge current Council Chamber buffer"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">PURGE</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};
