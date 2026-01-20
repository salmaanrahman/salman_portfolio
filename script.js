// ---------------------------
// Helpers
// ---------------------------
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));

function toast(msg){
  const t = $("#toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 1600);
}

async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  }catch(e){
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast("Copied to clipboard");
  }
}

// ---------------------------
// Photo fallback (if image missing)
// ---------------------------
const profilePhoto = $("#profilePhoto");
const avatarFallback = $("#avatarFallback");

if(profilePhoto && avatarFallback){
  profilePhoto.addEventListener("load", () => {
    avatarFallback.style.display = "none";
  });

  profilePhoto.addEventListener("error", () => {
    profilePhoto.style.display = "none";
    avatarFallback.style.display = "grid";
  });

  if(profilePhoto.complete && profilePhoto.naturalWidth > 0){
    avatarFallback.style.display = "none";
  }
}

// ---------------------------
// Theme (persist + system default if none)
// ---------------------------
const themeToggle = $("#themeToggle");
const root = document.documentElement;

function getSystemTheme(){
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function updateThemeIcon(){
  if(!themeToggle) return;
  const isLight = root.getAttribute("data-theme") === "light";
  const icon = themeToggle.querySelector(".icon");
  if(icon) icon.textContent = isLight ? "☀" : "☾";
}

function applyTheme(theme){
  root.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  updateThemeIcon();
}

// init
(() => {
  const saved = localStorage.getItem("theme");
  if(saved){
    root.setAttribute("data-theme", saved);
  }else{
    const sys = getSystemTheme();
    root.setAttribute("data-theme", sys);
    localStorage.setItem("theme", sys);
  }
  updateThemeIcon();
})();

if(themeToggle){
  themeToggle.addEventListener("click", () => {
    const current = root.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
  });
}

// ---------------------------
// Mobile nav (panel + outside click + escape)
// ---------------------------
const navToggle = $("#navToggle");
const navPanel = $("#navPanel");

function openNav(){
  if(!navPanel || !navToggle) return;
  navPanel.classList.add("is-open");
  navToggle.setAttribute("aria-expanded", "true");
  navPanel.setAttribute("aria-hidden", "false");
}

function closeNav(){
  if(!navPanel || !navToggle) return;
  navPanel.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  navPanel.setAttribute("aria-hidden", "true");
}

if(navToggle){
  navToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = navPanel && navPanel.classList.contains("is-open");
    isOpen ? closeNav() : openNav();
  });
}

// close on nav link click
$$(".nav__link").forEach(a => a.addEventListener("click", () => closeNav()));

// close on outside click (safe)
document.addEventListener("click", (e) => {
  if(!navPanel || !navToggle) return;
  if(!navPanel.classList.contains("is-open")) return;

  const target = e.target;
  const inside = navPanel.contains(target) || navToggle.contains(target);
  if(!inside) closeNav();
});

window.addEventListener("keydown", (e) => {
  if(e.key === "Escape"){
    if(navPanel?.classList.contains("is-open")) closeNav();
  }
});

// ---------------------------
// Scroll progress bar
// ---------------------------
const progress = $("#progress");
window.addEventListener("scroll", () => {
  if(!progress) return;
  const h = document.documentElement;
  const denom = (h.scrollHeight - h.clientHeight) || 1;
  const scrolled = h.scrollTop / denom;
  progress.style.width = `${Math.max(0, Math.min(1, scrolled)) * 100}%`;
}, { passive: true });

// ---------------------------
// Reveal on scroll
// ---------------------------
$$(".section, .card, .pcard").forEach(el => el.classList.add("reveal"));

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if(e.isIntersecting){
      e.target.classList.add("is-visible");
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

$$(".reveal").forEach(el => io.observe(el));

// ---------------------------
// Scroll spy (active nav link)
// ---------------------------
const sections = ["about","skills","projects","education","publications","activities","cv","contact"]
  .map(id => document.getElementById(id))
  .filter(Boolean);

const navLinks = $$(".nav__link");

const spy = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      navLinks.forEach(a => a.classList.remove("is-active"));
      const active = $(`.nav__link[href="#${entry.target.id}"]`);
      if(active) active.classList.add("is-active");
    }
  });
}, { rootMargin: "-45% 0px -50% 0px", threshold: 0.01 });

