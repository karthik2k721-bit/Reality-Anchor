export const FOCUS_DURATION_MS = 25 * 60 * 1000;

const KEYS = {
    timerState: "timer_state",
    driftCount: "drift_count",
    lastResetDate: "last_reset_date",
    nextCheckInAt: "next_check_in_at"
};

function storageGet(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
            resolve(result || {});
        });
    });
}

function storageSet(values) {
    return new Promise((resolve) => {
        chrome.storage.local.set(values, () => resolve());
    });
}

function storageRemove(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.remove(keys, () => resolve());
    });
}

export function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function calculateRemainingMs(timerState, nowMs = Date.now()) {
    if (!timerState) {
        return 0;
    }
    const elapsed = nowMs - timerState.startTime;
    return Math.max(0, timerState.durationMs - elapsed);
}

export async function getTimerState() {
    const result = await storageGet(KEYS.timerState);
    return result[KEYS.timerState] || null;
}

export async function setTimerState(timerState) {
    await storageSet({ [KEYS.timerState]: timerState });
}

export async function clearTimerState() {
    await storageRemove(KEYS.timerState);
}

export async function getDriftCount() {
    const result = await storageGet(KEYS.driftCount);
    return Number(result[KEYS.driftCount] || 0);
}

export async function setDriftCount(value) {
    await storageSet({ [KEYS.driftCount]: Math.max(0, Number(value) || 0) });
}

export async function incrementDriftCount() {
    const current = await getDriftCount();
    const next = current + 1;
    await setDriftCount(next);
    return next;
}

export async function resetDriftCountForToday() {
    const today = getTodayDateString();
    await storageSet({
        [KEYS.driftCount]: 0,
        [KEYS.lastResetDate]: today
    });
}

export async function checkAndResetIfMidnight() {
    const today = getTodayDateString();
    const result = await storageGet([KEYS.lastResetDate]);
    const lastResetDate = result[KEYS.lastResetDate] || null;

    if (lastResetDate !== today) {
        await resetDriftCountForToday();
        return true;
    }
    return false;
}

export async function getNextCheckInAt() {
    const result = await storageGet(KEYS.nextCheckInAt);
    const value = Number(result[KEYS.nextCheckInAt]);
    return Number.isFinite(value) && value > 0 ? value : null;
}

export async function setNextCheckInAt(timestampMs) {
    await storageSet({ [KEYS.nextCheckInAt]: Math.max(0, Number(timestampMs) || 0) });
}

export async function clearNextCheckInAt() {
    await storageRemove(KEYS.nextCheckInAt);
}
