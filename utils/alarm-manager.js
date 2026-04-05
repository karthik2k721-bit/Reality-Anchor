export const ALARM_FOCUS_END = "reality_anchor_focus_end";
export const ALARM_CHECK_IN = "reality_anchor_check_in";
export const ALARM_DAILY_RESET = "reality_anchor_daily_reset";
export const ALARM_CHECK_IN_WATCHDOG = "reality_anchor_check_in_watchdog";

const MIN_CHECK_IN_MS = 10 * 60 * 1000;
const MAX_CHECK_IN_MS = 15 * 60 * 1000;

function randomBetween(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function createAlarmAt(name, whenMs) {
    chrome.alarms.create(name, { when: whenMs });
}

export function scheduleFocusEndAlarm(delayMs) {
    createAlarmAt(ALARM_FOCUS_END, Date.now() + Math.max(1000, delayMs));
}

export async function clearFocusEndAlarm() {
    return new Promise((resolve) => {
        chrome.alarms.clear(ALARM_FOCUS_END, () => resolve());
    });
}

export function scheduleCheckInAlarm(remainingMs) {
    if (remainingMs <= MIN_CHECK_IN_MS) {
        return null;
    }

    const maxDelay = Math.min(MAX_CHECK_IN_MS, remainingMs - 1000);
    if (maxDelay < MIN_CHECK_IN_MS) {
        return null;
    }

    const delayMs = randomBetween(MIN_CHECK_IN_MS, maxDelay);
    const dueAtMs = Date.now() + delayMs;
    createAlarmAt(ALARM_CHECK_IN, dueAtMs);
    return dueAtMs;
}

export async function clearCheckInAlarm() {
    return new Promise((resolve) => {
        chrome.alarms.clear(ALARM_CHECK_IN, () => resolve());
    });
}

export function scheduleDailyResetAlarm() {
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);
    createAlarmAt(ALARM_DAILY_RESET, nextMidnight.getTime());
}

export function scheduleCheckInWatchdogAlarm() {
    chrome.alarms.create(ALARM_CHECK_IN_WATCHDOG, {
        periodInMinutes: 1
    });
}

export async function clearCheckInWatchdogAlarm() {
    return new Promise((resolve) => {
        chrome.alarms.clear(ALARM_CHECK_IN_WATCHDOG, () => resolve());
    });
}
