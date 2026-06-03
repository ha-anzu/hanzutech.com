"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Cuboid, Menu, Workflow, X } from "lucide-react";
import { animate, createTimeline, stagger, utils } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";

const JewelryShowcase = dynamic(
  () => import("@/components/InteractiveModels").then((mod) => mod.JewelryShowcase),
  { ssr: false, loading: () => <div className="showcase-canvas is-loading" /> }
);

const PipelineShowcase = dynamic(
  () => import("@/components/InteractiveModels").then((mod) => mod.PipelineShowcase),
  { ssr: false, loading: () => <div className="pipeline-canvas is-loading" /> }
);

const services = [
  {
    label: "Design and Graphics",
    title: "Brand systems and campaign visuals",
    body: "Editorial layouts and identity structure.",
    href: "/services/design-graphics",
    media: "/assets/placeholders/services/design-graphics/overview.svg",
    tone: "red"
  },
  {
    label: "CAD and 3D Modeling",
    title: "Precision models for production",
    body: "Tolerance-aware geometry and clean handoff.",
    href: "/services/cad-3d-modeling",
    media: "/assets/placeholders/services/cad-3d-modeling/overview.svg",
    tone: "yellow",
    model: true
  },
  {
    label: "Rendering and Visualization",
    title: "Visuals built for decisions",
    body: "Hero stills and presentation-ready render sets.",
    href: "/services/rendering-visualization",
    media: "/assets/placeholders/services/rendering-visualization/overview.svg",
    tone: "red"
  },
  {
    label: "Organic 3D Modelling",
    title: "Sculptural form development",
    body: "Primary-to-detail sculpt workflow.",
    href: "/services/organic-3d-modelling",
    media: "/assets/placeholders/services/organic-3d-modelling/overview.svg",
    tone: "yellow",
    model: true
  },
  {
    label: "Automation",
    title: "Workflow automation",
    body: "Service lane is being prepared.",
    href: "/services/automation",
    media: "/assets/placeholders/services/automation/overview.svg",
    tone: "red",
    comingSoon: true
  }
];

const featureCards = [
  {
    kicker: "Mission",
    title: "Solve Real Operational Problems",
    body: "Build tools that cut waste and protect margin.",
    media: "/assets/placeholders/home-mission-overview.svg",
    tone: "red"
  },
  {
    kicker: "Current Focus",
    title: "Jewelry Workflows First",
    body: "Quoting, production, and admin flows for workshops.",
    media: "/assets/placeholders/home-current-focus.svg",
    tone: "yellow"
  },
  {
    kicker: "Services",
    title: "Design, Build, Ship",
    body: "From CAD and render to production-ready systems.",
    media: "/assets/placeholders/home-services-stack.svg",
    tone: "red"
  }
];

const pipelineSteps = [
  {
    kicker: "How It Works",
    title: "Research Meets Workshop Reality",
    body: "AI speed, production constraints, practical output.",
    media: "/assets/placeholders/home-research-logic.svg"
  },
  {
    kicker: "Pipeline",
    title: "Design To Factory To Client",
    body: "One flow from concept to delivery.",
    media: "/assets/placeholders/home-pipeline-handoff.svg"
  },
  {
    kicker: "Target",
    title: "Useful Tech Only",
    body: "Only tools that save time or raise quality.",
    media: "/assets/placeholders/home-useful-tech-only.svg"
  }
];

const proofItems = [
  {
    label: "WhatsApp Comment",
    summary: "Client approved faster after cleaner files.",
    meta: "WhatsApp // workshop thread",
    time: "08:41",
    content:
      "The client loved the render pack. They signed off right away because everything was easy to understand this time.",
    response:
      "That is exactly the target. Less back and forth, more clean approvals, more margin protection."
  },
  {
    label: "CGTrader Review",
    summary: "Production-ready files and communication.",
    cgtrader: true,
    content:
      '"Excellent detail, fast revisions, and a model that actually worked for production instead of just looking good on screen."'
  },
  {
    label: "WhatsApp Comment",
    summary: "The tool removed hours of quote cleanup.",
    meta: "WhatsApp // admin ops",
    time: "19:14",
    content:
      "Quote prep is way faster now. We stopped rewriting the same things and the team finally has a clean flow."
  }
];

