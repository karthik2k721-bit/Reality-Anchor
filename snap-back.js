const currentTime = document.getElementById("current-time");
const resumeButton = document.getElementById("resume-btn");

function updateTime() {
    const now = new Date();
    currentTime.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

resumeButton.addEventListener("click", () => {
    window.close();
});

updateTime();
setInterval(updateTime, 1000);
