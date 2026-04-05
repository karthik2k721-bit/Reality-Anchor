(() => {
    const allowedHosts = new Set([
        "youtube.com",
        "www.youtube.com",
        "music.youtube.com"
    ]);

    if (!allowedHosts.has(window.location.hostname)) {
        return;
    }

    const run = () => {
        if (window.RealityAnchorBanner && typeof window.RealityAnchorBanner.injectBanner === "function") {
            void window.RealityAnchorBanner.injectBanner();
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
        run();
    }
})();