const faqs = [
  ["What exactly is Hanzu Tech building?", "Production-aware tools and systems for real workflow pain."],
  ["Why focus on jewelry first?", "Because quoting, handoff, and admin bottlenecks are immediate and measurable."],
  ["Where does AI actually help here?", "AI accelerates research and automation. Production logic still decides quality."],
  ["Is this design only or full product execution?", "Both. Design and execution stay in one pipeline."]
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } }
};

function DuckFace({ className = "" }) {
  return (
    <svg className={`duck-face ${className}`} viewBox="0 0 520 520" role="img" aria-label="Friendly Hanzu rubber duck">
      <defs>
        <linearGradient id="duckBody" x1="104" x2="420" y1="96" y2="424" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff06a" />
          <stop offset="0.5" stopColor="#ffcc00" />
          <stop offset="1" stopColor="#f28b00" />
        </linearGradient>
        <linearGradient id="duckBeak" x1="338" x2="476" y1="172" y2="268" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff6533" />
          <stop offset="1" stopColor="#ff0033" />
        </linearGradient>
        <filter id="duckGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 1 0 .82 0 0 .32 0 0 0 0 .02 0 0 0 .62 0" result="gold" />
          <feMerge>
            <feMergeNode in="gold" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="duck-shadow">
        <ellipse cx="260" cy="420" rx="170" ry="28" />
      </g>
      <g className="duck-body" filter="url(#duckGlow)">
        <path d="M74 304c0-58 45-106 112-122 13-58 63-101 123-101 68 0 121 50 129 115l65 24-23 63-73 10c-29 60-99 103-185 103H112l-38-38z" fill="url(#duckBody)" />
        <path d="M171 193c24-62 95-97 160-73 31 12 55 34 70 63-23-20-56-33-92-33-54 0-102 24-138 43z" fill="#fff7a2" fillOpacity="0.66" />
        <path d="M94 334c38 32 84 45 139 45 77 0 142-31 176-78-17 60-88 105-187 105H112l-38-38z" fill="#8a4c00" fillOpacity="0.2" />
        <path className="duck-beak" d="M414 195h57l32 31-23 57-76 10c10-29 13-66 10-98z" fill="url(#duckBeak)" />
      </g>
      <g className="duck-circuit">
        <path d="M146 318h188l45-34M150 352h112M188 260h93M185 280h62" />
        <path d="M154 428h216l31-31M126 118h86l26-26M392 126h44" />
      </g>
      <g className="duck-eye duck-eye-left">
        <circle cx="302" cy="164" r="31" />
        <circle className="duck-pupil" cx="312" cy="154" r="9" />
        <path className="duck-lid" d="M270 163c10-24 52-24 64 0" />
      </g>
      <g className="duck-eye duck-eye-right">
        <circle cx="367" cy="166" r="25" />
        <circle className="duck-pupil" cx="374" cy="158" r="7" />
        <path className="duck-lid" d="M340 165c9-20 43-20 53 0" />
      </g>
      <path className="duck-smile" d="M427 237c16 12 38 12 52 0" />
      <g className="duck-corners" aria-hidden="true">
        <path d="M50 128V54h74M398 54h74v74M472 394v74h-74M124 468H50v-74" />
      </g>
    </svg>
  );
}

function HanzuDuckStage() {
  const openDuck = () => {
    window.dispatchEvent(new CustomEvent("hanzu-duck:open"));
  };

  return (
    <button type="button" className="duck-stage" onClick={openDuck} aria-label="Ask Hanzu Duck a question">
      <span className="duck-stage-grid" aria-hidden="true" />
      <DuckFace className="duck-stage-face" />
      <span className="duck-stage-status">
        <strong>Hanzu Duck</strong>
        <small>tap to ask</small>
      </span>
    </button>
  );
}

function useTypewriter(text) {
  const [value, setValue] = useState("");

  useEffect(() => {
    let index = 0;
    let timer;

    const tick = () => {
      setValue(text.slice(0, index));
      if (index < text.length) {
        index += 1;
        timer = window.setTimeout(tick, index === text.length ? 85 : 58);
      } else {
        setValue(text);
      }
    };

    tick();
    return () => window.clearTimeout(timer);
  }, [text]);

  return value;
}

