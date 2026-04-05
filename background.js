import {
    FOCUS_DURATION_MS,
    calculateRemainingMs,
    checkAndResetIfMidnight,
    clearNextCheckInAt,
    clearTimerState,
    getDriftCount,
    getNextCheckInAt,
    getTimerState,
    incrementDriftCount,
    resetDriftCountForToday,
    setNextCheckInAt,
    setTimerState
} from "./utils/storage.js";

import {
    ALARM_DAILY_RESET,
    ALARM_CHECK_IN,
    ALARM_CHECK_IN_WATCHDOG,
    ALARM_FOCUS_END,
    clearCheckInAlarm,
    clearCheckInWatchdogAlarm,
    clearFocusEndAlarm,
    scheduleCheckInAlarm,
    scheduleDailyResetAlarm,
    scheduleCheckInWatchdogAlarm,
    scheduleFocusEndAlarm
} from "./utils/alarm-manager.js";

const CHECK_IN_URL = "check-in-popup.html";
const SNAP_BACK_URL = "snap-back.html";
const CHECK_IN_WATCHDOG_GRACE_MS = 15000;
const MIN_FOCUS_DURATION_MS = 1 * 60 * 1000;
const MAX_FOCUS_DURATION_MS = 60 * 60 * 1000;
const SHORT_SESSION_MAX_MS = 9 * 60 * 1000;
const SHORT_SESSION_TARGET_RATIO = 0.7;

let checkInWindowId = null;

function windowCreate(createData) {
    return new Promise((resolve) => {
        chrome.windows.create(createData, (createdWindow) => {
            if (chrome.runtime.lastError) {
                resolve(null);
                return;
            }
            resolve(createdWindow);
        });
    });
}

function windowUpdate(windowId, updateInfo) {
    return new Promise((resolve) => {
        chrome.windows.update(windowId, updateInfo, () => resolve());
    });
}

function normalizeFocusDurationMs(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return FOCUS_DURATION_MS;
    }

    return Math.max(MIN_FOCUS_DURATION_MS, Math.min(MAX_FOCUS_DURATION_MS, parsed));
}

async function getStatus() {
    await checkAndResetIfMidnight();

    const timerState = await getTimerState();
    const driftCount = await getDriftCount();

    if (!timerState) {
        return {
            isRunning: false,
            remainingMs: 0,
            durationMs: null,
            driftCount,
            sessionCompleted: false
        };
    }

    const remainingMs = calculateRemainingMs(timerState);
    if (remainingMs <= 0) {
        await handleTimerExpired();
        return {
            isRunning: false,
            remainingMs: 0,
            durationMs: null,
            driftCount,
            sessionCompleted: true
        };
    }

    return {
        isRunning: true,
        startTime: timerState.startTime,
        durationMs: timerState.durationMs,
        remainingMs,
        driftCount,
        sessionCompleted: false
    };
}

async function startFocusSession(requestedDurationMs) {
    await checkAndResetIfMidnight();

    const durationMs = normalizeFocusDurationMs(requestedDurationMs);

    const timerState = {
        startTime: Date.now(),
        durationMs
    };

    await setTimerState(timerState);
    await clearFocusEndAlarm();
    await clearCheckInSchedulingState();

    scheduleFocusEndAlarm(durationMs);
    await scheduleSessionCheckIn(timerState, durationMs);

    return getStatus();
}

async function stopFocusSession() {
    await clearTimerState();
    await clearFocusEndAlarm();
    await clearCheckInSchedulingState();
    checkInWindowId = null;

    return getStatus();
}

async function restoreSessionAfterRestart() {
    const timerState = await getTimerState();
    if (!timerState) {
        return;
    }

    const remainingMs = calculateRemainingMs(timerState);
    if (remainingMs <= 0) {
        await handleTimerExpired();
        return;
    }

    await clearFocusEndAlarm();
    await clearCheckInSchedulingState();

    scheduleFocusEndAlarm(remainingMs);
    await scheduleSessionCheckIn(timerState, remainingMs);
}

async function handleTimerExpired() {
    await clearTimerState();
    await clearFocusEndAlarm();
    await clearCheckInSchedulingState();
    checkInWindowId = null;
}

async function openCheckInWindow() {
    if (checkInWindowId !== null) {
        await windowUpdate(checkInWindowId, { focused: true });
        return;
    }

    const createdWindow = await windowCreate({
        url: chrome.runtime.getURL(CHECK_IN_URL),
        type: "popup",
        width: 360,
        height: 250,
        focused: true
    });

    if (!createdWindow) {
        const fallbackWindow = await windowCreate({
            url: chrome.runtime.getURL(CHECK_IN_URL),
            type: "normal",
            width: 420,
            height: 340,
            focused: true
        });

        if (fallbackWindow && typeof fallbackWindow.id === "number") {
            checkInWindowId = fallbackWindow.id;
        }
        return;
    }

    if (createdWindow && typeof createdWindow.id === "number") {
        checkInWindowId = createdWindow.id;
    }
}

