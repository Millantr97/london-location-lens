/* Installability and offline shell. iOS Safari exposes installation through Share > Add to Home Screen. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js", {scope: "/"}).catch(() => {}));
}
