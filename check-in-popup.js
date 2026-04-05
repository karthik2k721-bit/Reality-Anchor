const yesButton = document.getElementById("yes-btn");
const noButton = document.getElementById("no-btn");

const SOFT_DRIFT_TIMEOUT_MS = 30 * 1000;
let handled = false;
let timeoutId = null;

function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => resolve(response));
    });
}

async function submitResponse(response) {
    if (handled) {
        return;
    }

    handled = true;
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    yesButton.disabled = true;
    noButton.disabled = true;

    await sendMessage({
        type: "CHECKIN_RESPONSE",
        response
    });

    window.close();
}

yesButton.addEventListener("click", () => {
    void submitResponse("yes");
});

noButton.addEventListener("click", () => {
    void submitResponse("no");
});

timeoutId = setTimeout(() => {
    void submitResponse("ignore");
}, SOFT_DRIFT_TIMEOUT_MS);
