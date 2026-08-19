/* ═══════════════════════════════════════════════════════════════
   LoanIQ — script.js
   Components: LightRays, PixelImage, DiaTextReveal,
               ShimmerButton, MorphingText + form logic
   ═══════════════════════════════════════════════════════════════ */

/* ─── 1. LIGHT RAYS ──────────────────────────────────────────── */
class LightRays {
  constructor(container, opts = {}) {
    const { count=9, color='rgba(99,102,241,0.18)', blur=48, speed=12, length='72vh' } = opts;
    this.container = container;
    this.color = color; this.blur = blur; this.length = length;
    this.speed = Math.max(speed, 0.1); this.count = count;
    this._injectCSS(); this._build();
  }
  _injectCSS() {
    if (document.getElementById('lr-style')) return;
    const s = document.createElement('style'); s.id = 'lr-style';
    s.textContent = `
      .lr-wrap { pointer-events:none; position:absolute; inset:0; overflow:hidden; border-radius:inherit; isolation:isolate; z-index:0; }
      .lr-ambient { position:absolute; inset:0;
        background: radial-gradient(ellipse 70% 50% at 20% 0%, color-mix(in srgb,var(--lr-color) 45%,transparent),transparent 70%),
                    radial-gradient(ellipse 50% 40% at 80% 0%, color-mix(in srgb,var(--lr-color) 30%,transparent),transparent 70%);
        opacity:.65; }
      .lr-ray { position:absolute; top:-14%; border-radius:9999px; transform-origin:top center;
        background:linear-gradient(to bottom,color-mix(in srgb,var(--lr-color) 72%,transparent),transparent);
        mix-blend-mode:screen; opacity:0;
        animation:lr-pulse var(--lr-dur) ease-in-out var(--lr-delay) infinite; }
      @keyframes lr-pulse {
        0%  { opacity:0; transform:translateX(-50%) rotate(var(--lr-r0)); }
        25% { opacity:var(--lr-int); }
        50% { opacity:var(--lr-int); transform:translateX(-50%) rotate(var(--lr-r1)); }
        75% { opacity:var(--lr-int); }
        100%{ opacity:0; transform:translateX(-50%) rotate(var(--lr-r0)); }
      }`;
    document.head.appendChild(s);
  }
  _build() {
    const wrap = document.createElement('div'); wrap.className = 'lr-wrap';
    wrap.style.setProperty('--lr-color', this.color);
    const amb = document.createElement('div'); amb.className = 'lr-ambient'; wrap.appendChild(amb);
    for (let i = 0; i < this.count; i++) {
      const left=8+Math.random()*84, rotate=-26+Math.random()*52, width=140+Math.random()*180,
            swing=0.8+Math.random()*2, delay=Math.random()*this.speed,
            dur=this.speed*(0.7+Math.random()*0.6), intensity=0.55+Math.random()*0.5;
      const ray = document.createElement('div'); ray.className = 'lr-ray';
      ray.style.cssText = `left:${left}%;width:${width}px;height:${this.length};filter:blur(${this.blur}px);--lr-r0:${rotate-swing}deg;--lr-r1:${rotate+swing}deg;--lr-dur:${dur.toFixed(2)}s;--lr-delay:${delay.toFixed(2)}s;--lr-int:${intensity.toFixed(2)};`;
      wrap.appendChild(ray);
    }
    this.container.style.position = 'relative'; this.container.prepend(wrap);
  }
}

