const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const touchOnly = matchMedia("(pointer: coarse)").matches;

// ---------- 1. Active nav link ----------
const sections = document.querySelectorAll("main section[id]");
const links = document.querySelectorAll(".nav nav a");
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    links.forEach(l => l.classList.remove("active"));
    document.querySelector(`.nav nav a[href="#${entry.target.id}"]`)?.classList.add("active");
  });
}, { rootMargin: "-35% 0px -55% 0px" });
sections.forEach(s => navObserver.observe(s));

// ---------- 2. Scroll progress bar ----------
const bar = document.createElement("div");
bar.className = "progress";
document.body.prepend(bar);
addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}, { passive: true });

// ---------- 3. Marquee strip under the hero ----------
const items = ["LLMs", "RAG", "AI Agents", "Voice AI", "MCP", "LangGraph", "FastAPI", "AWS", "PostgreSQL", "Semantic Kernel"];
const row = items.map(t => `<span>${t}</span><b>✦</b>`).join("");
const marquee = document.createElement("div");
marquee.className = "marquee";
marquee.innerHTML = `<div class="track">${row}${row}</div>`;
document.getElementById("about")?.before(marquee);

// ---------- 4. Word-by-word headlines ----------
function splitWords(el) {
  let n = 0;
  (function walk(node) {
    [...node.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) frag.append(" ");
          else {
            const s = document.createElement("span");
            s.className = "w"; s.style.setProperty("--i", n++); s.textContent = t;
            frag.append(s);
          }
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) walk(c);
    });
  })(el);
  el.classList.add("words");
}
const wordEls = document.querySelectorAll(".hero h1, .section h2, .quote p");
wordEls.forEach(splitWords);

// ---------- 5. Scroll reveal ----------
const revealEls = document.querySelectorAll(
  ".section-label, .about p, .timeline-item, .project, .skill-list > div, .skills-layout > div:first-child p, .cert, .contact p, .email-link, .hero-copy .eyebrow, .hero-text, .hero-actions, .quick-links"
);
revealEls.forEach(el => {
  el.classList.add("reveal");
  const i = [...el.parentElement.children].indexOf(el);
  el.style.setProperty("--d", `${(i % 6) * 90}ms`);
});
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    if (e.target.classList.contains("reveal")) setTimeout(() => e.target.classList.add("done"), 1300);
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
[...revealEls, ...wordEls].forEach(el => reduce ? el.classList.add("in", "done") : io.observe(el));

