import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioWaveform } from '../components/AudioWaveform';
import { AudioService } from '../services/audioService';
import { 
  saveChatSession, 
  loadChatSession, 
  clearChatSession, 
  type StoredChatSession 
} from '../utils/storage';
import { 
  getJournalSessionInitialContext, 
  createAndPopulateDoc, 
  appendToBiography 
} from '../services/driveDocsService';
import { 
  cleanSpeechTranscript, 
  generateJournalPrompt, 
  synthesizeJournalChat,
  speakText 
} from '../services/geminiService';
import { playBase64Audio, playBrowserTTS } from '../utils/audioPlayer';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  ArrowLeft, 
  Send, 
  RefreshCw,
  FileText,
  Volume2,
  VolumeX
} from 'lucide-react';

interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isPolished?: boolean;
  audioBase64?: string | null;
  mimeType?: string;
}

export const ActiveSession: React.FC = () => {
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [currentSpeech, setCurrentSpeech] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [showRecoverPrompt, setShowRecoverPrompt] = useState(false);

  // System context docs loaded from Google Drive
  const [sessionContext, setSessionContext] = useState<{
    workflowDoc: { name: string; id: string; text: string } | null;
    biographyDoc: { name: string; id: string; text: string } | null;
    promptingDoc: { name: string; id: string; text: string } | null;
    recentJournals: { name: string; text: string }[];
    combinedSystemInstruction: string;
  } | null>(null);

  const audioService = useRef(new AudioService());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ messages, currentSpeech, manualInput });
  const navigate = useNavigate();

  // Keep ref updated for 3-second auto-save interval
  useEffect(() => {
    stateRef.current = { messages, currentSpeech, manualInput };
  }, [messages, currentSpeech, manualInput]);

  useEffect(() => {
    // 1. Check for recoverable interrupted session
    const saved = loadChatSession();
    if (saved && !saved.isArchived && (saved.messages.length > 0 || (saved.currentInput && saved.currentInput.trim().length > 0))) {
      setShowRecoverPrompt(true);
    }

    // 2. Fetch system context from Google Drive
    setStatusMessage('ACCESSING DRIVE REPOSITORIES...');
    getJournalSessionInitialContext().then(ctx => {
      setSessionContext(ctx);
      setStatusMessage('');
    }).catch(err => {
      console.error('Error fetching drive initial context:', err);
      setStatusMessage('');
    });

    // 3. Web Speech API live stream
    audioService.current.onTranscriptUpdate = (text, isFinal) => {
      if (isFinal) {
        setCurrentSpeech(prev => prev ? prev + ' ' + text : text);
      }
    };

    // 4. Crash-Proof Auto-Save every 3 seconds to localStorage
    const interval = setInterval(() => {
      const current = stateRef.current;
      if (current.messages.length > 0 || current.currentSpeech.trim().length > 0 || current.manualInput.trim().length > 0) {
        const payload: StoredChatSession = {
          messages: current.messages.map(m => ({ role: m.role, text: m.text, timestamp: m.timestamp })),
          currentInput: current.currentSpeech + (current.manualInput ? '\n' + current.manualInput : ''),
          lastUpdated: Date.now()
        };
        saveChatSession(payload);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPolishing, isPrompting, isSynthesizing]);

  const handleRecover = (resume: boolean) => {
    if (resume) {
      const saved = loadChatSession();
      if (saved) {
        setMessages(saved.messages.map((m, idx) => ({
          id: `rec-${idx}`,
          role: m.role,
          text: m.text,
          timestamp: m.timestamp
        })));
        if (saved.currentInput) {
          setManualInput(saved.currentInput);
        }
      }
    } else {
      clearChatSession();
      audioService.current.clearBackup();
      setMessages([]);
      setCurrentSpeech('');
      setManualInput('');
    }
    setShowRecoverPrompt(false);
  };

  /**
   * Toggles audio recording. When stopping, runs Gemini Speech Cleaning
   * to strip out uhms, likes, pauses, stutters, and false starts before
   * inserting into the conversation transcript.
   */
  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setStatusMessage('FINALIZING AUDIO BUFFER...');
      
      // Wait 2 seconds to allow the final STT results to flush into state
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await audioService.current.stopRecording();

      // Fetch from stateRef to ensure we get late-arriving transcripts
      const rawNote = stateRef.current.currentSpeech.trim();
      if (!rawNote) {
        setStatusMessage('');
        return;
      }

      setIsPolishing(true);
      setStatusMessage('GEMINI STRIPPING FILLER WORDS & POLISHING AUDIO...');
      try {
        const cleaned = await cleanSpeechTranscript(rawNote);
        const newMsg: JournalMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: cleaned,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isPolished: true
        };
        setMessages(prev => [...prev, newMsg]);
        setCurrentSpeech('');
      } catch (err) {
        console.error('Failed to clean audio note:', err);
        const fallbackMsg: JournalMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: rawNote,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, fallbackMsg]);
        setCurrentSpeech('');
      } finally {
        setIsPolishing(false);
        setStatusMessage('');
      }
    } else {
      setCurrentSpeech('');
      await audioService.current.startRecording();
      setIsRecording(true);
    }
  };

  /**
   * Submits typed text into the conversation (also runs speech polishing if text looks conversational)
   */
  const handleAppendManualText = async () => {
    const textToSubmit = manualInput.trim();
    if (!textToSubmit) return;

    setManualInput('');
    const newMsg: JournalMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSubmit,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handlePlayAudio = async (msg: JournalMessage) => {
    if (isPlayingAudio) return;
    
    // If we already have the audio buffer, just play it
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

    // Otherwise, generate it on demand
    setIsPlayingAudio(true);
    try {
      const audio = await speakText(msg.text, 'Capella');
      if (audio) {
        // Update the message in state so we don't have to generate it again
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

  /**
   * Triggered by the [ PROMPT ] button:
   * Uses the prompting instructions from Holojournal-journalprompting-doc
   * to provide a poignant, introspective inquiry or prompt.
   */
  const handleRequestPrompt = async () => {
    if (isRecording) {
      await toggleRecording();
    }

    if (stateRef.current.messages.length === 0 && !stateRef.current.currentSpeech.trim() && !stateRef.current.manualInput.trim()) {
      alert('PLEASE RECORD OR INPUT AN INITIAL THOUGHT TO GENERATE A REFLECTIVE PROMPT.');
      return;
    }

    // If there is pending speech or manual input, submit it first
    let currentHistory = [...stateRef.current.messages];
    if (stateRef.current.manualInput.trim()) {
      const pending: JournalMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: stateRef.current.manualInput.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      currentHistory.push(pending);
      setMessages(currentHistory);
      setManualInput('');
    }

    setIsPrompting(true);
    setStatusMessage(voiceEnabled ? 'CONSULTING DIRECTIVE & SYNTHESIZING AUDIO...' : 'CONSULTING JOURNAL PROMPTING DIRECTIVE...');

    try {
      const promptingDirective = sessionContext?.promptingDoc?.text || '';
      const biographyContext = sessionContext?.biographyDoc?.text || '';

      const result = await generateJournalPrompt(
        currentHistory.map(m => ({ role: m.role, text: m.text })),
        promptingDirective,
        biographyContext,
        voiceEnabled,
        (status) => setStatusMessage(status)
      );

      const guideMsg: JournalMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, guideMsg]);

      if (result.audioBase64) {
        setIsPlayingAudio(true);
        try {
          await playBase64Audio(result.audioBase64, result.mimeType);
        } catch (audioErr) {
          console.error('Audio playback error:', audioErr);
        } finally {
          setIsPlayingAudio(false);
        }
      } else if (voiceEnabled) {
        setIsPlayingAudio(true);
        try {
          await playBrowserTTS(result.text);
        } finally {
          setIsPlayingAudio(false);
        }
      }
    } catch (err: any) {
      console.error('Error generating journal prompt:', err);
      alert(`COULD NOT RETRIEVE PROMPT: ${err.message || 'Network error'}`);
    } finally {
      setIsPrompting(false);
      setStatusMessage('');
    }
  };

  /**
   * Triggered by the [ SYNTHESIZE ] button:
   * Condenses and exports the multi-turn session into the structured Google Doc format.
   * Also appends any personal breakthrough to Holojournal-biography.
   */
  const handleSynthesizeSession = async () => {
    if (isRecording) {
      await audioService.current.stopRecording();
      setIsRecording(false);
    }

    // Include any trailing input
    let finalHistory = [...messages];
    if (manualInput.trim()) {
      finalHistory.push({
        id: Date.now().toString(),
        role: 'user',
        text: manualInput.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setMessages(finalHistory);
      setManualInput('');
    }

    if (finalHistory.length === 0) {
      alert('CANNOT SYNTHESIZE AN EMPTY LOG.');
      return;
    }

    setIsSynthesizing(true);
    setStatusMessage('ARCHIVING SESSION VIA GEMINI DIRECTIVES...');

    try {
      const systemInstruction = sessionContext?.combinedSystemInstruction || '';
      const structuredOutput = await synthesizeJournalChat(
        finalHistory.map(m => ({ role: m.role, text: m.text })),
        systemInstruction
      );

      if (!structuredOutput) {
        throw new Error('Synthesis model returned empty payload.');
      }

      setStatusMessage('CREATING GOOGLE DOC ARCHIVE...');
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '').substring(0, 4);
      const docTitle = `Holojournal-Journal-${dateStr}-${timeStr}`;

      let docText = `HOLOJOURNAL SESSION SUMMARY\nDATE: ${dateStr}\n\n`;
      docText += `=== RECENT HAPPENINGS & EVENTS ===\n${structuredOutput.recent_happenings_and_events || 'None'}\n\n`;
      docText += `=== HISTORICAL & BIOGRAPHICAL DETAILS ===\n${structuredOutput.historical_biographical_details || 'None'}\n\n`;
      docText += `=== EMOTIONAL & COGNITIVE RECORD ===\n${structuredOutput.emotional_and_cognitive_record || 'None'}\n\n`;
      
      docText += `\n--- RAW TRANSCRIPT ---\n\n`;
      finalHistory.forEach(msg => {
        const label = msg.role === 'user' ? 'USER' : 'JOURNAL GUIDE';
        docText += `[${msg.timestamp}] ${label}:\n${msg.text}\n\n`;
      });
      const createdDocId = await createAndPopulateDoc(docTitle, docText);

      if (createdDocId) {
        // Append biographical breakthrough if found
        if (structuredOutput.biographical_append && structuredOutput.biographical_append !== "None") {
          setStatusMessage('APPENDING TO MASTER BIOGRAPHY...');
          await appendToBiography(structuredOutput.biographical_append);
        }

        // Mark the local backup as archived instead of clearing it
        const currentBackup = loadChatSession();
        if (currentBackup) {
          currentBackup.isArchived = true;
          saveChatSession(currentBackup);
        }

        // Wipe local React buffer ONLY after verified Google Drive save, 
        // but LEAVE localStorage and IndexedDB backups intact as a fail-safe restore option!
        setMessages([]);
        setCurrentSpeech('');
        setManualInput('');
        
        alert(`SESSION ARCHIVED AND SAVED: ${docTitle}`);
        navigate('/');
      } else {
        alert('FAILED TO WRITE TO GOOGLE DOCS. LOCAL BUFFER PRESERVED.');
      }
    } catch (err: any) {
      alert(`FAILED TO ARCHIVE SESSION: ${err.message || 'Unknown Error'}`);
    } finally {
      setIsSynthesizing(false);
      setStatusMessage('');
    }
  };

  const handleDiscard = async () => {
    if (confirm('PURGE ENTIRE JOURNALING SESSION? ALL BUFFERS AND RECORDINGS WILL BE LOST.')) {
      if (isRecording) await audioService.current.stopRecording();
      clearChatSession();
      await audioService.current.clearBackup();
      navigate('/');
    }
  };

  if (showRecoverPrompt) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 flex-1 bg-gray-950 border-4 border-lcars-red rounded-3xl max-w-2xl mx-auto my-auto shadow-[0_0_25px_rgba(204,102,102,0.4)]">
        <h2 className="text-3xl text-lcars-red font-bold tracking-wider">UNSAVED SESSION DETECTED</h2>
        <p className="text-lcars-peach text-sm max-w-md">
          A prior interactive journaling chat was recovered in local browser storage. Would you like to resume your exploration or purge the buffer?
        </p>
        <div className="flex gap-4">
          <button 
            onClick={() => handleRecover(true)} 
            className="px-8 py-4 bg-lcars-orange text-black rounded-full font-bold text-xl hover:bg-lcars-yellow transition-all"
          >
            [RESUME]
          </button>
          <button 
            onClick={() => handleRecover(false)} 
            className="px-8 py-4 bg-lcars-red text-black rounded-full font-bold text-xl hover:bg-lcars-yellow transition-all"
          >
            [DISCARD]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* LCARS Header & Context Badges */}
      <div className="flex flex-wrap items-center justify-between border-b-4 border-lcars-orange pb-2 gap-2">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 bg-lcars-orange hover:bg-lcars-yellow text-black rounded-full transition-colors"
            title="Return to Hub"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lcars-orange text-2xl md:text-3xl font-bold tracking-wider">
              DAILY JOURNALING CHAT
            </h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {sessionContext?.workflowDoc ? (
                <a href={`https://docs.google.com/document/d/${sessionContext.workflowDoc.id}/edit`} target="_blank" rel="noreferrer" className="text-[10px] bg-lcars-orange/20 hover:bg-lcars-orange/40 text-lcars-orange px-2 py-0.5 rounded flex items-center space-x-1 transition-colors">
                  <FileText size={10} />
                  <span>{sessionContext.workflowDoc.name.replace('Holojournal-', '')}</span>
                </a>
              ) : (
                <span className="text-[10px] bg-lcars-orange/20 text-lcars-orange px-2 py-0.5 rounded flex items-center space-x-1"><FileText size={10} /><span>Workflow Directives</span></span>
              )}

              {sessionContext?.biographyDoc ? (
                <a href={`https://docs.google.com/document/d/${sessionContext.biographyDoc.id}/edit`} target="_blank" rel="noreferrer" className="text-[10px] bg-lcars-blue/20 hover:bg-lcars-blue/40 text-lcars-blue px-2 py-0.5 rounded flex items-center space-x-1 transition-colors">
                  <FileText size={10} />
                  <span>{sessionContext.biographyDoc.name.replace('Holojournal-', '')}</span>
                </a>
              ) : (
                <span className="text-[10px] bg-lcars-blue/20 text-lcars-blue px-2 py-0.5 rounded flex items-center space-x-1"><FileText size={10} /><span>Master Biography</span></span>
              )}

              {sessionContext?.promptingDoc ? (
                <a href={`https://docs.google.com/document/d/${sessionContext.promptingDoc.id}/edit`} target="_blank" rel="noreferrer" className="text-[10px] bg-lcars-purple/20 hover:bg-lcars-purple/40 text-lcars-purple px-2 py-0.5 rounded flex items-center space-x-1 transition-colors">
                  <FileText size={10} />
                  <span>{sessionContext.promptingDoc.name.replace('Holojournal-', '')}</span>
                </a>
              ) : (
                <span className="text-[10px] bg-lcars-purple/20 text-lcars-purple px-2 py-0.5 rounded flex items-center space-x-1"><FileText size={10} /><span>Prompting Guidelines</span></span>
              )}
            </div>
          </div>
        </div>

        {/* Live Audio indicator */}
        <div className="flex items-center space-x-2 text-xs">
          <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
          <span className="text-lcars-peach font-bold hidden sm:inline">
            {isRecording ? 'LISTENING & STREAMING' : 'AUDIO READY'}
          </span>
        </div>
      </div>

      {/* Multi-Turn Chat Conversation Window */}
      <div className="flex-1 bg-black p-5 border-l-4 border-lcars-orange rounded-r-2xl overflow-y-auto font-mono text-sm leading-relaxed space-y-4 max-h-[48vh] shadow-inner">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4 py-8">
            <div className="space-y-2">
              <span className="text-3xl">🎙️</span>
              <p className="text-lcars-peach text-base uppercase tracking-wider font-bold">
                BEGIN YOUR DAILY REFLECTION
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Tap [SEND VOICE NOTE] to speak your thoughts. Gemini will automatically strip filler words, format your reflections, and offer insightful prompts to explore deeper.
              </p>
            </div>
            {loadChatSession()?.messages.length ? (
              <button
                onClick={() => {
                  const saved = loadChatSession();
                  if (saved) {
                    setMessages(saved.messages.map((m, idx) => ({
                      id: `rec-${idx}`,
                      role: m.role,
                      text: m.text,
                      timestamp: m.timestamp
                    })));
                    if (saved.currentInput) {
                      setManualInput(saved.currentInput);
                    }
                  }
                }}
                className="mt-4 px-4 py-2 bg-gray-900 border border-lcars-orange text-lcars-orange hover:bg-gray-800 text-xs rounded-full transition-colors"
              >
                RESTORE PREVIOUS SESSION
              </button>
            ) : null}
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={msg.id}
                className={`p-4 rounded-xl border flex flex-col ${
                  isUser 
                    ? 'bg-gray-950 border-lcars-orange/70 text-amber-50 ml-6' 
                    : 'bg-gray-900 border-lcars-purple/80 text-lcars-peach mr-6 shadow-[0_0_12px_rgba(204,153,255,0.1)]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-gray-800 pb-1.5 mb-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className={`font-bold tracking-wider ${isUser ? 'text-lcars-orange' : 'text-lcars-purple'}`}>
                      {isUser ? 'YOUR REFLECTION' : 'HOLOJOURNAL PROMPT'}
                    </span>
                    {msg.isPolished && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                        SPEECH POLISHED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handlePlayAudio(msg)}
                        disabled={isPlayingAudio}
                        className={`p-1 rounded transition-colors ${isPlayingAudio ? 'text-lcars-orange animate-pulse' : 'text-lcars-peach hover:bg-gray-800'}`}
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

        {/* Live speech preview while mic is active */}
        {isRecording && (
          <div className="p-3 bg-red-950/40 border border-lcars-red/50 rounded-xl text-xs text-lcars-peach animate-pulse">
            <span className="text-lcars-red font-bold mr-2">LIVE VOCAL STREAM:</span>
            <span>{currentSpeech || 'Listening...'}</span>
          </div>
        )}

        {/* Status / Processing feedback indicator */}
        {(isPolishing || isPrompting || isSynthesizing || statusMessage) && (
          <div className="p-3 bg-gray-950 border border-lcars-yellow rounded-xl flex items-center space-x-2 text-lcars-yellow text-xs animate-pulse font-bold">
            <RefreshCw className="animate-spin text-lcars-yellow" size={16} />
            <span>{statusMessage || 'PROCESSING WITH GEMINI...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Manual Input Prompt Bar */}
      <div className="bg-gray-950 p-2.5 border-2 border-lcars-orange rounded-2xl flex items-center space-x-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAppendManualText()}
          placeholder="Type reflections or responses manually..."
          disabled={isPolishing || isPrompting || isSynthesizing}
          className="flex-1 bg-transparent text-amber-50 placeholder-gray-600 focus:outline-none text-sm font-mono px-3"
        />
        <button
          onClick={handleAppendManualText}
          disabled={!manualInput.trim() || isPolishing || isPrompting || isSynthesizing}
          className="px-4 py-2 bg-lcars-orange hover:bg-lcars-yellow disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold rounded-full text-xs transition-all flex items-center space-x-1"
        >
          <Send size={14} />
          <span>ADD</span>
        </button>
      </div>

      {/* Main Action Bar */}
      <div className="bg-black p-4 border-t-4 border-lcars-orange rounded-b-2xl flex flex-col md:flex-row items-center gap-4 justify-between">
        {/* Glowing audio waveform tied to mic activity */}
        <div className="w-full md:w-44 bg-gray-900 rounded-full p-2 flex items-center justify-center">
          <AudioWaveform isActive={isRecording} />
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

        {/* Requested Buttons: [ Send Voice Note ], [ Prompt ], [ Synthesize ], [ Discard ] */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-end items-center">
          {/* Voice Note Button */}
          <button 
            onClick={toggleRecording}
            disabled={isPolishing || isPrompting || isSynthesizing}
            className={`flex-1 md:flex-none px-6 py-3.5 rounded-full font-bold transition-all text-black text-sm flex items-center justify-center space-x-2 ${
              isRecording 
                ? 'bg-lcars-red hover:bg-lcars-yellow animate-pulse' 
                : 'bg-lcars-orange hover:bg-lcars-yellow'
            }`}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            <span>{isRecording ? 'HALT VOICE NOTE' : 'SEND VOICE NOTE'}</span>
          </button>

          {/* New [ PROMPT ] Button */}
          <button 
            onClick={handleRequestPrompt}
            disabled={isRecording || isPolishing || isPrompting || isSynthesizing || (messages.length === 0 && !manualInput.trim())}
            className="flex-1 md:flex-none px-6 py-3.5 bg-lcars-purple hover:bg-lcars-yellow disabled:bg-gray-800 disabled:text-gray-600 text-black rounded-full font-bold transition-all text-sm flex items-center justify-center space-x-2"
            title="Generate deeper insight or reflective inquiry using the journal prompting instructions"
          >
            <Sparkles size={18} />
            <span>{isPrompting ? 'PROMPTING...' : 'PROMPT'}</span>
          </button>

          {/* New [ CONCLUDE AND ARCHIVE ] Button */}
          <button 
            onClick={handleSynthesizeSession}
            disabled={isRecording || isPolishing || isPrompting || isSynthesizing || messages.length === 0}
            className="flex-1 md:flex-none px-6 py-3.5 bg-lcars-blue hover:bg-lcars-yellow disabled:bg-gray-800 disabled:text-gray-600 text-black rounded-full font-bold transition-all text-sm flex items-center justify-center space-x-2"
            title="Summarize and archive chat into a structured Google Doc"
          >
            <CheckCircle2 size={18} />
            {isSynthesizing ? (
              <span>ARCHIVING...</span>
            ) : (
              <>
                <span className="hidden sm:inline">CONCLUDE & ARCHIVE</span>
                <span className="sm:hidden">ARCHIVE</span>
              </>
            )}
          </button>

          {/* Discard Button */}
          <button 
            onClick={handleDiscard}
            disabled={isPolishing || isPrompting || isSynthesizing}
            className="px-4 py-3.5 bg-lcars-red hover:bg-lcars-yellow text-black rounded-full transition-all font-bold text-sm flex items-center justify-center space-x-1"
            title="Purge current session buffer"
          >
            <Trash2 size={16} />
            <span>DISCARD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
