const DRAFT_KEY = 'holojournal_current_draft';
const CHAT_SESSION_KEY = 'holojournal_chat_session';

export interface StoredChatSession {
  messages: { role: 'user' | 'model'; text: string; timestamp: string }[];
  currentInput: string;
  lastUpdated: number;
  isArchived?: boolean;
}

export const saveDraft = (text: string) => {
  localStorage.setItem(DRAFT_KEY, text);
};

export const loadDraft = (): string | null => {
  return localStorage.getItem(DRAFT_KEY);
};

export const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
};

export const saveChatSession = (session: StoredChatSession) => {
  try {
    localStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to persist chat session:', e);
  }
};

export const loadChatSession = (): StoredChatSession | null => {
  try {
    const raw = localStorage.getItem(CHAT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearChatSession = () => {
  localStorage.removeItem(CHAT_SESSION_KEY);
  localStorage.removeItem(DRAFT_KEY);
};