function useAnimeSignature() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const hero = document.querySelector("[data-anime-hero]");
    const cards = utils.$(".anime-card");
    const lines = utils.$(".pipeline-signal-line");

    const timeline = createTimeline({
      defaults: { ease: "outExpo" }
    });

    timeline
      .add(".hero-chrome-frame", { opacity: [0, 1], y: [18, 0], duration: 900 })
      .add(".anime-hero-fragment", { opacity: [0, 1], y: [18, 0], filter: ["blur(8px)", "blur(0px)"], duration: 760, delay: stagger(75) }, "-=520")
      .add(".hero-reel-panel", { opacity: [0, 1], x: [26, 0], duration: 860 }, "-=620")
      .add(".anime-orbit-rail", { rotate: [8, 0], opacity: [0, 1], duration: 900 }, "-=660");

    const pointerMove = (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 18;
      const y = (event.clientY / window.innerHeight - 0.5) * 18;
      document.documentElement.style.setProperty("--pointer-x", `${x}px`);
      document.documentElement.style.setProperty("--pointer-y", `${y}px`);
    };

    window.addEventListener("pointermove", pointerMove, { passive: true });

    const observers = [];
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animate(entry.target.querySelectorAll(".anime-card"), {
            opacity: [0, 1],
            translateY: [28, 0],
            scale: [0.985, 1],
            duration: 820,
            delay: stagger(70),
            ease: "outExpo"
          });
          observers.forEach((observer) => observer.unobserve(entry.target));
        });
      },
      { threshold: 0.18 }
    );

    document.querySelectorAll("[data-anime-scope]").forEach((node) => {
      revealObserver.observe(node);
      observers.push(revealObserver);
    });

    if (lines.length) {
      animate(lines, {
        strokeDashoffset: [220, 0],
        opacity: [0.18, 0.9],
        duration: 1800,
        delay: stagger(120),
        ease: "inOutQuad",
        loop: true,
        alternate: true
      });
    }

    if (hero) {
      animate(".dynamic-backdrop .scan-beam", {
        translateX: ["-120%", "120%"],
        opacity: [0, 0.85, 0],
        duration: 4200,
        ease: "inOutQuad",
        loop: true,
        delay: 600
      });
    }

    cards.forEach((card) => {
      card.addEventListener("pointerenter", () => {
        animate(card, { translateY: -9, scale: 1.018, duration: 360, ease: "outExpo" });
        animate(card.querySelectorAll(".anime-card-detail"), { translateX: [0, 8, 0], duration: 460, delay: stagger(45), ease: "outQuad" });
      });
      card.addEventListener("pointerleave", () => {
        animate(card, { translateY: 0, scale: 1, duration: 420, ease: "outExpo" });
      });
    });

    return () => {
      window.removeEventListener("pointermove", pointerMove);
      revealObserver.disconnect();
    };
  }, []);
}

