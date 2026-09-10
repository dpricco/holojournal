import { GoogleGenAI } from '@google/genai';
import { useAppStore } from '../store/useAppStore';

// Voice assignments for each Council persona — listed in CouncilAvatars.tsx
export const PERSONA_VOICE_MAP: Record<string, string> = {
  'Picard': 'Puck',     // Upbeat yet authoritative
  'Troi': 'Aoede',      // Breezy and warm
  'Data': 'Charon',     // Informative and precise
  'Riker': 'Fenrir',    // Excitable and confident
  'Guinan': 'Kore',     // Firm, wise, mysterious
  'Seven': 'Iapetus',   // Clear and direct
  'Janeway': 'Alnilam', // Firm and commanding
  'Kira': 'Orus',       // Firm and passionate
  'Neelix': 'Sadachbia',// Lively and cheerful
};

// Voice for the Holojournal daily journaling guide
const JOURNAL_GUIDE_VOICE = 'Capella';

// Dedicated TTS model (Interactions API, audio-only output)
const TTS_MODEL = 'gemini-3.1-flash-tts-preview';

// Current models per Google Interactions API Guidelines
const INTERACTION_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
];

const LEGACY_GENERATE_CONTENT_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-pro-exp-02-05',
];

const getClient = () => {
  const apiKey = useAppStore.getState().geminiApiKey;
  if (!apiKey) throw new Error('Gemini API Key missing');
  return new GoogleGenAI({ apiKey });
};

interface UnifiedGenOptions {
  prompt: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  responseModalities?: string[];
  speechConfig?: any;
}

interface UnifiedGenResult {
  text: string;
  audioBase64?: string | null;
  mimeType?: string;
}

/**
 * Unified execution engine supporting both modern Interactions API (Gemini 3.x)
 * and generateContent API with automatic fallback.
 */
export const callGemini = async (options: UnifiedGenOptions): Promise<UnifiedGenResult> => {
  const ai = getClient();
  let lastError: any = null;

  // 1. Try modern Interactions API first for Gemini 3.x models
  if (ai.interactions && typeof ai.interactions.create === 'function') {
    for (const model of INTERACTION_MODELS) {
      try {
        console.log(`Holojournal: Invoking Interactions API [${model}]...`);
        let fullInput = options.prompt;
        if (options.jsonMode) {
          fullInput += `\n\nCRITICAL: Return strictly valid JSON conforming to the requested schema. Do not enclose in markdown blocks or meta text.`;
        }

        const interactionParams: any = {
          model,
          input: fullInput,
        };

        if (options.systemInstruction) {
          interactionParams.system_instruction = options.systemInstruction;
        }

        const interaction = await ai.interactions.create(interactionParams);
        const textOutput = (interaction as any).output_text || '';

        let audioBase64: string | null = null;
        let mimeType = 'audio/pcm;rate=24000';
        if ((interaction as any).output_audio) {
          audioBase64 = (interaction as any).output_audio.data || null;
          mimeType = (interaction as any).output_audio.mime_type || mimeType;
        }

        console.log(`Holojournal: Success via Interactions API [${model}]`);
        return {
          text: textOutput,
          audioBase64,
          mimeType
        };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || JSON.stringify(err);
        console.warn(`Interactions API with ${model} failed (${errMsg}), trying next...`);
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED')) {
          throw err;
        }
      }
    }
  }

  // 2. Fallback to models.generateContent
  for (const model of LEGACY_GENERATE_CONTENT_MODELS) {
    try {
      console.log(`Holojournal: Falling back to generateContent with [${model}]...`);
      const config: any = {};
      if (options.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options.jsonMode) {
        config.responseMimeType = 'application/json';
      }
      if (options.responseModalities) {
        config.responseModalities = options.responseModalities;
      }
      if (options.speechConfig) {
        config.speechConfig = options.speechConfig;
      }

      const resp = await ai.models.generateContent({
        model,
        contents: options.prompt,
        config
      });

      let textOutput = resp.text || '';
      let audioBase64 = null;
      let mimeType = 'audio/pcm;rate=24000';

      if (resp.candidates && resp.candidates.length > 0 && resp.candidates[0].content?.parts) {
        const parts = resp.candidates[0].content.parts;
        const audioPart = parts.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('audio/'));
        if (audioPart && audioPart.inlineData) {
          audioBase64 = audioPart.inlineData.data || null;
          if (audioPart.inlineData.mimeType) {
            mimeType = audioPart.inlineData.mimeType;
          }
        }
        if (!textOutput) {
          const textPart = parts.find(p => p.text);
          if (textPart && textPart.text) textOutput = textPart.text;
        }
      }

      console.log(`Holojournal: Success via generateContent [${model}]`);
      return {
        text: textOutput,
        audioBase64,
        mimeType
      };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || JSON.stringify(err);
      console.warn(`generateContent with ${model} failed (${errMsg}), trying next...`);
      if (errMsg.includes('Interactions API')) {
        continue;
      }
    }
  }

  throw lastError;
};

