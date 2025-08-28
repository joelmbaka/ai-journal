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
    console.log('🎤 [STT] Starting speech-to-text conversion...');
    return await this.assemblyAITranscribe(audioUri);
  }

  private async assemblyAITranscribe(audioUri: string): Promise<STTResponse> {
    if (!this.ASSEMBLYAI_API_KEY) {
      throw new Error('AssemblyAI API key not configured');
    }

    console.log('🔄 [STT] Using AssemblyAI transcription...');

    // Test network connectivity first
    try {
      console.log('🌐 [STT] Testing network connectivity...');
      const testResponse = await fetch('https://httpbin.org/get', { 
        method: 'GET',
        
      });
      if (testResponse.ok) {
        console.log('✅ [STT] Basic network connectivity confirmed');
      } else {
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
    
    console.log('✅ [STT] AssemblyAI transcription completed:', transcript.substring(0, 50) + '...');
    return { text: transcript };
  }

  private async uploadToAssemblyAI(audioUri: string): Promise<string> {
    console.log('📤 [STT] Uploading audio to AssemblyAI...');
    
    try {
      // Read audio file as blob
      console.log('📁 [STT] Reading audio file:', audioUri);
      const response = await fetch(audioUri);
      if (!response.ok) {
        throw new Error(`Failed to read audio file: ${response.status}`);
      }
      const audioBlob = await response.blob();
      console.log('📊 [STT] Audio blob size:', audioBlob.size, 'bytes');
      
      console.log('🌐 [STT] Uploading to AssemblyAI API...');
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
      console.log('✅ [STT] Audio uploaded to AssemblyAI');
      return uploadResult.upload_url;
      
    } catch (error) {
      console.error('❌ [STT] Upload process failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Upload failed: ${msg}`);
    }
  }

  private async submitAssemblyAIJob(audioUrl: string): Promise<string> {
    console.log('📝 [STT] Submitting transcription job...');
    
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
    console.log('✅ [STT] Transcription job submitted, ID:', result.id);
    return result.id;
  }

  private async pollAssemblyAIResult(transcriptId: string): Promise<string> {
    console.log('⏳ [STT] Polling for transcription result...');
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
        console.log(`⏳ [STT] Status: ${result.status}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
      }
    }
  }


  async requestPermissions(): Promise<boolean> {
    try {
      console.log('🎤 [STT] Requesting audio permissions...');
      
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ [STT] Audio permissions granted');
        return true;
      } else {
        console.log('❌ [STT] Audio permissions denied');
        return false;
      }
    } catch (error) {
      console.error('❌ [STT] Error requesting permissions:', error);
      return false;
    }
  }

  async startRecording(): Promise<Audio.Recording | null> {
    try {
      console.log('🎤 [STT] Starting audio recording...');

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

      console.log('✅ [STT] Recording started');
      return recording;
    } catch (error) {
      console.error('❌ [STT] Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(recording: Audio.Recording): Promise<string> {
    try {
      console.log('🎤 [STT] Stopping recording...');
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      console.log('✅ [STT] Recording stopped, URI:', uri);
      return uri;
    } catch (error) {
      console.error('❌ [STT] Failed to stop recording:', error);
      throw error;
    }
  }
}

export const sttService = new STTService();