function DynamicBackdrop({ variant = "default" }) {
  return (
    <div className={`dynamic-backdrop backdrop-${variant}`} aria-hidden="true">
      <span className="scan-beam" />
      <span className="chrome-orbit anime-orbit-rail" />
      <span className="data-ticks" />
    </div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("hero");
  const { scrollY } = useScroll();
  const navOpacity = useTransform(scrollY, [0, 140], [0.9, 0.98]);

  useEffect(() => {
    const sections = ["hero", "services", "mission", "pipeline", "proof", "faq", "journal"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-38% 0px -54% 0px" }
    );
    sections.forEach((id) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  const navItems = [
    ["Services", "#services"],
    ["OpenTools", "/opentools"],
    ["Intro Reel", "/reel"],
    ["Contact Shard", "/about"]
  ];

  return (
    <motion.div
      style={{ opacity: navOpacity }}
      className="fixed top-0 left-0 w-full bg-black p-4 z-50 border-b border-red-600/30 backdrop-blur-md"
    >
      <div className={`nav-shell ${open ? "is-open mobile-js" : "mobile-js"}`} data-nav-shell>
        <a href="/" className="text-3xl font-bold brand-mark" aria-label="Hanzu Tech Home">
          <span className="brand-hanzu">HANZU</span>
          <span className="brand-tech">TECH</span>
        </a>
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav-links"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Toggle menu</span>
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <div className="service-hub">
          <a href="#services" className="service-trigger">
            <Cuboid className="service-trigger-icon" aria-hidden="true" />
            Services
          </a>
          <div className="service-mega">
            <div className="service-caption">
              <p className="text-[11px] uppercase tracking-[0.34em] text-gray-500">At Your Service</p>
              <p className="mt-2 text-sm text-gray-300">Design, build, automate, and ship.</p>
            </div>
            <div className="service-grid">
              {services.map((service) => (
                <a key={service.label} href={service.href} className="service-link neon-yellow">
                  <span className="service-thumb">
                    <Cuboid aria-hidden="true" />
                  </span>
                  <span className="service-label">
                    {service.comingSoon ? "Automation (Coming Soon)" : service.label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div id="site-nav-links" className="nav-right text-sm md:text-base">
          {navItems.slice(1).map(([label, href]) => (
            <a key={label} href={href} className="neon-yellow">
              {label}
            </a>
          ))}
        </div>
        <span className="active-rail" style={{ "--active-index": Math.max(0, navItems.findIndex(([, href]) => href === `#${active}`)) }} />
        <span className="mobile-menu-scrim" aria-hidden="true" />
      </div>
    </motion.div>
  );
}

function Hero() {
  const typed = useTypewriter("AKA JACK OF ALL TRADES");

  return (
    <section id="hero" data-anime-hero className="hero-shell min-h-[calc(100svh-7rem)] flex items-center px-6 py-8">
      <DynamicBackdrop variant="hero" />
      <div className="page-wrap hero-layout">
        <motion.div
          className="console-panel hero-chrome-frame w-full px-6 py-10 md:px-12 md:py-14"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.09 } } }}
        >
          <motion.div variants={reveal} className="anime-hero-fragment flex flex-wrap gap-3 mb-8 text-[11px] uppercase tracking-[0.34em]">
            <span className="signal px-3 py-1 rounded-full">Jewelry Ops</span>
            <span className="signal px-3 py-1 rounded-full">Factory-Ready Design</span>
          </motion.div>
          <div className="hero-copy">
            <div className="hero-tagline">
              <motion.span variants={reveal} className="technically anime-hero-fragment" data-text="TECHNICALLY">
                TECHNICALLY
              </motion.span>
              <motion.h1 variants={reveal} className="designer-glow anime-hero-fragment text-6xl md:text-[5.8rem] uppercase leading-none mt-2">
                Designer
              </motion.h1>
              <motion.p variants={reveal} className="hero-story anime-hero-fragment">
                Design direction, technical problem-solving, and production logic in one lane instead of split across five people.
              </motion.p>
              <motion.p variants={reveal} className="aka-signature anime-hero-fragment mt-8">
                <span className="aka-typing">{typed}</span>
              </motion.p>
            </div>
            <motion.p variants={reveal} className="hero-footnote anime-hero-fragment mt-8">
              AI stays in the stack as support for research, automation, and workflow speed when it is actually useful.
            </motion.p>
            <motion.div variants={reveal} className="hero-actions anime-hero-fragment mt-10">
              <a href="#services" className="button">Services</a>
              <a href="/reel" className="button button-secondary button-reel">Intro Reel</a>
              <a href="/opentools" className="button button-tertiary">OpenTools</a>
            </motion.div>
            <motion.a variants={reveal} href="/about" className="contact-shard">
              Contact Shard
            </motion.a>
          </div>
        </motion.div>
        <motion.aside className="hero-media" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
          <div className="hero-reel-panel interactive-reel">
            <span className="hero-reel-rails" aria-hidden="true" />
            <div className="hero-reel-label">
              <strong>Hanzu Duck</strong>
              <span>01 / Ask Mode</span>
            </div>
            <div className="hero-tall-screen placeholder-screen">
              <HanzuDuckStage />
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}

function ServiceModal({ service, onClose }) {
  return (
    <AnimatePresence>
      {service && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="service-modal"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={onClose} aria-label="Close service preview">
              <X aria-hidden="true" />
            </button>
            <div>
              <p className="mini-kicker mb-2">{service.label}</p>
              <h2 className={`text-3xl ${service.tone === "yellow" ? "neon-yellow" : "neon-red"}`}>{service.title}</h2>
              <p className="mt-4 text-sm text-gray-300 leading-6">{service.body}</p>
              <a className="quiet-link mt-6 inline-block" href={service.href}>Enter</a>
            </div>
            <div className="modal-visual">
              {service.model ? <JewelryShowcase active={service.label.includes("Organic") ? 2 : 1} /> : <img src={service.media} alt={`${service.label} preview`} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Services() {
  const [selected, setSelected] = useState(null);

  return (
    <section id="services" className="px-6 pt-16 pb-16 relative z-10 section-grid">
      <div className="page-wrap">
        <motion.div className="mb-8" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={reveal}>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-500 mb-3">Services</p>
          <h2 className="neon-red text-5xl md:text-7xl tracking-[0.04em] uppercase">Service Directory</h2>
          <p className="text-gray-300 mt-3">Focused execution lanes.</p>
        </motion.div>
        <motion.div
          className="interactive-service-grid"
          data-anime-scope
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-120px" }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {services.map((service) => (
          <motion.button
              type="button"
              key={service.label}
              className="card service-card-button anime-card text-left"
              variants={reveal}
              whileHover={{ y: -8, scale: 1.018, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
              onClick={() => setSelected(service)}
            >
              <div className="card-visual">
                <img src={service.media} alt={`${service.label} preview`} loading="lazy" />
              </div>
              <p className="anime-card-detail text-xs uppercase tracking-[0.28em] text-gray-500">{service.label}</p>
              <h3 className={`anime-card-detail text-2xl ${service.tone === "yellow" ? "neon-yellow" : "neon-red"} mt-2`}>{service.title}</h3>
              <p className="anime-card-detail text-gray-300 mt-3">{service.body}</p>
              <p className="anime-card-detail quiet-link mt-5">{service.comingSoon ? "Coming Soon" : "Open Capture"}</p>
            </motion.button>
          ))}
        </motion.div>
      </div>
      <ServiceModal service={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function Mission() {
  return (
    <section id="mission" className="px-6 pt-8 pb-16 relative z-10">
      <DynamicBackdrop variant="mission" />
      <motion.div
        className="page-wrap grid md:grid-cols-3 gap-6"
        data-anime-scope
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-120px" }}
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      >
        {featureCards.map((card) => (
          <motion.article key={card.title} className="card anime-card" variants={reveal}>
            <div className="card-visual">
              <img src={card.media} alt={`${card.kicker} placeholder`} loading="lazy" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 mb-2">{card.kicker}</p>
            <h2 className={`text-2xl ${card.tone === "yellow" ? "neon-yellow" : "neon-red"} mb-2`}>{card.title}</h2>
            <p className="text-sm text-gray-300 leading-6">{card.body}</p>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}

function OperatorStack() {
  return (
    <section className="px-6 pb-16 relative">
      <div className="page-wrap">
        <motion.div className="story-panel" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-120px" }} variants={reveal}>
          <div className="story-layout">
            <div className="story-copy">
              <p className="hero-kicker mb-3">Operator Stack</p>
              <h2 className="hero-title uppercase text-gray-100">Factory-ready systems for jewelry operations.</h2>
              <p className="hero-subtitle mt-3">Minimal copy. Maximum reel visibility.</p>
              <div className="hero-track" aria-label="Homepage narrative">
                {["Legitimacy", "Portfolio", "Working Systems"].map((title, index) => (
                  <div className="hero-track-item" key={title}>
                    <strong>{title}</strong>
                    <span>{["Proof-first presentation.", "Case-study output.", "Production-safe tooling."][index]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="story-reel">
              <div className="reel-caption">
                <strong>System Reel</strong>
                <span>16:9 Placeholder</span>
              </div>
              <div className="wide-screen placeholder-screen">
                <video className="reel-video" autoPlay muted loop playsInline preload="metadata" aria-label="Operator stack horizontal reel placeholder">
                  <source src="/assets/reels/operator-stack-horizontal-placeholder.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Pipeline() {
  const [active, setActive] = useState(1);

  return (
    <section id="pipeline" className="px-6 pb-16 relative">
      <DynamicBackdrop variant="pipeline" />
      <div className="page-wrap pipeline-layout">
        <div className="pipeline-viz">
          <svg className="pipeline-signal-svg" viewBox="0 0 400 640" aria-hidden="true">
            <path className="pipeline-signal-line" d="M72 92 C210 160 154 286 322 352 C216 416 250 520 88 582" />
            <path className="pipeline-signal-line" d="M328 82 C176 194 248 292 96 366 C222 446 174 526 318 594" />
          </svg>
          <PipelineShowcase active={active} />
        </div>
        <motion.div
          className="pipeline-list"
          data-anime-scope
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-120px" }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {pipelineSteps.map((step, index) => (
            <motion.button
              key={step.title}
              type="button"
              className={`card pipeline-step anime-card ${active === index ? "is-active" : ""}`}
              variants={reveal}
              onClick={() => setActive(index)}
            >
              <div className="card-visual">
                <img src={step.media} alt={`${step.kicker} placeholder`} loading="lazy" />
              </div>
              <p className="mini-kicker mb-2">{step.kicker}</p>
              <h2 className={`text-xl ${index === 1 ? "neon-red" : "neon-yellow"} mb-2`}>{step.title}</h2>
              <p className="text-sm text-gray-300 leading-6">{step.body}</p>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function AnimatedAccordion({ items, type }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = open === index;
        const isFaq = type === "faq";
        const title = isFaq ? item[0] : item.summary;
        const body = isFaq ? item[1] : item.content;
        return (
          <motion.div key={title} className={isFaq ? "faq-item" : "proof-drop"} animate={isOpen ? "open" : "closed"}>
            <button className="accordion-trigger" onClick={() => setOpen(isOpen ? -1 : index)}>
              <span>
                {!isFaq && <span className="block text-xs uppercase tracking-[0.34em] text-gray-500">{item.label}</span>}
                <span className="block mt-1 text-base text-white">{title}</span>
              </span>
              <span className="accordion-index">
                {isFaq ? String(index + 1).padStart(2, "0") : "Open Capture"}
                <ChevronDown aria-hidden="true" />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className="accordion-content"
                >
                  {isFaq ? (
                    <div className="faq-copy">{body}</div>
                  ) : item.cgtrader ? (
                    <div className="proof-shot">
                      <div className="border border-yellow-400/20 bg-[#0d0d12] p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm uppercase tracking-[0.22em] text-gray-500">CGTrader // rating</p>
                          <p className="neon-yellow">5 / 5</p>
                        </div>
                        <p className="mt-4 text-white">{body}</p>
                        <p className="mt-3 text-sm text-gray-400">Verified marketplace feedback style block</p>
                      </div>
                    </div>
                  ) : (
                    <div className="proof-shot">
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-4">
                        <span>{item.meta}</span>
                        <span>{item.time}</span>
                      </div>
                      <div className="max-w-xl bg-[#111827] border border-green-400/20 rounded-2xl px-4 py-3 text-sm text-gray-200 ml-auto">{body}</div>
                      {item.response && (
                        <div className="max-w-lg bg-[#1f2937] border border-white/10 rounded-2xl px-4 py-3 text-sm text-gray-300 mt-3">{item.response}</div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

function ProofAndFaq() {
  return (
    <>
      <section id="proof" className="px-6 pb-16 relative section-grid">
        <div className="page-wrap">
          <div className="mb-8">
            <p className="mini-kicker mb-2">Customer Satisfaction</p>
            <h2 className="text-3xl md:text-5xl neon-red">Proof From The Field</h2>
            <p className="mt-2 max-w-3xl text-sm text-gray-300 leading-6">Selected comments from repeat clients.</p>
          </div>
          <AnimatedAccordion items={proofItems} type="proof" />
        </div>
      </section>
      <section id="faq" className="px-6 pb-24">
        <div className="page-wrap">
          <div className="mb-8">
            <p className="mini-kicker mb-2">FAQ</p>
            <h2 className="text-3xl md:text-5xl neon-yellow">Frequently Asked Questions</h2>
          </div>
          <AnimatedAccordion items={faqs} type="faq" />
        </div>
      </section>
    </>
  );
}

function Journal() {
  return (
    <section id="journal" className="px-6 pb-24">
      <div className="page-wrap max-w-6xl">
        <motion.div className="card" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-120px" }} variants={reveal}>
          <div className="card-visual">
            <img src="/assets/placeholders/journal-feed-preview.svg" alt="Journal preview placeholder" loading="lazy" />
          </div>
          <p className="mini-kicker mb-2">Updates / Journal</p>
          <h2 className="text-xl neon-red">Archive entry point is live.</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-300 leading-6">Replace placeholder media and publish entries as needed.</p>
          <div className="mt-4">
            <a href="/journal" className="text-sm uppercase tracking-[0.24em] text-gray-400 hover:text-yellow-300 transition-colors">
              Open Journal
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  useAnimeSignature();

  return (
    <>
      <Navbar />
      <main className="pt-28">
        <Hero />
        <Services />
        <Mission />
        <OperatorStack />
        <Pipeline />
        <ProofAndFaq />
        <Journal />
      </main>
      <footer className="bg-black p-4 text-xs text-gray-500 mt-8 border-t border-red-600/20">
        <div className="max-w-6xl mx-auto space-y-2 text-center md:text-left md:pl-8">
          <p>Designed by Hanzu</p>
          <p>
            <a href="/privacy">Privacy</a> &bull; <a href="/legal">Legal</a> &bull; <a href="/journal">Journal</a>
          </p>
        </div>
      </footer>
    </>
  );
}
