# Reality Anchor

Reality Anchor is a Chrome extension that helps users notice and reduce maladaptive daydreaming with gentle focus check-ins, a drift counter, and trigger awareness on YouTube.

## What This Extension Does

### 1. Focus Timer (1 to 60 minutes)
- Timer duration is controlled by up and down arrows in the popup.
- Timer display is read-only (no manual typing).
- Duration range is clamped to 1 to 60 minutes.
- Timer runs in the background after you press Start Focus.

### 2. Adaptive Check-ins
- For 1 to 9 minute sessions:
  - One mandatory check-in appears at about 70% of the countdown.
- For 10+ minute sessions:
  - Check-ins are randomized between 10 and 15 minutes.
- Check-ins only run while a focus session is active.

### 3. Check-in Responses
- Check-in asks: Are you still focused?
- Yes:
  - Session continues.
- No:
  - Drift count increases by 1.
  - Snap Back window appears.
- No response for 30 seconds:
  - Counts as soft drift.
  - Drift count increases by 1.
  - Snap Back window appears.

### 4. Snap Back Window
- Shows current time.
- Shows the grounding message: You're here. Let's refocus.
- Includes Resume button.

### 5. Drift Counter
- Shows Drift count today in popup.
- Increases when user selects No or ignores check-in.
- Resets automatically at local midnight.
- Can also be reset manually with Reset Today button.

### 6. YouTube Trigger Banner
- Active on:
  - https://www.youtube.com/*
  - https://music.youtube.com/*
- Banner message: This might trigger daydreaming. Stay aware.
- Shows once per tab/session.
- Can be dismissed manually and auto-dismisses after a short time.

### 7. Timer Persistence
- If Chrome is closed during a running session, Reality Anchor restores the session on reopen when time remains.
- If the timer would have already ended, session is completed and cleared.

## How It Works (User Flow)

1. Open the extension popup.
2. Set your session duration using the up and down arrows.
3. Click Start Focus.
4. Continue your task while timer runs in background.
5. Respond to check-ins:
   - Yes if focused.
   - No if drifting.
6. If drifting, use Snap Back prompt and resume.
7. At the end of session, timer stops automatically.
8. Start another session manually when ready.

## Install and Run (Load Unpacked)

1. Open Chrome and go to:
   - chrome://extensions
2. Enable Developer mode (top-right).
3. Click Load unpacked.
4. Select this project folder:
5. Pin Reality Anchor from the extensions menu for quick access.

## Permissions Used

- storage
  - Save timer state, drift count, and reset metadata locally.
- alarms
  - Run timer and check-in scheduling reliably in service worker.
- activeTab and scripting
  - Used for extension runtime and content behavior.
- Host permissions:
  - YouTube and YouTube Music only.

## Privacy

- No login.
- No backend.
- No cloud sync.
- No analytics service.
- Data stays in chrome.storage.local on your device.

