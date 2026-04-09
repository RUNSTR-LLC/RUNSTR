# Voice Journal Design

**Date:** 2026-02-24
**Status:** Approved

## Summary

Add voice-to-text recording to the journal editor. Users tap or hold a mic button to record up to 5 minutes of speech. On stop, on-device speech recognition transcribes the audio and places the text in the editor for review/editing before save. Audio is discarded after transcription — only text is stored.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audio storage | Transcribe only, discard audio | Keeps storage simple, backups small |
| Transcription engine | On-device (`@react-native-voice/voice`) | Free, private, offline-capable, cross-platform |
| Transcription timing | After recording stops | Simpler implementation, reliable |
| Post-transcription | Editable text in editor | User can fix typos, add context before saving |
| Recording UX | Mic button: tap to start/stop, hold to record | Familiar pattern (iMessage-style) |
| Recording limit | 5 minutes | Keeps transcription manageable |

## Architecture

### New dependency

`@react-native-voice/voice` — mature (4k+ stars), supports iOS Speech framework + Android SpeechRecognizer natively.

### New files

**`src/services/voice/VoiceTranscriptionService.ts`**
- Wraps `@react-native-voice/voice`
- Handles microphone permission requests (iOS + Android)
- Manages recording lifecycle: start, stop, cancel
- Enforces 5-minute time limit
- Returns transcribed text string on completion
- Error handling for permission denied, no speech detected, timeout

**`src/components/journal/VoiceRecordButton.tsx`**
- Mic button with two interaction modes:
  - Tap: toggles recording on/off
  - Hold: records while held, stops on release
- Visual states: idle, recording (pulsing animation), processing
- Recording timer display (MM:SS countdown from 5:00)
- Cancel gesture: slide finger away while holding to cancel

### Modified files

**`src/components/journal/JournalEditorModal.tsx`**
- Add VoiceRecordButton between text editor and tags section
- On transcription complete: append text to existing content (with newline separator if content exists)
- Disable mic button while saving

### Unchanged

- `JournalEntry` type — still `content: string`, no schema change
- `JournalService` — still saves text entries
- Backup/restore flow — text-only, unchanged
- Reward submission — unchanged (already wired from previous feature)

## UX Flow

```
1. User opens journal editor (new or existing entry)
2. Types text OR taps mic button
3. Recording state: button pulses orange, timer counts up to 5:00
4. User taps again (or releases hold) to stop
5. Brief "Transcribing..." indicator
6. Transcribed text appears in the text editor
7. User reviews/edits the text
8. User taps Save (normal flow)
```

If user holds and slides away → recording cancels, no text added.
If 5-minute limit reached → auto-stops and transcribes.
If speech recognition fails → toast error, text field unchanged.

## Permission Handling

- iOS: `NSSpeechRecognitionUsageDescription` + `NSMicrophoneUsageDescription` in Info.plist
- Android: `RECORD_AUDIO` permission in AndroidManifest.xml
- Request permission on first mic tap, not on app launch
- If denied: show alert explaining why mic access is needed, link to settings

## Recording Limit

5 minutes max. Timer shows elapsed time. At 4:30, timer text turns orange as warning. At 5:00, auto-stop and transcribe.

## Error States

| Scenario | Behavior |
|----------|----------|
| Permission denied | Alert with "Open Settings" button |
| No speech detected | Toast: "No speech detected. Try again." |
| Transcription fails | Toast: "Couldn't transcribe. Try again." |
| Already recording | Ignore second tap (debounce) |
| 5-min limit reached | Auto-stop, transcribe what was captured |