async function openSnapBackWindow() {
    await windowCreate({
        url: chrome.runtime.getURL(SNAP_BACK_URL),
        type: "popup",
        width: 380,
        height: 280,
        focused: true
    });
}

async function scheduleNextCheckInIfPossible() {
    const timerState = await getTimerState();
    if (!timerState) {
        return;
    }

    const remainingMs = calculateRemainingMs(timerState);
    await scheduleCheckInFromRemaining(remainingMs);
}

function isShortSessionDuration(durationMs) {
    return durationMs >= MIN_FOCUS_DURATION_MS && durationMs <= SHORT_SESSION_MAX_MS;
}

async function scheduleMandatoryShortSessionCheckIn(timerState) {
    await clearCheckInAlarm();

    const targetAtMs = timerState.startTime + Math.floor(timerState.durationMs * SHORT_SESSION_TARGET_RATIO);
    const dueAtMs = Math.max(Date.now() + 1000, targetAtMs);

    chrome.alarms.create(ALARM_CHECK_IN, { when: dueAtMs });
    await setNextCheckInAt(dueAtMs);
    scheduleCheckInWatchdogAlarm();
    return true;
}

async function scheduleSessionCheckIn(timerState, remainingMs) {
    if (isShortSessionDuration(timerState.durationMs)) {
        return scheduleMandatoryShortSessionCheckIn(timerState);
    }

    return scheduleCheckInFromRemaining(remainingMs);
}

async function clearCheckInSchedulingState() {
    await clearCheckInAlarm();
    await clearNextCheckInAt();
    await clearCheckInWatchdogAlarm();
}

async function scheduleCheckInFromRemaining(remainingMs) {
    await clearCheckInAlarm();

    const dueAtMs = scheduleCheckInAlarm(remainingMs);
    if (!dueAtMs) {
        await clearNextCheckInAt();
        await clearCheckInWatchdogAlarm();
        return false;
    }

    await setNextCheckInAt(dueAtMs);
    scheduleCheckInWatchdogAlarm();
    return true;
}

async function maybeTriggerCheckInFromWatchdog() {
    const status = await getStatus();
    if (!status.isRunning) {
        await clearCheckInSchedulingState();
        return;
    }

    const nextCheckInAt = await getNextCheckInAt();
    if (!nextCheckInAt) {
        await scheduleCheckInFromRemaining(status.remainingMs);
        return;
    }

    if (Date.now() + CHECK_IN_WATCHDOG_GRACE_MS < nextCheckInAt) {
        return;
    }

    await clearCheckInAlarm();
    await clearNextCheckInAt();
    await openCheckInWindow();
}

async function handleCheckInResponse(response) {
    const status = await getStatus();
    if (!status.isRunning) {
        return;
    }

    if (response === "no" || response === "ignore") {
        await incrementDriftCount();
        await openSnapBackWindow();
    }

    await scheduleNextCheckInIfPossible();
}

chrome.alarms.onAlarm.addListener((alarm) => {
    void (async () => {
        if (alarm.name === ALARM_DAILY_RESET) {
            await resetDriftCountForToday();
            scheduleDailyResetAlarm();
            return;
        }

        if (alarm.name === ALARM_FOCUS_END) {
            await handleTimerExpired();
            return;
        }

        if (alarm.name === ALARM_CHECK_IN) {
            const status = await getStatus();
            if (status.isRunning) {
                await clearNextCheckInAt();
                await openCheckInWindow();
            }
            return;
        }

        if (alarm.name === ALARM_CHECK_IN_WATCHDOG) {
            await maybeTriggerCheckInFromWatchdog();
        }
    })();
});

chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === checkInWindowId) {
        checkInWindowId = null;
    }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void (async () => {
        const messageType = typeof message?.type === "string"
            ? message.type.trim().toUpperCase()
            : "";

        switch (messageType) {
            case "GET_STATUS":
                sendResponse(await getStatus());
                break;
            case "START_TIMER":
                sendResponse(await startFocusSession(message.durationMs));
                break;
            case "STOP_TIMER":
                sendResponse(await stopFocusSession());
                break;
            case "RESET_DRIFT_TODAY":
                await resetDriftCountForToday();
                sendResponse(await getStatus());
                break;
            case "CHECKIN_RESPONSE":
                await handleCheckInResponse(message.response);
                sendResponse({ ok: true });
                break;
            default:
                sendResponse({ ok: false, error: "Unknown message type" });
        }
    })();

    return true;
});

async function initialize() {
    await checkAndResetIfMidnight();
    scheduleDailyResetAlarm();
    await restoreSessionAfterRestart();
}

chrome.runtime.onInstalled.addListener(() => {
    void initialize();
});

chrome.runtime.onStartup.addListener(() => {
    void initialize();
});

void initialize();



