/**
 * VoiceTranscriptionService
 *
 * Wraps expo-speech-recognition for on-device speech-to-text.
 * Audio is not stored — only the transcribed text is returned.
 */

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const MAX_RECORDING_MS = 5 * 60 * 1000; // 5 minutes

export async function requestPermissions(): Promise<boolean> {
  try {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch (error) {
    console.error('[VoiceTranscription] Permission request failed:', error);
    return false;
  }
}

export async function hasPermissions(): Promise<boolean> {
  try {
    const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export function startRecognition(locale?: string): void {
  ExpoSpeechRecognitionModule.start({
    lang: locale || 'en-US',
    interimResults: false,
    maxAlternatives: 1,
    continuous: true,
    requiresOnDeviceRecognition: false,
    addsPunctuation: true,
  });
}

export function stopRecognition(): void {
  ExpoSpeechRecognitionModule.stop();
}

export function abortRecognition(): void {
  ExpoSpeechRecognitionModule.abort();
}

export { useSpeechRecognitionEvent, MAX_RECORDING_MS };
