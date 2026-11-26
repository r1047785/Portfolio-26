// Cookie consent for every page: Google Analytics and Microsoft Clarity load only after "Accepteren".
(() => {
  const MEASUREMENT_ID = "G-W6LN5YFFEK";
  const CLARITY_ID = "zi72jvv65n";
  // Do not record my own local testing in Clarity.
  const isLocalhost = ["localhost", "127.0.0.1", ""].includes(location.hostname);
  const STORAGE_KEY = "portfolio_cookie_consent";

  const css = `
    .cookie-banner {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 99999;
      box-sizing: border-box;
      width: min(360px, calc(100vw - 32px));
      padding: 22px;
      border: 1px solid #e5e5e5;
      border-radius: 14px;
      background: #fff;
      color: #222;
      box-shadow: 0 8px 35px rgba(0, 0, 0, 0.15);
      font: 14px/1.6 system-ui, sans-serif;
    }
    .cookie-banner[hidden] { display: none; }
    .cookie-banner h2 { margin: 0 0 8px; font-size: 18px; line-height: 1.3; }
    .cookie-banner p { margin: 0 0 16px; color: #555; }
    .cookie-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .cookie-button {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #222;
      border-radius: 7px;
      font: inherit;
      cursor: pointer;
    }
    .cookie-primary { background: #222; color: #fff; }
    .cookie-secondary { background: #fff; color: #222; }
    .cookie-settings {
      margin-top: 12px;
      padding: 0;
      border: 0;
      background: none;
      color: #555;
      text-decoration: underline;
      font: inherit;
      cursor: pointer;
    }
    .cookie-toggle { display: flex; align-items: center; gap: 10px; margin: 0 0 18px; cursor: pointer; }
    .cookie-toggle input { width: 18px; height: 18px; }
    @media (max-width: 480px) {
      .cookie-banner { right: 12px; bottom: 12px; width: calc(100vw - 24px); }
    }
  `;

  const html = `
    <div id="cookie-banner" class="cookie-banner" role="dialog" aria-label="Cookievoorkeuren" aria-live="polite" hidden>
      <h2>Cookies &amp; privacy</h2>
      <p>
        Ik gebruik Google Analytics en Microsoft Clarity om te begrijpen hoe
        bezoekers mijn portfolio gebruiken. Hiermee kan ik zien welke pagina's
        bezocht worden en hoe er geklikt en gescrold wordt. Je kiest zelf of je
        dit toestaat.
      </p>
      <div class="cookie-actions">
        <button id="cookie-reject" class="cookie-button cookie-secondary">Weigeren</button>
        <button id="cookie-accept" class="cookie-button cookie-primary">Accepteren</button>
      </div>
      <button id="cookie-settings" class="cookie-settings">Voorkeuren</button>
    </div>
    <div id="cookie-preferences" class="cookie-banner" role="dialog" aria-label="Cookie-instellingen" hidden>
      <h2>Cookie-instellingen</h2>
      <p>
        Noodzakelijke functies van de website blijven actief. Je kunt optionele
        metingen (Google Analytics en Microsoft Clarity) toestaan of weigeren.
      </p>
      <p>
        De homepage toont live wie er nu kijkt, als lichtjes rond mijn hoofd.
        Daarvoor maakt je browser verbinding met een server bij Cloudflare. Die
        gebruikt geen cookies en bewaart niets over jou.
      </p>
      <label class="cookie-toggle">
        <input type="checkbox" id="analytics-consent" />
        Analytische metingen toestaan
      </label>
      <div class="cookie-actions">
        <button id="cookie-save" class="cookie-button cookie-primary">Keuze opslaan</button>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.append(...wrapper.children);

  const banner = document.getElementById("cookie-banner");
  const preferences = document.getElementById("cookie-preferences");
  const analyticsCheckbox = document.getElementById("analytics-consent");

  let analyticsLoaded = false;

  function loadClarity() {
    if (isLocalhost || window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);
  }

  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    window["ga-disable-" + MEASUREMENT_ID] = false;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID);

    const script = document.createElement("script");
    script.async = true;
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);

    loadClarity();
  }

  function stopAnalytics() {
    // Stops any measurement on this page and removes the Google and Clarity cookies.
    if (typeof window.clarity === "function") window.clarity("consent", false);
    window["ga-disable-" + MEASUREMENT_ID] = true;
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (name === "_ga" || name.startsWith("_ga_") || name === "_gid" || name === "_clck" || name === "_clsk") {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      }
    });
  }

  function saveChoice(allowed) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ analytics: allowed, savedAt: new Date().toISOString() }),
      );
    } catch (error) {
      // Storage unavailable: the choice only lasts for this page.
    }

    banner.hidden = true;
    preferences.hidden = true;

    if (allowed) {
      loadAnalytics();
    } else {
      stopAnalytics();
    }
  }

  function openPreferences() {
    banner.hidden = true;
    preferences.hidden = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const choice = saved ? JSON.parse(saved) : null;
      analyticsCheckbox.checked = choice?.analytics === true;
    } catch (error) {
      analyticsCheckbox.checked = false;
    }
    analyticsCheckbox.focus();
  }

  document.getElementById("cookie-accept").addEventListener("click", () => saveChoice(true));
  document.getElementById("cookie-reject").addEventListener("click", () => saveChoice(false));
  document.getElementById("cookie-settings").addEventListener("click", openPreferences);
  document.getElementById("cookie-save").addEventListener("click", () => saveChoice(analyticsCheckbox.checked));
  document
    .querySelectorAll("#footer-cookie-settings, [data-cookie-settings]")
    .forEach((el) => el.addEventListener("click", openPreferences));

  // Show the banner only when there is no choice yet.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      banner.hidden = false;
    } else if (JSON.parse(saved).analytics === true) {
      loadAnalytics();
    }
  } catch (error) {
    banner.hidden = false;
  }
})();
