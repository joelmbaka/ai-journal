import { Audio } from 'expo-av';

export interface STTResponse {
  text: string;
}

export interface STTError {
  detail: string;
}

class STTService {
  private ASSEMBLYAI_API_KEY = process.env.EXPO_PUBLIC_ASSEMBLYAI_API_KEY || '8ac9f52e50004ecb9f4a70bda6e3b46b';
  private ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

  async convertSpeechToText(audioUri: string): Promise<STTResponse> {
    return await this.assemblyAITranscribe(audioUri);
  }

  private async assemblyAITranscribe(audioUri: string): Promise<STTResponse> {
    if (!this.ASSEMBLYAI_API_KEY) {
      throw new Error('AssemblyAI API key not configured');
    }

    // Test network connectivity first
    try {
      const testResponse = await fetch('https://httpbin.org/get', { 
        method: 'GET',
        
      });
      if (!testResponse.ok) {
        console.warn('⚠️ [STT] Network test returned non-200 status');
      }
    } catch (networkError) {
      console.error('❌ [STT] Network connectivity test failed:', networkError);
      throw new Error('Device has no internet connectivity. Please check your network connection.');
    }

    // Step 1: Upload audio file
    const uploadUrl = await this.uploadToAssemblyAI(audioUri);
    
    // Step 2: Submit transcription job
    const transcriptId = await this.submitAssemblyAIJob(uploadUrl);
    
    // Step 3: Poll for completion
    const transcript = await this.pollAssemblyAIResult(transcriptId);
    
    return { text: transcript };
  }

  private async uploadToAssemblyAI(audioUri: string): Promise<string> {
    try {
      // Read audio file as blob
      const response = await fetch(audioUri);
      if (!response.ok) {
        throw new Error(`Failed to read audio file: ${response.status}`);
      }
      const audioBlob = await response.blob();
      
      const uploadResponse = await fetch(`${this.ASSEMBLYAI_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'authorization': this.ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream',
        },
        body: audioBlob,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ [STT] AssemblyAI upload error:', errorText);
        throw new Error(`AssemblyAI upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();
      return uploadResult.upload_url;
      
    } catch (error) {
      console.error('❌ [STT] Upload process failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Upload failed: ${msg}`);
    }
  }

  private async submitAssemblyAIJob(audioUrl: string): Promise<string> {
    const jobData = {
      audio_url: audioUrl,
      speech_model: 'universal',
    };

    const response = await fetch(`${this.ASSEMBLYAI_BASE_URL}/transcript`, {
      method: 'POST',
      headers: {
        'authorization': this.ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      throw new Error(`AssemblyAI job submission failed: ${response.status}`);
    }

    const result = await response.json();
    return result.id;
  }

  private async pollAssemblyAIResult(transcriptId: string): Promise<string> {
    const pollingEndpoint = `${this.ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`;
    
    while (true) {
      const pollingResponse = await fetch(pollingEndpoint, {
        headers: {
          'authorization': this.ASSEMBLYAI_API_KEY,
        },
      });

      if (!pollingResponse.ok) {
        throw new Error(`AssemblyAI polling failed: ${pollingResponse.status}`);
      }

      const result = await pollingResponse.json();

      if (result.status === 'completed') {
        return result.text || '';
      } else if (result.status === 'error') {
        throw new Error(`AssemblyAI transcription failed: ${result.error}`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
      }
    }
  }


  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status === 'granted') {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('❌ [STT] Error requesting permissions:', error);
      return false;
    }
  }

  async startRecording(): Promise<Audio.Recording | null> {
    try {
      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Audio recording permission required');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      return recording;
    } catch (error) {
      console.error('❌ [STT] Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(recording: Audio.Recording): Promise<string> {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      return uri;
    } catch (error) {
      console.error('❌ [STT] Failed to stop recording:', error);
      throw error;
    }
  }
}

export const sttService = new STTService();
