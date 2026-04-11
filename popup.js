const startStopButton = document.getElementById("start-stop-button");
const resetButton = document.getElementById("reset-button");
const timerInput = document.getElementById("timer-input");
const timerUpButton = document.getElementById("timer-up");
const timerDownButton = document.getElementById("timer-down");
const timerPresetBtn = document.getElementById("timer-preset-btn");
const timerPresetMenu = document.getElementById("timer-preset-menu");
const sessionState = document.getElementById("session-state");
const driftCount = document.getElementById("drift-count");

const DEFAULT_DURATION_MS = 25 * 60 * 1000;
const MIN_DURATION_MS = 1 * 60 * 1000;
const MAX_DURATION_MS = 60 * 60 * 1000;
const STEP_DURATION_MS = 1 * 60 * 1000;
const PRESET_DURATIONS_MINUTES = [5, 10, 15, 20, 25, 30, 45, 60];

let currentStatus = null;
let countdownId = null;
let liveRemainingMs = 0;
let configuredDurationMs = DEFAULT_DURATION_MS;
let initializedDuration = false;
let hasUserAdjustedDuration = false;

function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(response);
        });
    });
}

function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function clampDurationMs(ms) {
    return Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, ms));
}

function parseDisplayedDurationMs(value) {
    const match = /^(\d{1,3}):(\d{2})$/.exec(String(value || "").trim());
    if (!match) {
        return null;
    }

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) {
        return null;
    }

    return (minutes * 60 + seconds) * 1000;
}

function setTimerInputValue(durationMs) {
    timerInput.value = formatTime(durationMs);
}

function setDurationControlsDisabled(disabled) {
    timerInput.disabled = disabled;
    timerUpButton.disabled = disabled;
    timerDownButton.disabled = disabled;
    timerPresetBtn.disabled = disabled;
    // Hide menu when disabling controls
    if (disabled) {
        hidePresetMenu();
    }
}

function stepDuration(deltaMs) {
    if (currentStatus?.isRunning) {
        return;
    }

    hasUserAdjustedDuration = true;
    configuredDurationMs = clampDurationMs(configuredDurationMs + deltaMs);
    setTimerInputValue(configuredDurationMs);
}


function showPresetMenu() {
    if (currentStatus?.isRunning) {
        return; // Don't open menu during active session
    }

    // Show menu first to measure its height
    timerPresetMenu.classList.remove("hidden");

    // Position menu below the button
    const btnRect = timerPresetBtn.getBoundingClientRect();

    // Keep menu within left/right bounds
    let left = btnRect.left;
    const menuWidth = timerPresetMenu.offsetWidth;
    if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 4;
    }

    timerPresetMenu.style.position = "fixed";
    timerPresetMenu.style.top = (btnRect.bottom + 4) + "px";
    timerPresetMenu.style.left = Math.max(4, left) + "px";

    timerPresetBtn.setAttribute("aria-expanded", "true");
}

function hidePresetMenu() {
    timerPresetMenu.classList.add("hidden");
    timerPresetBtn.setAttribute("aria-expanded", "false");
}

function selectPreset(minutes) {
    if (currentStatus?.isRunning) {
        return;
    }

    hasUserAdjustedDuration = true;
    configuredDurationMs = minutes * 60 * 1000;
    configuredDurationMs = clampDurationMs(configuredDurationMs);
    setTimerInputValue(configuredDurationMs);
    hidePresetMenu();
}

function stopCountdown() {
    if (countdownId) {
        clearInterval(countdownId);
        countdownId = null;
    }
}

function startCountdown() {
    stopCountdown();

    if (!currentStatus?.isRunning) {
        return;
    }

    countdownId = setInterval(() => {
        liveRemainingMs = Math.max(0, liveRemainingMs - 1000);
        setTimerInputValue(liveRemainingMs);

        if (liveRemainingMs <= 0) {
            stopCountdown();
            void refreshStatus();
        }
    }, 1000);
}

function renderStatus(status) {
    currentStatus = status;
    driftCount.textContent = String(status.driftCount || 0);

    if (!initializedDuration && !hasUserAdjustedDuration && Number.isFinite(status.durationMs) && status.durationMs > 0) {
        configuredDurationMs = clampDurationMs(status.durationMs);
        initializedDuration = true;
    }

    if (status.isRunning) {
        liveRemainingMs = status.remainingMs;
        setTimerInputValue(liveRemainingMs);
        setDurationControlsDisabled(true);
        sessionState.textContent = "Focus session active";
        startStopButton.textContent = "Stop Focus";
        startCountdown();
        return;
    }

    stopCountdown();
    setDurationControlsDisabled(false);
    setTimerInputValue(configuredDurationMs);
    sessionState.textContent = status.sessionCompleted ? "Session completed" : "Session not running";
    startStopButton.textContent = "Start Focus";
}

async function refreshStatus() {
    const status = await sendMessage({ type: "GET_STATUS" });
    renderStatus(status);
}

async function handleStartStop() {
    startStopButton.disabled = true;

    if (currentStatus?.isRunning) {
        const status = await sendMessage({ type: "STOP_TIMER" });
        renderStatus(status);
    } else {
        const parsedDurationMs = parseDisplayedDurationMs(timerInput.value);
        configuredDurationMs = clampDurationMs(parsedDurationMs ?? configuredDurationMs);
        setTimerInputValue(configuredDurationMs);

        const status = await sendMessage({
            type: "START_TIMER",
            durationMs: configuredDurationMs
        });
        renderStatus(status);
    }

    startStopButton.disabled = false;
}

async function handleReset() {
    resetButton.disabled = true;
    const status = await sendMessage({ type: "RESET_DRIFT_TODAY" });
    renderStatus(status);
    resetButton.disabled = false;
}

startStopButton.addEventListener("click", () => {
    void handleStartStop();
});

resetButton.addEventListener("click", () => {
    void handleReset();
});

timerUpButton.addEventListener("click", () => {
    stepDuration(STEP_DURATION_MS);
});

timerDownButton.addEventListener("click", () => {
    stepDuration(-STEP_DURATION_MS);
});

timerPresetBtn.addEventListener("click", () => {
    const isMenuHidden = timerPresetMenu.classList.contains("hidden");
    if (isMenuHidden) {
        showPresetMenu();
    } else {
        hidePresetMenu();
    }
});

// Handle preset menu item clicks
timerPresetMenu.querySelectorAll(".timer-preset-item").forEach((item) => {
    item.addEventListener("click", (event) => {
        const minutes = Number(event.target.getAttribute("data-minutes"));
        if (Number.isFinite(minutes) && minutes > 0) {
            selectPreset(minutes);
        }
    });
});

// Close menu when clicking outside
document.addEventListener("click", (event) => {
    if (!event.target.closest(".timer-editor") && !event.target.closest(".timer-preset-menu")) {
        hidePresetMenu();
    }
});

timerInput.setAttribute("readonly", "readonly");
timerInput.addEventListener("beforeinput", (event) => {
    event.preventDefault();
});

void refreshStatus();