sections.forEach(s => spy.observe(s));

// ---------------------------
// Copy actions
// ---------------------------
const copyEmailBtn = $("#copyEmailBtn");
const copyPhoneBtn = $("#copyPhoneBtn");
const copyCvNameBtn = $("#copyCvNameBtn");

if(copyEmailBtn) copyEmailBtn.addEventListener("click", () => copyToClipboard("sr24salman@gmail.com"));
if(copyPhoneBtn) copyPhoneBtn.addEventListener("click", () => copyToClipboard("+8801637571352"));
if(copyCvNameBtn) copyCvNameBtn.addEventListener("click", () => copyToClipboard("resume.pdf"));

// ---------------------------
// Projects: filter + search
// ---------------------------
const tabs = $$(".tab");
const grid = $("#projectGrid");
const cards = grid ? $$(".pcard", grid) : [];
const searchInput = $("#projectSearch");

let activeFilter = "all";
let activeQuery = "";

function matchesFilter(card){
  if(activeFilter === "all") return true;
  const tags = (card.getAttribute("data-tags") || "").toLowerCase();
  return tags.includes(activeFilter);
}

function matchesSearch(card){
  if(!activeQuery) return true;
  const title = (card.getAttribute("data-title") || "").toLowerCase();
  const text = (card.textContent || "").toLowerCase();
  return title.includes(activeQuery) || text.includes(activeQuery);
}

function applyProjectFilters(){
  if(!grid || !cards.length) return;

  let visibleCount = 0;

  cards.forEach(card => {
    const show = matchesFilter(card) && matchesSearch(card);
    card.style.display = show ? "" : "none";
    if(show) visibleCount++;
  });

  if(visibleCount === 0){
    if(!$("#emptyState")){
      const empty = document.createElement("div");
      empty.id = "emptyState";
      empty.className = "card";
      empty.innerHTML = `
        <h3 class="card__title">No results</h3>
        <p class="muted">Try another filter or search term.</p>
      `;
      grid.parentElement.appendChild(empty);
    }
  }else{
    const empty = $("#emptyState");
    if(empty) empty.remove();
  }
}

tabs.forEach(t => {
  t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("is-active"));
    t.classList.add("is-active");
    activeFilter = t.getAttribute("data-filter") || "all";
    applyProjectFilters();
  });
});

if(searchInput){
  searchInput.addEventListener("input", (e) => {
    activeQuery = (e.target.value || "").trim().toLowerCase();
    applyProjectFilters();
  });
}

// ---------------------------
// Modal (Project details) + focus trap
// ---------------------------
const modal = $("#modal");
const modalTitle = $("#modalTitle");
const modalContent = $("#modalContent");
const modalClose = $("#modalClose");
const modalPanel = $(".modal__panel");

const projectDetails = {
  vera: {
    title: "VERA – Fashion E-Commerce Mobile App",
    bullets: [
      "End-to-end case study: user flows, IA, and clear navigation for faster discovery.",
      "High-fidelity UI for browse, search, filter, wishlist, cart, and checkout.",
      "Micro-interactions + motion cues to increase confidence and reduce errors.",
      "Tooling: Figma."
    ]
  },
  pharmacy: {
    title: "Online Pharmacy Mobile App",
    bullets: [
      "Prescription-first UX with trust signals and step-by-step guidance.",
      "Checkout + order tracking designed for clarity and safety.",
      "Reusable design system for consistent components.",
      "Tooling: Figma."
    ]
  },
  aurum: {
    title: "Aurum Stays – Luxury Hotel Booking App",
    bullets: [
      "Premium booking flow: search → details → selection → payment.",
      "Consistent patterns + responsive layouts across devices.",
      "Subtle UI animations for delight without distraction.",
      "Tooling: Figma."
    ]
  },
  slidespark: {
    title: "SlideSpark – Slide-Based Mobile Application (Team)",
    bullets: [
      "UI-first slide creation/editing with clean navigation and smooth transitions.",
      "Designed layouts + interaction states for an app-like feel.",
      "Tooling: Flutter, Firebase."
    ]
  },
  zoomtex: {
    title: "ZoomTex – E-commerce Web Platform (Solo)",
    bullets: [
      "Structured product layout + simple purchase flow.",
      "Built using HTML, CSS, and JavaScript."
    ]
  },
  gaming: {
    title: "Online Gaming Platform (Team)",
    bullets: [
      "Responsive platform focused on layout clarity and interaction.",
      "Built using HTML, CSS, and JavaScript."
    ]
  },
  jobuthso: {
    title: "Job Uthso – Freelance & Remote Job Platform",
    bullets: [
      "Designed intuitive UI flows for freelancers and recruiters.",
      "Clean navigation and scalable layout patterns.",
      "Tooling: Figma, HTML, CSS, JavaScript."
    ]
  },
  leafcare: {
    title: "LeafCare – Leaf Disease Detection Platform",
    bullets: [
      "Step-by-step flow for non-technical users with strong readability.",
      "Responsive layout and clear feedback states.",
      "Tooling: Figma, Python, TensorFlow."
    ]
  }
};

