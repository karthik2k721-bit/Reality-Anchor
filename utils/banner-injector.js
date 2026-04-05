(() => {
    const FLAG_KEY = "reality_anchor_banner_shown";
    const ROOT_ID = "reality-anchor-banner-root";
    const STYLE_ID = "reality-anchor-banner-style";

    function hasShownBanner() {
        return sessionStorage.getItem(FLAG_KEY) === "1";
    }

    function markBannerShown() {
        sessionStorage.setItem(FLAG_KEY, "1");
    }

    function dismissBanner() {
        const banner = document.getElementById(ROOT_ID);
        if (banner) {
            banner.remove();
        }
    }

    function ensureBannerStylesLoaded() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const styleLink = document.createElement("link");
        styleLink.id = STYLE_ID;
        styleLink.rel = "stylesheet";
        styleLink.href = chrome.runtime.getURL("banner-styles.css");
        document.head.appendChild(styleLink);
    }

    async function injectBanner() {
        if (hasShownBanner() || document.getElementById(ROOT_ID)) {
            return false;
        }

        ensureBannerStylesLoaded();

        try {
            const response = await fetch(chrome.runtime.getURL("banner.html"));
            const html = await response.text();

            const template = document.createElement("template");
            template.innerHTML = html.trim();
            const bannerNode = template.content.firstElementChild;

            if (!bannerNode) {
                return false;
            }

            document.body.prepend(bannerNode);
            markBannerShown();

            const closeButton = bannerNode.querySelector("[data-role='close-banner']");
            if (closeButton) {
                closeButton.addEventListener("click", dismissBanner, { once: true });
            }

            setTimeout(dismissBanner, 10000);
            return true;
        } catch (_error) {
            return false;
        }
    }

    window.RealityAnchorBanner = {
        injectBanner,
        dismissBanner,
        hasShownBanner
    };
})();