// ---------- 6. Count-up metrics ----------
document.querySelectorAll(".metric strong").forEach(el => {
  const m = el.textContent.match(/^(\D*)(\d+)(.*)$/);
  if (!m || reduce) return;
  const [, pre, num, suf] = m, end = +num, t0 = performance.now() + 500;
  el.textContent = `${pre}0${suf}`;
  (function step(now) {
    const p = Math.min(1, Math.max(0, (now - t0) / 1400));
    el.textContent = `${pre}${Math.round(end * (1 - Math.pow(1 - p, 3)))}${suf}`;
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
});

// ---------- 7. Magnetic buttons ----------
if (!touchOnly && !reduce) {
  document.querySelectorAll(".button, .nav-cta").forEach(b => {
    b.addEventListener("pointermove", e => {
      const r = b.getBoundingClientRect();
      b.style.setProperty("--tx", `${(e.clientX - r.left - r.width / 2) * 0.25}px`);
      b.style.setProperty("--ty", `${(e.clientY - r.top - r.height / 2) * 0.35}px`);
    });
    b.addEventListener("pointerleave", () => { b.style.setProperty("--tx", "0px"); b.style.setProperty("--ty", "0px"); });
  });
}

// ---------- 8. Hero: cursor light + smooth video scrubbing ----------
const stage = document.getElementById("stage");
const inner = document.getElementById("stageInner");
const video = document.getElementById("heroVideo");

const CONFIG = {
  axis: "y",       // "y": cursor top->bottom moves through the video. "x": left->right
  reverse: false,  // true flips direction
  frames: 90,      // max frames pre-captured (more = smoother, uses more memory)
  smooth: 7        // spring stiffness: lower = floatier/smoother (4), higher = snappier (12)
};

if (stage && !reduce) {
  addEventListener("pointermove", e => {
    const r = stage.getBoundingClientRect();
    stage.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    stage.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  });
}

if (video) {
  const init = async () => {
    stage.classList.add("has-video");
    video.loop = true;
    video.play().catch(() => {});
    if (touchOnly || reduce) return;       // phones: just loop the video
    try {
      const frames = await captureFrames();
      startScrub(frames);
    } catch (err) {
      console.warn("Scrub disabled, looping video instead:", err);
      video.play().catch(() => {});
    }
  };
  video.readyState >= 2 ? init() : video.addEventListener("loadeddata", init, { once: true });

  // Pre-render frames into memory so scrubbing is instant (no slow video seeking)
  async function captureFrames() {
    const dur = video.duration;
    const n = Math.min(CONFIG.frames, Math.max(2, Math.round(dur * 24)));
    const s = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * s), h = Math.round(video.videoHeight * s);
    video.pause();
    const frames = [];
    for (let i = 0; i < n; i++) {
      await new Promise(res => {
        const done = () => { video.removeEventListener("seeked", done); res(); };
        video.addEventListener("seeked", done);
        video.currentTime = (i / (n - 1)) * (dur - 0.05);
        setTimeout(done, 700);              // safety net
      });
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(video, 0, 0, w, h);
      frames.push(c);
    }
    return frames;
  }

  function startScrub(frames) {
    const canvas = document.createElement("canvas");
    canvas.width = frames[0].width; canvas.height = frames[0].height;
    inner.append(canvas);
    stage.classList.add("scrub");
    const ctx = canvas.getContext("2d");
    const N = frames.length;
    let target = 0, cur = 0, vel = 0, last = performance.now();

    addEventListener("pointermove", e => {
      const p = CONFIG.axis === "x" ? e.clientX / innerWidth : e.clientY / innerHeight;
      const c = Math.min(1, Math.max(0, p));
      target = CONFIG.reverse ? 1 - c : c;
    });

    (function tick(now) {
      const dt = Math.min(0.033, (now - last) / 1000); last = now;

      // Critically damped spring: eases in AND out, never overshoots, frame-rate independent
      const w = CONFIG.smooth, x = cur - target, e = Math.exp(-w * dt);
      const temp = (vel + w * x) * dt;
      vel = (vel - w * temp) * e;
      cur = target + (x + temp) * e;

      // Skip drawing when nothing is moving
      if (Math.abs(cur - target) > 0.0002 || Math.abs(vel) > 0.0002 || !tick.drawn) {
        tick.drawn = true;
        const f = Math.min(1, Math.max(0, cur)) * (N - 1), i = Math.floor(f);
        const a = f - i, k = a * a * (3 - 2 * a);                 // smoothstep blend between frames
        ctx.globalAlpha = 1;
        ctx.drawImage(frames[i], 0, 0);
        if (k > 0.01 && i < N - 1) { ctx.globalAlpha = k; ctx.drawImage(frames[i + 1], 0, 0); }
      }
      requestAnimationFrame(tick);
    })(last);
  }
} else if (stage && !reduce) {
  // SVG fallback character: eyes follow the cursor
  const eyes = [document.getElementById("eyeL"), document.getElementById("eyeR")];
  addEventListener("pointermove", e => {
    const r = stage.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
    const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    inner.style.transform = `rotateY(${dx * 14}deg) rotateX(${-dy * 14}deg)`;
    eyes.forEach(eye => {
      if (!eye) return;
      const b = eye.getBoundingClientRect();
      const a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
      eye.querySelector(".pupil").style.transform = `translate(${Math.cos(a) * 7}px, ${Math.sin(a) * 7}px)`;
    });
  });
}