/**
 * Strips speech disfluencies, filler words (uh, um, like, stutters) from voice dictation.
 */
export const cleanSpeechTranscript = async (rawTranscript: string): Promise<string> => {
  if (!rawTranscript || rawTranscript.trim().length === 0) return '';
  if (rawTranscript.trim().split(/\s+/).length < 4) return rawTranscript.trim();

  const prompt = `You are an audio transcription polisher and speech cleanup editor.
Clean the following voice transcription by:
1. Stripping out speech disfluencies, filler words (e.g. "um", "uh", "ah", "like", "you know", "er", "so yeah").
2. Removing stuttered or repeated words and false starts.
3. Repairing broken sentence fragments into clean, natural, coherent spoken prose.
4. Strictly maintaining 100% of the speaker's original meaning, emotional nuance, personal tone, and vocabulary. Do NOT summarize or sanitize.

Raw Transcription:
"""${rawTranscript}"""

Return ONLY the cleaned transcript text without quotes or preamble:`;

  try {
    const result = await callGemini({ prompt });
    return (result.text || rawTranscript).trim();
  } catch (err) {
    console.error('Speech cleanup fallback to raw:', err);
    return rawTranscript.trim();
  }
};

/**
 * Converts text to speech using gemini-3.1-flash-tts-preview.
 * Returns base64 PCM audio and its mime type, or null on failure.
 */
export const speakText = async (
  text: string,
  voiceName: string
): Promise<{ audioBase64: string; mimeType: string } | null> => {
  const ai = getClient();
  try {
    console.log(`Holojournal TTS: Speaking with voice "${voiceName}"...`);
    const interaction = await (ai.interactions as any).create({
      model: TTS_MODEL,
      input: text,
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [{ voice: voiceName }]
      }
    });
    const audio = (interaction as any).output_audio;
    if (audio?.data) {
      return {
        audioBase64: audio.data,
        mimeType: audio.mime_type || 'audio/pcm;rate=24000'
      };
    }
    console.warn('TTS returned no audio data');
    throw new Error('TTS returned no audio data');
  } catch (err: any) {
    console.error(`TTS failed for voice "${voiceName}":`, err);
    throw err;
  }
};

/**
 * Generates an insightful prompt or mirror based on the journal prompting doc instructions.
 * When voiceEnabled=true, also synthesizes speech with the Holojournal guide voice (Capella).
 */
