(function () {
  const FORM_ENDPOINT = "https://formsubmit.co/ajax/hanzutechou@gmail.com";
  const WAKE_MESSAGE = "I will come back to you as soon as my human wakes up.";

  if (window.__hanzuDuckWidgetLoaded) return;
  window.__hanzuDuckWidgetLoaded = true;

  const duckSvg = `
    <svg class="hanzu-duck-svg" viewBox="0 0 520 520" aria-hidden="true">
      <defs>
        <linearGradient id="widgetDuckBody" x1="104" x2="420" y1="96" y2="424" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#fff06a"/><stop offset=".5" stop-color="#ffcc00"/><stop offset="1" stop-color="#f28b00"/>
        </linearGradient>
        <linearGradient id="widgetDuckBeak" x1="338" x2="476" y1="172" y2="268" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ff6533"/><stop offset="1" stop-color="#ff0033"/>
        </linearGradient>
      </defs>
      <ellipse class="hanzu-duck-shadow" cx="260" cy="420" rx="170" ry="28"/>
      <g class="hanzu-duck-body">
        <path d="M74 304c0-58 45-106 112-122 13-58 63-101 123-101 68 0 121 50 129 115l65 24-23 63-73 10c-29 60-99 103-185 103H112l-38-38z" fill="url(#widgetDuckBody)"/>
        <path d="M171 193c24-62 95-97 160-73 31 12 55 34 70 63-23-20-56-33-92-33-54 0-102 24-138 43z" fill="#fff7a2" fill-opacity=".66"/>
        <path d="M94 334c38 32 84 45 139 45 77 0 142-31 176-78-17 60-88 105-187 105H112l-38-38z" fill="#8a4c00" fill-opacity=".2"/>
        <path class="hanzu-duck-beak" d="M414 195h57l32 31-23 57-76 10c10-29 13-66 10-98z" fill="url(#widgetDuckBeak)"/>
      </g>
      <path class="hanzu-duck-circuit" d="M146 318h188l45-34M150 352h112M188 260h93M185 280h62"/>
      <g class="hanzu-duck-eye"><circle cx="302" cy="164" r="31"/><circle class="hanzu-duck-pupil" cx="312" cy="154" r="9"/><path class="hanzu-duck-lid" d="M270 163c10-24 52-24 64 0"/></g>
      <g class="hanzu-duck-eye"><circle cx="367" cy="166" r="25"/><circle class="hanzu-duck-pupil" cx="374" cy="158" r="7"/><path class="hanzu-duck-lid" d="M340 165c9-20 43-20 53 0"/></g>
      <path class="hanzu-duck-smile" d="M427 237c16 12 38 12 52 0"/>
      <path class="hanzu-duck-frame" d="M50 128V54h74M398 54h74v74M472 394v74h-74M124 468H50v-74"/>
    </svg>`;

  const style = document.createElement("style");
  style.textContent = `
    .hanzu-duck-nav-button,.hanzu-duck-launcher{border:0;background:transparent;color:inherit;cursor:pointer;padding:0}
    .hanzu-duck-nav-button{display:inline-flex;width:2.35rem;height:2.35rem;margin-left:.55rem;vertical-align:middle;filter:drop-shadow(0 0 10px rgba(255,204,0,.34));animation:hanzuDuckBob 4.2s ease-in-out infinite}
    .hanzu-duck-nav-button .hanzu-duck-svg{width:100%;height:100%}
    .hanzu-duck-launcher{position:fixed;right:1rem;bottom:1rem;z-index:1000;width:5.4rem;height:5.4rem;border:1px solid rgba(255,204,0,.46);background:rgba(0,0,0,.74);clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,12px 100%,0 calc(100% - 12px));box-shadow:0 0 22px rgba(255,0,51,.22),0 0 28px rgba(255,204,0,.14);animation:hanzuDuckBob 4.8s ease-in-out infinite}
    .hanzu-duck-launcher .hanzu-duck-svg{width:100%;height:100%;padding:.28rem}
    .hanzu-duck-hero-stage{position:relative;display:grid;place-items:center;width:100%;height:100%;min-height:28rem;border:0;background:radial-gradient(circle at 52% 34%,rgba(255,204,0,.18),transparent 29%),radial-gradient(circle at 34% 78%,rgba(255,0,51,.16),transparent 24%),linear-gradient(180deg,rgba(8,8,14,.24),rgba(0,0,0,.82));color:inherit;cursor:pointer;overflow:hidden}
    .hanzu-duck-hero-stage:before{content:"";position:absolute;inset:8%;border:1px solid rgba(255,204,0,.18);clip-path:polygon(0 0,calc(100% - 30px) 0,100% 30px,100% calc(100% - 20px),calc(100% - 20px) 100%,0 100%,0 20px)}
    .hanzu-duck-hero-stage:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,204,0,.14),transparent);transform:translateX(-120%);animation:hanzuDuckStageSweep 6.8s linear infinite}
    .hanzu-duck-hero-grid{position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at center,rgba(0,0,0,.95),transparent 76%)}
    .hanzu-duck-hero-stage>.hanzu-duck-svg{position:relative;z-index:1;width:min(92%,28rem);max-height:78%;filter:drop-shadow(0 0 24px rgba(255,204,0,.24));animation:hanzuDuckHeroFloat 4.6s ease-in-out infinite}
    .hanzu-duck-hero-status{position:absolute;left:1rem;right:1rem;bottom:1rem;z-index:2;display:flex;justify-content:space-between;gap:1rem;padding:.76rem .86rem;border:1px solid rgba(255,204,0,.28);background:rgba(0,0,0,.62);clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,12px 100%,0 calc(100% - 12px));text-transform:uppercase;letter-spacing:.18em}.hanzu-duck-hero-status strong{color:#ffcc00;font-size:.76rem}.hanzu-duck-hero-status small{color:#d1d5db;font-size:.68rem}
    .hanzu-duck-shadow{fill:#000;opacity:.34}
    .hanzu-duck-body{filter:drop-shadow(0 0 13px rgba(255,204,0,.34));transform-origin:50% 78%;animation:hanzuDuckBreathe 3.8s ease-in-out infinite}
    .hanzu-duck-eye circle:first-child{fill:#101018}.hanzu-duck-pupil{fill:#ffcc00;animation:hanzuDuckStare 5.7s ease-in-out infinite}.hanzu-duck-lid{fill:none;stroke:#ffcc00;stroke-width:12;stroke-linecap:round;opacity:0;animation:hanzuDuckBlink 5.7s infinite}
    .hanzu-duck-smile{fill:none;stroke:#0a0a0f;stroke-width:9;stroke-linecap:round;animation:hanzuDuckSmile 3.4s ease-in-out infinite}.hanzu-duck-circuit{fill:none;stroke:#15151d;stroke-width:8;stroke-linecap:round;opacity:.58}.hanzu-duck-frame{fill:none;stroke:#ff0033;stroke-width:8;stroke-linecap:square;opacity:.62}
    .hanzu-duck-modal-root{position:fixed;inset:0;z-index:1100;display:none}.hanzu-duck-modal-root.is-open{display:block}.hanzu-duck-scrim{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(5px)}
    .hanzu-duck-dialog{position:absolute;right:1rem;bottom:1rem;width:min(92vw,27rem);border:1px solid rgba(255,0,51,.58);background:linear-gradient(180deg,rgba(8,8,14,.98),rgba(0,0,0,.96));color:#fff;padding:1rem;clip-path:polygon(0 0,calc(100% - 24px) 0,100% 24px,100% 100%,18px 100%,0 calc(100% - 18px));box-shadow:0 0 34px rgba(255,0,51,.22);font-family:"IBM Plex Mono",monospace}
    .hanzu-duck-dialog-head{display:flex;align-items:center;gap:.8rem;margin-bottom:.8rem}.hanzu-duck-dialog-head .hanzu-duck-svg{width:4rem;height:4rem;flex:0 0 4rem}.hanzu-duck-dialog h2{font-family:"IBM Plex Sans",sans-serif;margin:0;color:#ffcc00;text-transform:uppercase;font-size:1.15rem;letter-spacing:.08em}.hanzu-duck-dialog p{margin:.25rem 0 0;color:#d1d5db;font-size:.82rem;line-height:1.55}
    .hanzu-duck-close{position:absolute;top:.65rem;right:.65rem;width:2rem;height:2rem;border:1px solid rgba(255,204,0,.36);background:transparent;color:#ffcc00;cursor:pointer}
    .hanzu-duck-field{display:block;margin-top:.72rem}.hanzu-duck-field span{display:block;color:#9ca3af;text-transform:uppercase;letter-spacing:.18em;font-size:.66rem;margin-bottom:.28rem}.hanzu-duck-field input,.hanzu-duck-field textarea{width:100%;border:1px solid rgba(255,204,0,.26);background:rgba(255,255,255,.04);color:#fff;padding:.72rem;font:inherit;font-size:.84rem;outline:none}.hanzu-duck-field textarea{min-height:7rem;resize:vertical}.hanzu-duck-field input:focus,.hanzu-duck-field textarea:focus{border-color:rgba(255,204,0,.74);box-shadow:0 0 0 2px rgba(255,204,0,.1)}
    .hanzu-duck-submit{width:100%;margin-top:.86rem;padding:.85rem 1rem;border:2px solid #ffcc00;background:linear-gradient(135deg,#ff0033,#ff4a32 60%,#ffcc00 120%);color:#000;text-transform:uppercase;letter-spacing:.18em;font-weight:700;cursor:pointer}.hanzu-duck-note{min-height:1.4rem;color:#ffcc00!important}
    @keyframes hanzuDuckBob{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-5px) rotate(1.5deg)}}@keyframes hanzuDuckHeroFloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-10px) rotate(1.4deg)}}@keyframes hanzuDuckStageSweep{0%{transform:translateX(-120%);opacity:0}22%{opacity:.18}100%{transform:translateX(120%);opacity:0}}@keyframes hanzuDuckBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}@keyframes hanzuDuckStare{0%,18%,100%{transform:translate(0,0)}28%,40%{transform:translate(4px,2px)}52%,64%{transform:translate(-3px,1px)}}@keyframes hanzuDuckBlink{0%,7%,10%,100%{opacity:0}8%,9%{opacity:1}}@keyframes hanzuDuckSmile{0%,100%{d:path("M427 237c16 12 38 12 52 0")}50%{d:path("M424 233c18 20 42 20 58 0")}}
    @media (max-width:640px){.hanzu-duck-launcher{width:4.8rem;height:4.8rem;right:.75rem;bottom:.75rem}.hanzu-duck-dialog{right:.75rem;bottom:.75rem;width:calc(100vw - 1.5rem)}}
    @media (prefers-reduced-motion:reduce){.hanzu-duck-nav-button,.hanzu-duck-launcher,.hanzu-duck-body,.hanzu-duck-pupil,.hanzu-duck-lid,.hanzu-duck-smile{animation:none!important}}
  `;
  document.head.appendChild(style);

  function makeButton(className, label, tagName = "button") {
    const button = document.createElement(tagName);
    if (tagName === "button") button.type = "button";
    if (tagName !== "button") {
      button.setAttribute("role", "button");
      button.setAttribute("tabindex", "0");
    }
    button.className = className;
    button.setAttribute("aria-label", label);
    button.innerHTML = duckSvg;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openModal();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      openModal();
    });
    return button;
  }

  function installNavDuck() {
    const brand = document.querySelector(".brand-mark");
    if (!brand || brand.querySelector(".hanzu-duck-nav-button")) return;
    brand.appendChild(makeButton("hanzu-duck-nav-button", "Ask Hanzu Duck", "span"));
  }

  function installLauncher() {
    if (document.querySelector(".hanzu-duck-launcher")) return;
    document.body.appendChild(makeButton("hanzu-duck-launcher", "Ask Hanzu Duck a question"));
  }

  function installHeroStages() {
    document.querySelectorAll("[data-hanzu-duck-stage]").forEach((stage) => {
      if (stage.querySelector(".hanzu-duck-svg")) return;
      stage.innerHTML = `<span class="hanzu-duck-hero-grid" aria-hidden="true"></span>${duckSvg}<span class="hanzu-duck-hero-status"><strong>Hanzu Duck</strong><small>tap to ask</small></span>`;
      stage.addEventListener("click", openModal);
    });
  }

  const modal = document.createElement("div");
  modal.className = "hanzu-duck-modal-root";
  modal.innerHTML = `
    <div class="hanzu-duck-scrim" data-duck-close></div>
    <section class="hanzu-duck-dialog" role="dialog" aria-modal="true" aria-labelledby="hanzu-duck-title">
      <button type="button" class="hanzu-duck-close" data-duck-close aria-label="Close">X</button>
      <div class="hanzu-duck-dialog-head">${duckSvg}<div><h2 id="hanzu-duck-title">Ask the duck</h2><p>${WAKE_MESSAGE}</p></div></div>
      <form class="hanzu-duck-form">
        <input type="hidden" name="_subject" value="Hanzu Duck website question">
        <label class="hanzu-duck-field"><span>Name</span><input name="name" autocomplete="name" required></label>
        <label class="hanzu-duck-field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
        <label class="hanzu-duck-field"><span>Question</span><textarea name="message" required></textarea></label>
        <button class="hanzu-duck-submit" type="submit">Send question</button>
        <p class="hanzu-duck-note" role="status"></p>
      </form>
    </section>`;
  document.body.appendChild(modal);

  const form = modal.querySelector("form");
  const note = modal.querySelector(".hanzu-duck-note");

  function openModal() {
    modal.classList.add("is-open");
    setTimeout(() => modal.querySelector("input[name='name']")?.focus(), 30);
  }

  function closeModal() {
    modal.classList.remove("is-open");
  }

  modal.querySelectorAll("[data-duck-close]").forEach((node) => node.addEventListener("click", closeModal));
  window.addEventListener("hanzu-duck:open", openModal);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    note.textContent = "Sending...";
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      if (!response.ok) throw new Error("Bad response");
      form.reset();
      note.textContent = WAKE_MESSAGE;
    } catch (error) {
      note.textContent = "Transmission failed. Please email info@hanzutech.com.";
    } finally {
      button.disabled = false;
    }
  });

  installNavDuck();
  installLauncher();
  installHeroStages();
})();
