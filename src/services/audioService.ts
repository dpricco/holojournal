import * as idb from 'idb-keyval';

export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
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
    this.audioChunks = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.backupToIDB(); // Continually backup
        }
      };
      
      this.mediaRecorder.start(3000); // chunk every 3 seconds
      
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
      
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await idb.set('holojournal-audio-backup', audioBlob);
        resolve(audioBlob);
        
        // Stop all tracks
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.stop();
    });
  }
  
  async backupToIDB() {
      const currentBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      await idb.set('holojournal-audio-backup', currentBlob);
  }

  async clearBackup() {
      await idb.del('holojournal-audio-backup');
  }
  
  async hasBackup(): Promise<boolean> {
      const val = await idb.get('holojournal-audio-backup');
      return !!val;
  }
}