/* ─── 2. PIXEL IMAGE ─────────────────────────────────────────── */
class PixelImage {
  constructor(container, opts = {}) {
    const { src='', rows=8, cols=8, grayscaleAnimation=true,
            pixelFadeInDuration=1000, maxAnimationDelay=1300, colorRevealDelay=1500 } = opts;
    this.container = container; this.src = src; this.rows = rows; this.cols = cols;
    this.grayscale = grayscaleAnimation; this.fadeDur = pixelFadeInDuration;
    this.maxDelay = maxAnimationDelay; this.colorDelay = colorRevealDelay; this._pieces = [];
    this._build(); this._animate();
  }
  _build() {
    this.container.style.position = 'relative'; this.container.style.overflow = 'hidden';
    const total = this.rows * this.cols;
    for (let i = 0; i < total; i++) {
      const row=Math.floor(i/this.cols), col=i%this.cols;
      const cw=100/this.cols, rh=100/this.rows;
      const clip = `polygon(${col*cw}% ${row*rh}%,${(col+1)*cw}% ${row*rh}%,${(col+1)*cw}% ${(row+1)*rh}%,${col*cw}% ${(row+1)*rh}%)`;
      const delay = Math.random() * this.maxDelay;
      const tile = document.createElement('div');
      tile.style.cssText = `position:absolute;inset:0;clip-path:${clip};opacity:0;transition:opacity ${this.fadeDur}ms ease-out ${delay}ms;`;
      const img = document.createElement('img'); img.src = this.src; img.draggable = false; img.alt = '';
      img.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;${this.grayscale?'filter:grayscale(1);':''}${this.grayscale?`transition:filter ${this.fadeDur}ms cubic-bezier(0.4,0,0.2,1);`:''}`;
      tile.appendChild(img); this.container.appendChild(tile); this._pieces.push({ tile, img });
    }
  }
  _animate() {
    requestAnimationFrame(() => { this._pieces.forEach(({ tile }) => { tile.style.opacity = '1'; }); });
    if (this.grayscale) {
      setTimeout(() => { this._pieces.forEach(({ img }) => { img.style.filter = 'grayscale(0)'; }); }, this.colorDelay);
    }
  }
}

/* ─── 3. DIA TEXT REVEAL ─────────────────────────────────────── */
const DTR_DEFAULT_COLORS = ['#c679c4','#fa3d1d','#ffb005','#e1e1fe','#0358f7'];
const DTR_BAND_HALF = 17;
const DTR_SWEEP_START = -DTR_BAND_HALF;
const DTR_SWEEP_END   = 100 + DTR_BAND_HALF;

function dtrEase(t) {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}
function dtrBuildGradient(pos, colors, textColor) {
  const bandStart = pos - DTR_BAND_HALF;
  const bandEnd   = pos + DTR_BAND_HALF;
  if (bandStart >= 100) return `linear-gradient(90deg,${textColor},${textColor})`;
  const n = colors.length, parts = [];
  if (bandStart > 0) parts.push(`${textColor} 0%`, `${textColor} ${bandStart.toFixed(2)}%`);
  colors.forEach((c, i) => {
    const pct = n === 1 ? pos : bandStart + (i / (n - 1)) * DTR_BAND_HALF * 2;
    parts.push(`${c} ${pct.toFixed(2)}%`);
  });
  if (bandEnd < 100) parts.push(`transparent ${bandEnd.toFixed(2)}%`, `transparent 100%`);
  return `linear-gradient(90deg,${parts.join(',')})`;
}

class DiaTextReveal {
  constructor(el, opts = {}) {
    const {
      text, colors=DTR_DEFAULT_COLORS, textColor='#f8fafc',
      duration=1.5, delay=0, repeat=false, repeatDelay=0.5,
      startOnView=true, once=true
    } = opts;
    this.el = el; this.colors = colors; this.textColor = textColor;
    this.duration = duration; this.delay = delay; this.repeat = repeat;
    this.repeatDelay = repeatDelay; this.once = once;
    this.texts = Array.isArray(text) ? text : [text];
    this.activeIndex = 0; this.hasPlayed = false; this.rafId = null; this._timers = [];
    this.el.classList.add('dia-reveal-span');
    this.el.textContent = this.texts[0];
    this._setup(startOnView);
  }
  _setup(startOnView) {
    if (startOnView && 'IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { if (this.once) obs.disconnect(); this._delayedPlay(); } });
      }, { threshold: 0.1 });
      obs.observe(this.el);
    } else { this._delayedPlay(); }
  }
  _delayedPlay() {
    if (this.once && this.hasPlayed) return;
    this.hasPlayed = true;
    this._timers.push(setTimeout(() => this._play(), this.delay * 1000));
  }
  _play() {
    const startTime = performance.now();
    const totalDur  = this.duration * 1000;
    const range     = DTR_SWEEP_END - DTR_SWEEP_START;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const tick = (now) => {
      const rawT = Math.min((now - startTime) / totalDur, 1);
      const pos  = DTR_SWEEP_START + dtrEase(rawT) * range;
      this.el.style.backgroundImage = dtrBuildGradient(pos, this.colors, this.textColor);
      if (rawT < 1) { this.rafId = requestAnimationFrame(tick); }
      else if (this.repeat) {
        this._timers.push(setTimeout(() => {
          this.activeIndex = (this.activeIndex + 1) % this.texts.length;
          this.el.textContent = this.texts[this.activeIndex];
          this._play();
        }, this.repeatDelay * 1000));
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }
  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this._timers.forEach(id => clearTimeout(id));
  }
}

/* ─── 4. SHIMMER BUTTON ──────────────────────────────────────── */
function makeShimmerButton(opts = {}) {
  const {
    text = 'Submit', icon = null,
    bg = 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
    shimmerColor = 'rgba(255,255,255,0.9)',
    shimmerSpeed = '3s', borderRadius = 'var(--r-md)',
    className = '', loadingId = null, type = 'submit'
  } = opts;

  const btn = document.createElement('button');
  btn.type = type;
  btn.className = 'shimmer-btn ' + className;
  btn.style.setProperty('--shim-bg', bg);
  btn.style.setProperty('--shim-color', shimmerColor);
  btn.style.setProperty('--shim-speed', shimmerSpeed);
  btn.style.setProperty('--shim-radius', borderRadius);

  btn.innerHTML = `
    <div class="shim-spark-wrap" aria-hidden="true">
      <div class="shim-spark"><div class="shim-cone"></div></div>
    </div>
    ${icon ? `<span class="shim-icon">${icon}</span>` : ''}
    <span class="shim-label">${text}</span>
    <div class="shim-highlight" aria-hidden="true"></div>
    <div class="shim-backdrop" aria-hidden="true"></div>
  `;
  return btn;
}

/* ─── 5. MORPHING TEXT ───────────────────────────────────────── */
const MORPH_TIME     = 1.5;
const COOLDOWN_TIME  = 0.5;

class MorphingText {
  constructor(container, texts, opts = {}) {
    const { className = '' } = opts;
    this.container = container;
    this.texts = texts;
    this.textIndex = 0;
    this.morph = 0;
    this.cooldown = COOLDOWN_TIME;
    this.lastTime = performance.now();
    this.rafId = null;

    this._injectSVGFilter();
    this._build(className);
    this._animate();
  }

  _injectSVGFilter() {
    if (document.getElementById('morph-svg-filter')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'morph-svg-filter';
    svg.setAttribute('class', 'morph-svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.innerHTML = `<defs><filter id="morph-threshold">
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"/>
    </filter></defs>`;
    document.body.appendChild(svg);
  }

  _build(className) {
    this.container.className = 'morph-wrap ' + className;
    this.span1 = document.createElement('span'); this.span1.className = 'morph-span';
    this.span2 = document.createElement('span'); this.span2.className = 'morph-span';
    this.span1.textContent = this.texts[0];
    this.span2.textContent = this.texts[1 % this.texts.length];
    this.container.appendChild(this.span1);
    this.container.appendChild(this.span2);
    // Size container to widest text
    this._sizeContainer();
  }

  _sizeContainer() {
    // Let CSS handle it via text, just set min-width by measuring widest
    let maxW = 0;
    const ghost = this.span1.cloneNode();
    ghost.style.cssText = 'position:absolute;visibility:hidden;whiteSpace:nowrap;pointerEvents:none;';
    this.container.appendChild(ghost);
    this.texts.forEach(t => { ghost.textContent = t; maxW = Math.max(maxW, ghost.scrollWidth); });
    ghost.remove();
    this.container.style.minWidth = maxW + 'px';
  }

  _setStyles(fraction) {
    const s1 = this.span1, s2 = this.span2;
    s2.style.filter  = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
    s2.style.opacity = `${Math.pow(fraction, 0.4)}`;
    const inv = 1 - fraction;
    s1.style.filter  = `blur(${Math.min(8 / inv - 8, 100)}px)`;
    s1.style.opacity = `${Math.pow(inv, 0.4)}`;
    s1.textContent = this.texts[this.textIndex % this.texts.length];
    s2.textContent = this.texts[(this.textIndex + 1) % this.texts.length];
  }

  _doMorph() {
    this.morph -= this.cooldown; this.cooldown = 0;
    let fraction = this.morph / MORPH_TIME;
    if (fraction > 1) { this.cooldown = COOLDOWN_TIME; fraction = 1; }
    this._setStyles(fraction);
    if (fraction === 1) this.textIndex++;
  }

  _doCooldown() {
    this.morph = 0;
    this.span2.style.filter  = 'none'; this.span2.style.opacity = '1';
    this.span1.style.filter  = 'none'; this.span1.style.opacity = '0';
  }

  _animate() {
    const tick = (now) => {
      this.rafId = requestAnimationFrame(tick);
      const dt = (now - this.lastTime) / 1000; this.lastTime = now;
      this.cooldown -= dt;
      if (this.cooldown <= 0) this._doMorph(); else this._doCooldown();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  destroy() { if (this.rafId) cancelAnimationFrame(this.rafId); }
}

/* ─── 6. LIVE CALCULATOR ─────────────────────────────────────── */
function fmt(n) { return n.toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function updateCalculator() {
  const ai=parseFloat(document.getElementById('applicant_income').value)||0;
  const ci=parseFloat(document.getElementById('coapplicant_income').value)||0;
  const la=parseFloat(document.getElementById('loan_amount').value)||0;
  const lt=parseFloat(document.getElementById('loan_term').value)||360;
  if (ai > 0 || la > 0) {
    const ti=ai+ci, emi=la/lt, bal=ti-(emi*1000), dti=ti>0?(emi*1000/ti*100):0;
    document.getElementById('calc-income').textContent  = '₹' + fmt(ti);
    document.getElementById('calc-emi').textContent     = '₹' + emi.toFixed(2);
    document.getElementById('calc-balance').textContent = '₹' + fmt(bal);
    document.getElementById('calc-dti').textContent     = dti.toFixed(1) + '%';
    document.getElementById('live-calc').classList.add('visible');
  }
}
['applicant_income','coapplicant_income','loan_amount'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updateCalculator);
});
document.getElementById('loan_term')?.addEventListener('change', updateCalculator);

/* ─── 7. CREDIT TOGGLE ───────────────────────────────────────── */
function setCredit(val) {
  document.getElementById('credit_history').value = val;
  document.getElementById('credit-good').classList.toggle('active', val === 1);
  document.getElementById('credit-bad').classList.toggle('active', val === 0);
}

/* ─── 8. PROBABILITY RING ────────────────────────────────────── */
function animateRing(pct, approved) {
  const circle = document.getElementById('ring-fill');
  const probValue = document.getElementById('prob-value');
  const circumference = 2 * Math.PI * 50;
  circle.className = 'ring-fill ' + (approved ? 'approved' : 'rejected');
  circle.style.strokeDashoffset = circumference * (1 - pct / 100);
  let current = 0; const step = pct / 60;
  const timer = setInterval(() => {
    current = Math.min(current + step, pct);
    probValue.textContent = current.toFixed(1) + '%';
    if (current >= pct) clearInterval(timer);
  }, 16);
}

/* ─── 9. SHOW RESULT ─────────────────────────────────────────── */
function showResult(data) {
  const placeholder = document.getElementById('result-placeholder');
  const content = document.getElementById('result-content');
  const badge = document.getElementById('result-badge');
  const statusEl = document.getElementById('result-status');
  const resultCard = document.getElementById('result-card');
  const statusIcon = document.getElementById('status-icon');

  placeholder.style.display = 'none';
  content.style.cssText = 'display:block;opacity:0;transform:translateY(12px);';
  requestAnimationFrame(() => {
    content.style.transition = 'opacity .5s ease, transform .5s ease';
    content.style.opacity = '1'; content.style.transform = 'translateY(0)';
  });

  const approved = data.approved;
  badge.className = 'result-badge ' + (approved ? 'approved' : 'rejected');
  statusEl.textContent = data.status;
  statusIcon.textContent = approved ? '✓' : '✗';
  statusIcon.className   = 'status-icon ' + (approved ? 'approved' : 'rejected');
  animateRing(data.probability, approved);

  document.getElementById('res-income').textContent  = '₹' + fmt(data.details.total_income||0);
  document.getElementById('res-emi').textContent     = '₹' + (data.details.emi||0).toFixed(2);
  document.getElementById('res-balance').textContent = '₹' + fmt(data.details.balance_income||0);
  document.getElementById('res-loginc').textContent  = (data.details.log_income||0).toFixed(4);

  resultCard.style.borderColor = approved ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)';
  resultCard.style.boxShadow   = approved
    ? '0 0 48px rgba(16,185,129,0.12),0 25px 50px rgba(0,0,0,0.5)'
    : '0 0 48px rgba(244,63,94,0.12),0 25px 50px rgba(0,0,0,0.5)';

  if (window.innerWidth < 1024) resultCard.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ─── 10. FORM SUBMIT ────────────────────────────────────────── */
document.getElementById('loan-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const shimLabel   = document.querySelector('#predict-btn .shim-label');
  const shimIcon    = document.querySelector('#predict-btn .shim-icon');
  const btn         = document.getElementById('predict-btn');
  const origText    = shimLabel ? shimLabel.textContent : '';

  if (shimLabel) shimLabel.textContent = 'Analyzing...';
  if (shimIcon) shimIcon.style.display = 'none';
  btn.disabled = true; btn.style.opacity = '.75';

  const formData = {
    Gender:            document.getElementById('gender').value,
    Married:           document.getElementById('married').value,
    Dependents:        document.getElementById('dependents').value,
    Education:         document.getElementById('education').value,
    Self_Employed:     document.getElementById('self_employed').value,
    Property_Area:     document.getElementById('property_area').value,
    ApplicantIncome:   parseFloat(document.getElementById('applicant_income').value)||0,
    CoapplicantIncome: parseFloat(document.getElementById('coapplicant_income').value)||0,
    LoanAmount:        parseFloat(document.getElementById('loan_amount').value)||0,
    Loan_Amount_Term:  parseFloat(document.getElementById('loan_term').value)||360,
    Credit_History:    parseFloat(document.getElementById('credit_history').value),
  };

  try {
    const res  = await fetch('/predict', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(formData)
    });
    // Always read body — the server may send an error JSON on 400
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error: ' + res.status);
    if (data.error) throw new Error(data.error);
    showResult(data);
  } catch(err) {
    alert('Prediction error: ' + err.message);
  } finally {
    if (shimLabel) shimLabel.textContent = origText;
    if (shimIcon) shimIcon.style.display = '';
    btn.disabled = false; btn.style.opacity = '1';
  }
});

/* ─── 11. FINANCE SVG BUILDER ────────────────────────────────── */
function buildFinanceSVG() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
    <defs>
      <radialGradient id="bg" cx="50%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#030712"/>
      </radialGradient>
      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="sg"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="480" height="480" fill="url(#bg)"/>
    <g stroke="rgba(99,102,241,0.12)" stroke-width="1">
      <line x1="0" y1="96" x2="480" y2="96"/><line x1="0" y1="192" x2="480" y2="192"/>
      <line x1="0" y1="288" x2="480" y2="288"/><line x1="0" y1="384" x2="480" y2="384"/>
      <line x1="96" y1="0" x2="96" y2="480"/><line x1="192" y1="0" x2="192" y2="480"/>
      <line x1="288" y1="0" x2="288" y2="480"/><line x1="384" y1="0" x2="384" y2="480"/>
    </g>
    <path d="M40 380 L100 310 L160 290 L220 240 L280 200 L340 160 L400 120 L440 100 L440 420 L40 420Z" fill="url(#cg)" opacity="0.5"/>
    <path d="M40 380 L100 310 L160 290 L220 240 L280 200 L340 160 L400 120 L440 100" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
    <g filter="url(#glow)">
      <circle cx="40" cy="380" r="5" fill="#6366f1"/><circle cx="100" cy="310" r="5" fill="#6366f1"/>
      <circle cx="160" cy="290" r="5" fill="#8b5cf6"/><circle cx="220" cy="240" r="5" fill="#8b5cf6"/>
      <circle cx="280" cy="200" r="5" fill="#8b5cf6"/><circle cx="340" cy="160" r="6" fill="#a78bfa"/>
      <circle cx="400" cy="120" r="6" fill="#a78bfa"/>
      <circle cx="440" cy="100" r="7" fill="#c4b5fd" stroke="#fff" stroke-width="1.5"/>
    </g>
    <g transform="translate(60,40)" opacity="0.9">
      <rect width="140" height="72" rx="10" fill="rgba(30,27,75,0.85)" stroke="rgba(99,102,241,0.4)" stroke-width="1"/>
      <rect x="12" y="14" width="48" height="6" rx="3" fill="rgba(99,102,241,0.5)"/>
      <rect x="12" y="26" width="72" height="4" rx="2" fill="rgba(139,92,246,0.3)"/>
      <rect x="12" y="44" width="36" height="14" rx="5" fill="rgba(16,185,129,0.25)" stroke="rgba(16,185,129,0.4)" stroke-width="1"/>
      <rect x="16" y="48" width="28" height="6" rx="3" fill="rgba(16,185,129,0.6)"/>
    </g>
    <g transform="translate(280,30)" opacity="0.85">
      <rect width="160" height="80" rx="10" fill="rgba(30,27,75,0.85)" stroke="rgba(139,92,246,0.4)" stroke-width="1"/>
      <text x="12" y="28" font-family="monospace" font-size="10" fill="rgba(196,181,253,0.7)">APPROVAL RATE</text>
      <text x="12" y="52" font-family="monospace" font-size="20" font-weight="bold" fill="#a78bfa">87.0%</text>
      <rect x="12" y="62" width="90" height="4" rx="2" fill="rgba(99,102,241,0.25)"/>
      <rect x="12" y="62" width="78" height="4" rx="2" fill="rgba(99,102,241,0.7)"/>
    </g>
    <g transform="translate(30,230)" opacity="0.8">
      <rect width="120" height="60" rx="10" fill="rgba(30,27,75,0.8)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <text x="12" y="22" font-family="monospace" font-size="9" fill="rgba(103,232,249,0.7)">MODEL F1</text>
      <text x="12" y="44" font-family="monospace" font-size="18" font-weight="bold" fill="#67e8f9">91.1%</text>
    </g>
    <circle cx="340" cy="340" r="80" fill="rgba(99,102,241,0.05)" filter="url(#sg)"/>
    <g fill="rgba(99,102,241,0.4)">
      <circle cx="350" cy="380" r="2"/><circle cx="380" cy="350" r="2"/>
      <circle cx="420" cy="400" r="2"/><circle cx="300" cy="410" r="2"/>
    </g>
  </svg>`;
  return URL.createObjectURL(new Blob([svg], { type:'image/svg+xml' }));
}

/* ─── 12. INIT ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* — Light Rays — */
  const hero = document.getElementById('hero-section');
  if (hero) new LightRays(hero, { count:10, color:'rgba(99,102,241,0.22)', blur:52, speed:13, length:'80vh' });
  const rCard = document.getElementById('result-card');
  if (rCard) new LightRays(rCard, { count:5, color:'rgba(139,92,246,0.12)', blur:36, speed:16, length:'100%' });

  /* — Pixel Image — */
  const pc = document.getElementById('pixel-container');
  if (pc) new PixelImage(pc, { src:buildFinanceSVG(), rows:8, cols:8, grayscaleAnimation:true,
    pixelFadeInDuration:900, maxAnimationDelay:1400, colorRevealDelay:1600 });

  /* — Morphing Text in eyebrow — */
  const morphEl = document.getElementById('hero-morph-target');
  if (morphEl) {
    new MorphingText(morphEl,
      ['Credit Analysis','Risk Assessment','EMI Calculation','Decision Engine','Feature Engineering'],
      { className: 'hero-morph' });
  }

  /* — Dia Text Reveal on hero accent — */
  const diaEl = document.getElementById('hero-dia-span');
  if (diaEl) {
    new DiaTextReveal(diaEl, {
      text: ['Instantly with AI','In Seconds','Accurately','Confidently'],
      colors: ['#c679c4','#fa3d1d','#ffb005','#e1e1fe','#6366f1'],
      textColor: '#f8fafc',
      duration: 1.6, delay: 0.3,
      repeat: true, repeatDelay: 1.8,
      startOnView: true, once: false,
    });
  }

  /* — Shimmer Button: replace predict button — */
  const oldBtn = document.getElementById('predict-btn');
  if (oldBtn) {
    const shimBtn = makeShimmerButton({
      text: 'Analyze &amp; Predict',
      icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="flex-shrink:0"><path d="M9 2a7 7 0 100 14A7 7 0 009 2z" stroke="currentColor" stroke-width="1.5"/><path d="M6 9l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      type: 'submit', className: 'w-full', bg:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)'
    });
    shimBtn.id = 'predict-btn';
    shimBtn.style.width = '100%';
    shimBtn.style.marginTop = '24px';
    oldBtn.replaceWith(shimBtn);
  }

  /* — Shimmer Button: replace hero CTA anchor — */
  const heroCta = document.getElementById('hero-cta-btn');
  if (heroCta) {
    const shimCta = makeShimmerButton({
      text: 'Begin Analysis',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="flex-shrink:0"><path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      type: 'button', bg:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
      shimmerSpeed: '2.5s'
    });
    shimCta.id = 'hero-cta-btn';
    shimCta.addEventListener('click', () => {
      document.getElementById('form-section').scrollIntoView({ behavior:'smooth', block:'start' });
    });
    heroCta.replaceWith(shimCta);
  }

  /* — Entry animation — */
  document.querySelectorAll('.glass-card,.hero-content,.hero-visual').forEach((el, i) => {
    el.style.opacity = '0'; el.style.transform = 'translateY(24px)';
    setTimeout(() => {
      el.style.transition = 'opacity .65s cubic-bezier(0.4,0,0.2,1),transform .65s cubic-bezier(0.4,0,0.2,1)';
      el.style.opacity = '1'; el.style.transform = 'translateY(0)';
    }, 80 + i * 90);
  });
});
