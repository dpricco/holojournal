// Audio playback utility for Gemini TTS output (supports audio/pcm, audio/wav, audio/mp3)

// Helper to convert 16-bit linear PCM to a valid WAV Blob
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Blob {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size for PCM
  view.setUint16(20, 1, true);  // AudioFormat 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  // Write PCM samples
  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmData, 44);

  return new Blob([wavBytes], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// A silent, 0.1-second WAV audio base64 snippet used to permanently unlock
// mobile browser audio context during a user's initial click interaction.
const SILENT_WAV_BASE64 = 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let isAudioUnlocked = false;

export const unlockAudioContext = () => {
  if (isAudioUnlocked) return;
  try {
    const audio = new Audio(`data:audio/wav;base64,${SILENT_WAV_BASE64}`);
    audio.play().then(() => {
      isAudioUnlocked = true;
    }).catch((e) => {
      console.warn('Silent audio unlock failed:', e);
    });
    
    // Also unlock Web Speech TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    console.error('Error unlocking audio context:', err);
  }
};

export const playBase64Audio = async (base64Audio: string, mimeType: string = 'audio/pcm;rate=24000'): Promise<void> => {
  try {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    let audioUrl: string;

    if (mimeType.includes('pcm') || (!mimeType.includes('mp3') && !mimeType.includes('wav') && !mimeType.includes('ogg'))) {
      // Extract sample rate if present (e.g. rate=24000)
      let sampleRate = 24000;
      const rateMatch = mimeType.match(/rate=(\d+)/);
      if (rateMatch && rateMatch[1]) {
        sampleRate = parseInt(rateMatch[1], 10);
      }
      const wavBlob = pcmToWav(bytes, sampleRate, 1);
      audioUrl = URL.createObjectURL(wavBlob);
    } else {
      const blob = new Blob([bytes], { type: mimeType });
      audioUrl = URL.createObjectURL(blob);
    }

    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (err) {
    console.error('Failed to play audio:', err);
    throw err;
  }
};

let cachedVoices: SpeechSynthesisVoice[] = [];

const getVoicesAsync = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise(resolve => {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      return resolve(voices);
    }
    
    // Voices not loaded yet, wait for the event
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      cachedVoices = voices;
      resolve(voices);
    };
    
    // Fallback in case the event never fires
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
};

export const playBrowserTTS = async (text: string): Promise<void> => {
  if (!('speechSynthesis' in window)) {
    console.warn('Browser TTS not supported');
    return Promise.resolve();
  }

  // Cancel any currently playing speech before starting
  window.speechSynthesis.cancel();

  // Ensure voices are loaded so we don't get stuck with the robotic default
  const voices = cachedVoices.length > 0 ? cachedVoices : await getVoicesAsync();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to pick a decent English voice, avoiding legacy robotic ones
    const isGoodVoice = (v: SpeechSynthesisVoice) => v.lang.startsWith('en-') && 
      (v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Siri'));
    
    const isOkayVoice = (v: SpeechSynthesisVoice) => v.lang.startsWith('en-') && 
      !v.name.includes('Desktop') && !v.name.includes('Zira') && !v.name.includes('David');

    const preferredVoice = voices.find(isGoodVoice) || voices.find(isOkayVoice) || voices.find(v => v.lang.startsWith('en-'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      console.error('Browser TTS error:', e);
      resolve(); // Resolve anyway so UI doesn't get stuck
    };

    window.speechSynthesis.speak(utterance);
  });
};
