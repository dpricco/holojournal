import * as idb from 'idb-keyval';

export class AudioService {
  private recognition: any = null;
  private isIntentionallyStopped: boolean = false;
  
  private wakeLock: any = null;
  private finalTranscript: string = '';
  
  public onTranscriptUpdate: (text: string, isFinal: boolean) => void = () => {};

  constructor() {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            this.finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const fullDisplay = (this.finalTranscript + ' ' + interimTranscript).replace(/\s+/g, ' ').trim();
        this.onTranscriptUpdate(fullDisplay, true);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.isIntentionallyStopped = true;
        }
      };

      this.recognition.onend = () => {
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
    this.finalTranscript = '';
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
