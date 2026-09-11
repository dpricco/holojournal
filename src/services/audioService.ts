import * as idb from 'idb-keyval';

export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private wakeLock: any = null;
  private stream: MediaStream | null = null;

  constructor() {
    // Initialization deferred to startRecording to request permissions at runtime
  }

  async startRecording(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        try {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.log('Wake lock failed', err);
        }
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // 1-second timeslice to force chunk emission
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      throw err;
    }
  }

  stopRecording(): Promise<{ base64: string, mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('MediaRecorder is not active'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length === 0) {
          reject(new Error('No audio data captured from microphone.'));
          return;
        }
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          if (!base64data) {
             reject(new Error('Failed to encode audio data.'));
             return;
          }
          resolve({ base64: base64data, mimeType: audioBlob.type });
        };

        // Cleanup stream tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
      };

      this.mediaRecorder.stop();

      if (this.wakeLock) {
        this.wakeLock.release().catch(console.error);
        this.wakeLock = null;
      }
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
