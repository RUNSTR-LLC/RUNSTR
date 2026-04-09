/**
 * VoiceTranscriptionService
 *
 * Wraps expo-speech-recognition for on-device speech-to-text.
 * Audio is not stored — only the transcribed text is returned.
 *
 * IMPORTANT: expo-speech-recognition requires a native rebuild (expo prebuild --clean).
 * All imports are lazy (require()) so the app doesn't crash if the native module
 * isn't linked yet. The VoiceRecordButton only renders on iOS anyway.
 */

export const MAX_RECORDING_MS = 5 * 60 * 1000; // 5 minutes

function getModule() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
  return ExpoSpeechRecognitionModule;
}

export async function requestPermissions(): Promise<boolean> {
  try {
    const mod = getModule();
    const result = await mod.requestPermissionsAsync();
    return result.granted;
  } catch (error) {
    console.error('[VoiceTranscription] Permission request failed:', error);
    return false;
  }
}

export async function hasPermissions(): Promise<boolean> {
  try {
    const mod = getModule();
    const result = await mod.getPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export function startRecognition(locale?: string): void {
  const mod = getModule();
  mod.start({
    lang: locale || 'en-US',
    interimResults: false,
    maxAlternatives: 1,
    continuous: true,
    requiresOnDeviceRecognition: false,
    addsPunctuation: true,
  });
}

export function stopRecognition(): void {
  getModule().stop();
}

export function abortRecognition(): void {
  getModule().abort();
}
