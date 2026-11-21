(() => {
  const bar = document.getElementById("pwaInstallBar");
  const installButton = document.getElementById("pwaInstallBtn");
  const closeButton = document.getElementById("pwaInstallClose");
  if (!bar || !installButton) return;

  let installPrompt = null;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const dismissed = sessionStorage.getItem("beru_pwa_install_dismissed") === "1";

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" })
        .catch(error => console.warn("BERU offline support registration failed:", error));
    });
  }

  if (isStandalone || dismissed) return;

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    bar.hidden = false;
    installButton.textContent = "Install";
  });

  window.addEventListener("appinstalled", () => {
    bar.hidden = true;
    installPrompt = null;
  });

  installButton.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      bar.hidden = true;
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      alert("To install BERU AI: tap Share in Safari, then choose “Add to Home Screen”.");
    } else {
      alert("Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.");
    }
  });

  closeButton?.addEventListener("click", () => {
    bar.hidden = true;
    sessionStorage.setItem("beru_pwa_install_dismissed", "1");
  });
})();