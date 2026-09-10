import * as idb from 'idb-keyval';

export class AudioService {
  private recognition: any = null;
  
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
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
           this.onTranscriptUpdate(finalTranscript, true);
        }
        if (interimTranscript) {
           this.onTranscriptUpdate(interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
      };
    } else {
      console.warn('Web Speech API not supported in this browser.');
    }
  }

  async startRecording() {
    try {
      if (this.recognition) {
        this.recognition.start();
      }
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
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
