"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Cuboid, Menu, Workflow, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

function useTypewriter(text) {
  const [value, setValue] = useState("");

  useEffect(() => {
    let index = 0;
    let direction = 1;
    let timer;

    const tick = () => {
      setValue(text.slice(0, index));
      if (direction === 1 && index < text.length) {
        index += 1;
        timer = window.setTimeout(tick, index === text.length ? 1200 : 75);
      } else if (direction === 1) {
        direction = -1;
        timer = window.setTimeout(tick, 1200);
      } else if (index > 0) {
        index -= 1;
        timer = window.setTimeout(tick, 28);
      } else {
        direction = 1;
        timer = window.setTimeout(tick, 480);
      }
    };

    tick();
    return () => window.clearTimeout(timer);
  }, [text]);

  return value;
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
      </div>
    </motion.div>
  );
}

function Hero() {
  const typed = useTypewriter("AKA JACK OF ALL TRADES");

  return (
    <section id="hero" className="hero-shell min-h-[calc(100svh-7rem)] flex items-center px-6 py-8">
      <div className="page-wrap hero-layout">
        <motion.div
          className="console-panel w-full px-6 py-10 md:px-12 md:py-14"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.09 } } }}
        >
          <motion.div variants={reveal} className="flex flex-wrap gap-3 mb-8 text-[11px] uppercase tracking-[0.34em]">
            <span className="signal px-3 py-1 rounded-full">Jewelry Ops</span>
            <span className="signal px-3 py-1 rounded-full">Factory-Ready Design</span>
          </motion.div>
          <div className="hero-copy">
            <div className="hero-tagline">
              <motion.span variants={reveal} className="technically" data-text="TECHNICALLY">
                TECHNICALLY
              </motion.span>
              <motion.h1 variants={reveal} className="designer-glow text-6xl md:text-[5.8rem] uppercase leading-none mt-2">
                Designer
              </motion.h1>
              <motion.p variants={reveal} className="hero-story">
                Design direction, technical problem-solving, and production logic in one lane instead of split across five people.
              </motion.p>
              <motion.p variants={reveal} className="aka-signature mt-8">
                <span className="aka-typing">{typed}</span>
              </motion.p>
            </div>
            <motion.p variants={reveal} className="hero-footnote mt-8">
              AI stays in the stack as support for research, automation, and workflow speed when it is actually useful.
            </motion.p>
            <motion.div variants={reveal} className="hero-actions mt-10">
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
              <strong>CAD Orbit</strong>
              <span>01 / Live Model</span>
            </div>
            <div className="hero-tall-screen placeholder-screen">
              <JewelryShowcase compact />
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
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-120px" }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {services.map((service) => (
            <motion.button
              type="button"
              key={service.label}
              className="card service-card-button text-left"
              variants={reveal}
              whileHover={{ y: -8, scale: 1.018, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
              onClick={() => setSelected(service)}
            >
              <div className="card-visual">
                <img src={service.media} alt={`${service.label} preview`} loading="lazy" />
              </div>
              <p className="text-xs uppercase tracking-[0.28em] text-gray-500">{service.label}</p>
              <h3 className={`text-2xl ${service.tone === "yellow" ? "neon-yellow" : "neon-red"} mt-2`}>{service.title}</h3>
              <p className="text-gray-300 mt-3">{service.body}</p>
              <p className="quiet-link mt-5">{service.comingSoon ? "Coming Soon" : "Open Capture"}</p>
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
      <motion.div
        className="page-wrap grid md:grid-cols-3 gap-6"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-120px" }}
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      >
        {featureCards.map((card) => (
          <motion.article key={card.title} className="card" variants={reveal}>
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
      <div className="page-wrap pipeline-layout">
        <div className="pipeline-viz">
          <PipelineShowcase active={active} />
        </div>
        <motion.div
          className="pipeline-list"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-120px" }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {pipelineSteps.map((step, index) => (
            <motion.button
              key={step.title}
              type="button"
              className={`card pipeline-step ${active === index ? "is-active" : ""}`}
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
