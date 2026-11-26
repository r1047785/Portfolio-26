/* The site has one look: dark. An old light choice from before is forgotten. */
document.documentElement.dataset.theme = "dark";
try { localStorage.removeItem("portfolio-theme"); } catch {}
