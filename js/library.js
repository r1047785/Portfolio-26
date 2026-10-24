const launches = document.querySelectorAll("[data-experiment-launch]");
const dialog = document.querySelector("#experiment-dialog");
const host = document.querySelector("#experiment-viewer");
if (launches.length && dialog && host && typeof dialog.showModal === "function") {
  let activeLaunch = null;
  const title = dialog.querySelector("#experiment-title");
  const separateLink = dialog.querySelector('[data-i18n="library.openSeparate"]');
  const close = dialog.querySelector("[data-experiment-close]");
  const cleanup = () => {
    // Removing the iframe tears down its WebGL/WebGPU context, animation and listeners.
    host.replaceChildren();
    document.body.classList.remove("experiment-open");
    activeLaunch?.focus({ preventScroll: true });
  };
  launches.forEach((launch) => launch.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    activeLaunch = launch;
    const name = launch.dataset.experimentTitle || launch.querySelector(".experiment-name").textContent.trim();
    title.textContent = name;
    separateLink.href = launch.href;
    const frame = document.createElement("iframe");
    frame.src = launch.href;
    frame.title = name;
    frame.setAttribute("allow", "fullscreen");
    frame.setAttribute("referrerpolicy", "no-referrer");
    host.replaceChildren(frame);
    dialog.showModal();
    document.body.classList.add("experiment-open");
    close.focus();
  }));
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", cleanup);
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  window.addEventListener("pagehide", () => { if (dialog.open) dialog.close(); });
}