let lastFocusedEl = null;

function focusableElements(rootEl){
  const selectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ];
  return $$(selectors.join(","), rootEl).filter(el => el.offsetParent !== null);
}

function openModal(key){
  const data = projectDetails[key];
  if(!data || !modal || !modalTitle || !modalContent) return;

  lastFocusedEl = document.activeElement;

  modalTitle.textContent = data.title;
  modalContent.innerHTML = `
    <ul class="list">
      ${data.bullets.map(b => `<li>${b}</li>`).join("")}
    </ul>
  `;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    if(modalPanel) modalPanel.focus();
    const focusables = focusableElements(modal);
    if(focusables.length) focusables[0].focus();
  }, 0);
}

function closeModal(){
  if(!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  if(lastFocusedEl && typeof lastFocusedEl.focus === "function"){
    lastFocusedEl.focus();
  }
}

$$(".pcard__open").forEach(btn => {
  btn.addEventListener("click", () => openModal(btn.getAttribute("data-project")));
});

if(modalClose) modalClose.addEventListener("click", closeModal);

if(modal){
  modal.addEventListener("click", (e) => {
    const target = e.target;
    if(target && target.getAttribute("data-close") === "true") closeModal();
  });

  modal.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && modal.classList.contains("is-open")) closeModal();

    if(e.key === "Tab" && modal.classList.contains("is-open")){
      const focusables = focusableElements(modal);
      if(!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if(e.shiftKey && document.activeElement === first){
        e.preventDefault();
        last.focus();
      }else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault();
        first.focus();
      }
    }
  });
}

// ---------------------------
// Contact form: open mailto draft
// ---------------------------
const contactForm = $("#contactForm");
if(contactForm){
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const name = (fd.get("name") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const message = (fd.get("message") || "").toString().trim();

    const subject = encodeURIComponent(`Portfolio Inquiry — ${name || "Recruiter"}`);
    const body = encodeURIComponent(
      `Hi Salman,\n\n${message}\n\nRegards,\n${name}\n${email}`
    );

    window.location.href = `mailto:sr24salman@gmail.com?subject=${subject}&body=${body}`;
  });
}

// ---------------------------
// CV Preview fallback (optional)
// ---------------------------
const cvFrame = $(".cvFrame");
const cvFallback = $(".cvFallback");

// If PDF doesn't load in iframe (some browsers), show fallback
if(cvFrame && cvFallback){
  // default hide fallback
  cvFallback.style.display = "none";

  // if iframe doesn't load within 2.5s, show fallback (best-effort)
  const timer = setTimeout(() => {
    cvFallback.style.display = "block";
  }, 2500);

  cvFrame.addEventListener("load", () => {
    clearTimeout(timer);
    cvFallback.style.display = "none";
  });
}





// ---------------------------
// CV Download: click করলে download (ONLY on click)
// ---------------------------
const cvDownload = $("#cvDownload");
if(cvDownload){
  cvDownload.addEventListener("click", (e) => {
    e.preventDefault();

    const url = cvDownload.getAttribute("href") || "resume.pdf";

    const a = document.createElement("a");
    a.href = url;
    a.download = "Salman_Af_Rahman_CV.pdf"; // rename if you want
    document.body.appendChild(a);
    a.click();
    a.remove();

    toast("Downloading CV...");
  });
}

// Footer year
const yearEl = $("#year");
if(yearEl) yearEl.textContent = new Date().getFullYear();