export const generateJournalPrompt = async (
  chatHistory: { role: 'user' | 'model'; text: string }[],
  promptingDirective: string,
  biographyContext?: string,
  voiceEnabled: boolean = false,
  onProgress?: (status: string) => void
): Promise<{ text: string; audioBase64?: string | null; mimeType?: string }> => {
  let conversationTranscript = '';
  chatHistory.forEach(msg => {
    const label = msg.role === 'user' ? 'User Reflection' : 'HoloJournal Guide';
    conversationTranscript += `[${label}]:\n${msg.text}\n\n`;
  });

  const prompt = `Here is the current reflective journaling dialogue so far:
${conversationTranscript}

=== JOURNAL PROMPTING DIRECTIVE & INSTRUCTIONS ===
${promptingDirective || 'Act as a curious, gentle interviewer helping the user record their life. Ask for more detail, offer different framings, and ensure they cover mundane daily events alongside their primary thoughts.'}

${biographyContext ? `=== USER BIOGRAPHY CONTEXT ===\n${biographyContext}\n` : ''}

TASK:
Based on the instructions above and the user's latest reflections, provide a concise follow-up prompt. 
CRITICAL RULES:
1. NO SYCOPHANCY OR FLATTERY: Do not praise the user for being "honest," "vulnerable," or "brave." Do not offer emotional reassurances or validation. This is a private journal; honesty is assumed.
2. TONE: Act as a neutral, curious biographer or journalist. Be direct and objective.
3. NO ANALYSIS: Do not provide heavy feedback, deep psychological analysis, or advice. (The user has a separate "Council" for that).
4. FOCUS: Act as a record-keeper. Ask for more detail, different framings, or gently guide them to talk about other aspects of their life and mundane daily happenings if they are getting hung up on one single subject.
5. Keep it brief and conversational.`;

  if (onProgress) onProgress('GENERATING TEXT PROMPT WITH GEMINI...');
  const result = await callGemini({ prompt });
  const text = (result.text || '').trim();

  if (!voiceEnabled || !text) {
    return { text };
  }

  if (onProgress) onProgress('SYNTHESIZING AUDIO (CAPELLA)...');
  let audioBase64: string | null = null;
  let mimeType = 'audio/pcm;rate=24000';
  
  try {
    const audio = await speakText(text, JOURNAL_GUIDE_VOICE);
    if (audio) {
      audioBase64 = audio.audioBase64;
      mimeType = audio.mimeType;
    }
  } catch (e: any) {
    console.warn(`JOURNAL AUDIO FAILED: ${e.message || 'Unknown TTS Error'}`);
  }
  
  if (onProgress) onProgress('AUDIO READY...');
  return {
    text,
    audioBase64,
    mimeType
  };
};

/**
 * Synthesizes the full multi-turn chat into the structured Google Doc JSON format.
 */
export const synthesizeJournalChat = async (
  chatHistory: { role: 'user' | 'model'; text: string }[],
  systemContext: string
): Promise<any> => {
  let conversationTranscript = '';
  chatHistory.forEach(msg => {
    const label = msg.role === 'user' ? 'User' : 'Journal Guide';
    conversationTranscript += `[${label}]:\n${msg.text}\n\n`;
  });

  const prompt = `Here is the complete multi-turn conversational journaling session:
${conversationTranscript}

=== SYNTHESIS TASK ===
Based on the provided system instructions for the daily synthesis, please analyze this session and return a JSON object with exactly these fields. 
CRITICAL: Do not over-summarize. Preserve exhaustive, rich details, specific anecdotes, and exact nuances.

{
  "recent_happenings_and_events": "An exhaustive, highly detailed record of what the user has been up to recently, including mundane details, daily life events, and ongoing projects.",
  "historical_biographical_details": "Rich preservation of any details, memories, or context about the user's past that were shared or referenced during the session.",
  "emotional_and_cognitive_record": "A detailed log of the user's feelings, thoughts, and reflections on the topics discussed.",
  "biographical_append": "Any major breakthrough, new core value, or significant life event that should be permanently added to the master biography document. If none, output the string 'None'."
}`;

  const result = await callGemini({
    prompt,
    systemInstruction: systemContext,
    jsonMode: true
  });

  if (result.text) {
    try {
      // Strip potential markdown wrapping backticks if present
      const cleanJson = result.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse Gemini JSON output', e);
      return null;
    }
  }
  return null;
};

export const synthesizeCouncilChat = async (
  chatHistory: { sender: string; text: string; timestamp: string }[],
  systemContext: string
): Promise<string> => {
  let conversationTranscript = '';
  chatHistory.forEach(msg => {
    conversationTranscript += `[${msg.timestamp}] ${msg.sender}:\n${msg.text}\n\n`;
  });

  const prompt = `Here is the complete multi-turn Council session transcript:
${conversationTranscript}

=== SYNTHESIS TASK ===
Based on this transcript, please generate a detailed summary of the council session. The summary must be formatted as markdown and should include the following sections:
- **What Was Discussed**: The core topics, dilemmas, or situations brought to the council.
- **Persona Engagement**: How the different personas engaged with the topic, what specific feedback they offered, and what incisive questions they asked.
- **User Responses**: How the user responded to the council's feedback and reframing.
- **Conclusions Reached**: What decisions were made, what reframings were accepted, and what the path forward looks like.

CRITICAL: Do not over-summarize. Preserve the unique flavor of the personas and the specific nuances of the user's situation. Do NOT output JSON, just pure readable markdown.`;

  const result = await callGemini({
    prompt,
    systemInstruction: systemContext
  });

  return result.text || 'No summary could be generated.';
};

