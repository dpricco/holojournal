import * as idb from 'idb-keyval';

export class AudioService {
  private recognition: any = null;
  private isIntentionallyStopped: boolean = false;
  
  private wakeLock: any = null;
  private accumulatedFinal: string = '';
  private currentSessionFinal: string = '';
  
  public onTranscriptUpdate: (text: string, isFinal: boolean) => void = () => {};

  constructor() {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      this.recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';
        
        // Always loop from 0 to bypass Android's duplicate continuous results bug
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        
        this.currentSessionFinal = finalStr;
        
        const fullDisplay = (this.accumulatedFinal + ' ' + finalStr + ' ' + interimStr).replace(/\s+/g, ' ').trim();
        
        // Always emit the full cumulative string. The UI should overwrite its state, not append.
        this.onTranscriptUpdate(fullDisplay, true);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.isIntentionallyStopped = true;
        }
      };

      this.recognition.onend = () => {
        // Commit this session's final string to the accumulator across restarts
        if (this.currentSessionFinal) {
          this.accumulatedFinal += ' ' + this.currentSessionFinal;
          this.currentSessionFinal = '';
        }

        // If the browser stopped it automatically (due to pause), restart it!
        if (!this.isIntentionallyStopped && this.recognition) {
          try {
            this.recognition.start();
          } catch (e) {
            console.error('Failed to restart recognition', e);
          }
        }
      };
    } else {
      console.warn('Web Speech API not supported in this browser.');
    }
  }

  async startRecording() {
    this.isIntentionallyStopped = false;
    this.accumulatedFinal = '';
    this.currentSessionFinal = '';
    try {
      if ('wakeLock' in navigator) {
        try {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error(`Wake Lock Error: ${err}`);
        }
      }
      
      if (this.recognition) {
        this.recognition.start();
      }
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  }

  stopRecording(): Promise<Blob | null> {
    this.isIntentionallyStopped = true;
    return new Promise((resolve) => {
      if (this.wakeLock !== null) {
        this.wakeLock.release().catch(console.error).finally(() => {
          this.wakeLock = null;
        });
      }
      if (this.recognition) {
        this.recognition.stop();
      }
      resolve(null);
    });
  }
  


  async clearBackup() {
      await idb.del('holojournal-audio-backup');
  }
  
  async hasBackup(): Promise<boolean> {
      const val = await idb.get('holojournal-audio-backup');
      return !!val;
  }
}
