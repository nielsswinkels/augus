# Blind User / Accessibility Mode — Implementation Plan

## Overview

A dedicated accessibility mode for blind and low-vision museum visitors. When activated, the app transforms into a simplified, audio-first interface optimized for screen readers (VoiceOver/TalkBack) and non-visual interaction.

The mode eliminates visual complexity and focuses on: continuous QR scanning, automatic audio playback, gesture-based navigation, and text-to-speech for all content.

## Inspiration & References

- **Apple VoiceOver** — native screen reader with rotor navigation, swipe gestures
- **Bloomberg Connects** — museum app with strong accessibility, audio descriptions
- **Smartify** — auto-scan and auto-play patterns for museum contexts
- **Google Lookout** — continuous camera scanning with audio feedback for blind users

## How to Activate

1. **Settings toggle**: "Accessibility mode" in the settings panel
2. **Auto-detection (optional)**: Detect if a screen reader is running via `aria-live` region timing heuristic (no reliable API exists for this — the common technique is to measure if an `aria-live` announcement was consumed)
3. **URL parameter**: `?accessible=1` for museum staff to print on braille signage

## UI When Active

### Simplified Layout
- **Full-screen single view**: No header, no bottom nav, no visual chrome
- **Large centered play/pause button** covering most of the screen (easy tap target)
- **Audio status text** at top: "Now playing: [Object Name]" (aria-live, announced by screen reader)
- **Minimal color scheme**: High contrast black/white

### Continuous QR Scanning
- Camera runs in background continuously (no button press needed)
- When a valid QR code is detected:
  - Vibration feedback (200ms)
  - Audio chime (short, pleasant tone)
  - Announce object name via TTS: "Now loading: [Object Name]"
  - Auto-play audio after a 1-second pause
- When an invalid QR is detected: single short vibration, no other feedback
- Scanning pauses during audio playback, resumes when audio ends

### Gesture Navigation
| Gesture | Action |
|---------|--------|
| Tap anywhere | Play / Pause |
| Swipe right | Skip forward 15 seconds |
| Swipe left | Skip back 15 seconds |
| Swipe up | Read image captions via TTS (cycles through images) |
| Swipe down | Announce current object name and progress |
| Double-tap and hold | Open settings (simplified) |
| Shake device | Stop audio and resume scanning |

### Simplified Settings
When opened via double-tap-hold:
- **Language**: cycle through available languages (announced via TTS)
- **Speech rate**: slower / normal / faster (for TTS announcements)
- **Exit accessibility mode**: returns to standard UI
- All options navigable by swiping left/right, activated by double-tap

### Audio Feedback
All state changes announced via TTS:
- "Scanning for QR codes..."
- "Found: [Object Name]. Playing audio."
- "Audio finished. Scan the next QR code."
- "Image 1 of 3: [caption text]"
- "Settings. Language: English. Swipe to change."

## Technical Approach

### State Management
```javascript
state.accessibilityMode = false; // persisted in settings

// When enabled:
// - Hide all visual UI except the simplified overlay
// - Start continuous camera scanning
// - Enable gesture detection
// - Route all feedback through TTS
```

### Continuous QR Scanning
- Reuse existing scanner infrastructure (`startScanner()`, `scanFrame()`)
- Keep scanning active across the entire session (not just when scanner view is shown)
- Add a debounce: after detecting a code, pause scanning for 5 seconds to avoid re-triggering
- Handle camera permission: announce via TTS if denied, with instructions

### TTS Integration
- Extend existing `speechSynthesis` usage (already used for captionsAloud)
- Create a `speak(text, priority)` utility:
  - `priority: "polite"` — queued after current speech
  - `priority: "assertive"` — interrupts current speech
- Respect user's speech rate setting
- Use the language matching the current content language

### VoiceOver/TalkBack Compatibility
- All elements get `role`, `aria-label`, `aria-live` attributes
- The simplified UI should work WITH screen readers on, not fight them
- Test with both VoiceOver (iOS Safari) and TalkBack (Android Chrome)
- Use `aria-live="assertive"` for state change announcements
- Ensure the play/pause button is properly labeled and focusable

### Camera + Audio Coexistence
- On iOS, camera and audio can conflict (audio session interruption)
- Solution: pause camera stream during audio playback, resume after
- On Android, both can run simultaneously — but pause scanning to save battery
- Use `audio.addEventListener("ended")` to trigger scan resume

## Implementation Phases

### Phase 1: MVP (Core Experience)
- Settings toggle to activate mode
- Simplified full-screen UI with play/pause
- Continuous QR scanning with auto-play
- Basic TTS announcements (object name, scanning status)
- Tap to play/pause
- Vibration feedback on scan

### Phase 2: Gesture Navigation
- Swipe gestures for skip forward/back
- Swipe up for image caption TTS
- Swipe down for status announcement
- Double-tap-hold for settings
- Speech rate control

### Phase 3: Polish & Testing
- Auto-detection of screen readers
- Audio chime feedback (not just vibration)
- Braille-friendly URL parameter
- User testing with blind/low-vision testers
- VoiceOver/TalkBack QA pass
- Battery optimization (camera management)

## Open Questions

1. **Should scanning continue during audio?** Pausing saves battery but means the user must wait for audio to finish before scanning next. Could be a setting.
2. **How to handle museums with poor QR code placement?** If the user can't find the QR code, they're stuck. Consider adding a "browse by number" voice interface as fallback.
3. **Multi-device scenario**: Some museums have shared devices. How does accessibility mode interact with device sharing?
4. **Audio descriptions of images**: Beyond reading captions, should we support dedicated audio description tracks for images? (This would require an additional field per image.)
5. **Offline support**: If the museum has poor WiFi, should we pre-cache audio for all objects when the set loads?
6. **Testing**: Need blind/low-vision testers. Contact local accessibility organizations or museum accessibility coordinators.

## Estimated Scope

- Phase 1: ~2-3 sessions
- Phase 2: ~1-2 sessions
- Phase 3: ~1-2 sessions + external testing