export const processJournalSession = async (
  systemContext: string,
  journalTranscript: string,
  recentContext: string
) => {
  const prompt = `Here are the past few entries for context:\n${recentContext}\n\nHere is today's session transcript:\n${journalTranscript}\n\nPlease synthesize and output the structured JSON according to the schema in the workflow document.`;
  
  const result = await callGemini({
    prompt,
    systemInstruction: systemContext,
    jsonMode: true
  });

  if (result.text) {
    try {
      const cleanJson = result.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse Gemini JSON output', e);
      return null;
    }
  }
  return null;
};

export const processSynthesis = async (
  systemContext: string,
  compiledLogs: string,
  currentBiographyText: string
): Promise<{ synthesisDoc: string; revisedBiographyDoc: string | null }> => {
  const prompt = `Here are all the raw journal entries and council sessions since the last synthesis:

${compiledLogs}

=== CURRENT BIOGRAPHY ===
${currentBiographyText}

=== SYNTHESIS TASK ===
You must output a JSON object with exactly two keys: "synthesisDoc" and "revisedBiographyDoc".

1. "synthesisDoc": Create a comprehensive markdown document combining all the info from the recent logs. It MUST include these sections:
- What Happened During This Period
- Things That Were Challenging
- Things That Were Good
- How All That Felt
- How It Was Framed
- Feedback and Reframing Considered
- Conclusions Reached and Decisions Made for the Future
CRITICAL: Do not over-summarize! Leave almost ALL of the important details and progress recorded intact, just consolidated and organized into this single document.
CRITICAL: Ensure you tag approximate or specific dates to when things happened, referencing the timestamps and dates from the raw transcript.

2. "revisedBiographyDoc": Rewrite the ENTIRE Holojournal-biography document to incorporate any new life events, projects, past experiences, or history revealed in the logs. Integrate the new information smoothly into the appropriate sections of the biography. Output the full revised markdown text. If absolutely no new biographical info was revealed, output "None".`;
  
  const result = await callGemini({
    prompt,
    systemInstruction: systemContext,
    jsonMode: true
  });

  if (result.text) {
    try {
      const cleanJson = result.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        synthesisDoc: parsed.synthesisDoc || '',
        revisedBiographyDoc: parsed.revisedBiographyDoc === 'None' ? null : parsed.revisedBiographyDoc
      };
    } catch (e) {
      console.error('Failed to parse Synthesis JSON', e);
      return { synthesisDoc: '', revisedBiographyDoc: null };
    }
  }

  return { synthesisDoc: '', revisedBiographyDoc: null };
};

/**
 * Gets a council member's response (text + optional TTS audio).
 * When voiceEnabled=true, synthesizes speech with the persona's assigned voice.
 */
export const getCouncilResponse = async (
  systemContext: string,
  persona: string,
  userPrompt: string,
  voiceEnabled: boolean = true,
  onProgress?: (status: string) => void
) => {
  const voiceName = PERSONA_VOICE_MAP[persona] || 'Puck';

  // Step 1: Generate the text response
  const textPrompt = `You are ${persona} from Star Trek, serving on The Holojournal Council. Respond directly in character to the user's situation or query with thoughtful wisdom, your distinct perspective, and empathy.\n\nUser: ${userPrompt}`;

  if (onProgress) onProgress(`CONSULTING ${persona.toUpperCase()}...`);
  const result = await callGemini({
    prompt: textPrompt,
    systemInstruction: systemContext,
  });

  const responseText = result.text || '';

  // Step 2: Synthesize TTS audio if voice is enabled
  let audioBase64: string | null = null;
  let mimeType = 'audio/pcm;rate=24000';

  if (voiceEnabled && responseText) {
    if (onProgress) onProgress(`SYNTHESIZING AUDIO (${voiceName.toUpperCase()})...`);
    try {
      const audio = await speakText(responseText, voiceName);
      if (audio) {
        audioBase64 = audio.audioBase64;
        mimeType = audio.mimeType;
      }
    } catch (e: any) {
      console.warn(`COUNCIL AUDIO FAILED: ${e.message || 'Unknown TTS Error'}`);
    }
  }

  if (onProgress) onProgress('RESPONSE READY...');
  return { text: responseText, audioBase64, mimeType };
};
