/**
 * LoanIQ v2 — Premium UI Script
 * Features:
 *  - Live financial calculator (DTI, balance, EMI)
 *  - Animated confidence ring
 *  - 6-metric result panel (DTI, Loan-to-Income, Affordability)
 *  - DTI health indicator
 *  - Factor bar animations
 *  - Hero morphing text
 *  - Pixel-art hero animation
 *  - Scroll-based navbar styling
 *  - Toast notifications
 */

/* ── Utilities ────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmt = n => n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n.toFixed(0)}`;
const fmtPct = n => `${(n * 100).toFixed(1)}%`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── Navbar scroll ────────────────────────────────────────── */
window.addEventListener("scroll", () => {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 20);
}, { passive: true });

/* ── Hero CTA smooth scroll ───────────────────────────────── */
$("hero-cta-btn").addEventListener("click", () => {
  $("form-section").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ── Hero morphing text ───────────────────────────────────── */
const morphWords = ["Instantly", "Accurately", "Reliably", "Confidently"];
let morphIdx = 0;
const morphEl = $("hero-morph-target");
if (morphEl) {
  morphEl.textContent = morphWords[0];
  setInterval(() => {
    morphEl.style.opacity = "0";
    morphEl.style.transform = "translateY(-8px)";
    setTimeout(() => {
      morphIdx = (morphIdx + 1) % morphWords.length;
      morphEl.textContent = morphWords[morphIdx];
      morphEl.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      morphEl.style.opacity = "1";
      morphEl.style.transform = "translateY(0)";
    }, 280);
  }, 2800);
}

/* ── Pixel hero animation ─────────────────────────────────── */
(function initPixelArt() {
  const container = $("pixel-container");
  if (!container) return;
  const COLS = 9, ROWS = 9, SIZE = 22, GAP = 3;
  const COLORS = ["#6366f1","#8b5cf6","#06b6d4","#4f46e5","#7c3aed"];
  const grid = [];
  container.style.cssText = `display:grid;grid-template-columns:repeat(${COLS},${SIZE}px);gap:${GAP}px;`;
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("div");
      const dist = Math.hypot(c - COLS/2, r - ROWS/2);
      const opacity = clamp(1 - dist / (Math.max(COLS, ROWS) * 0.7), 0.02, 0.5);
      cell.style.cssText = `width:${SIZE}px;height:${SIZE}px;border-radius:4px;
        background:${COLORS[Math.floor(Math.random()*COLORS.length)]};
        opacity:${opacity.toFixed(2)};transition:opacity 0.8s ease,transform 0.8s ease;`;
      container.appendChild(cell);
      grid[r][c] = cell;
    }
  }
  setInterval(() => {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    const cell = grid[r][c];
    const dist = Math.hypot(c - COLS/2, r - ROWS/2);
    const base = clamp(1 - dist / (Math.max(COLS, ROWS) * 0.7), 0.02, 0.5);
    cell.style.opacity = (Math.random() * base * 2 + 0.02).toFixed(2);
    cell.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
  }, 120);
})();

/* ── Animate factor bars on load ──────────────────────────── */
function animateFactorBars() {
  const fills = document.querySelectorAll(".factor-fill[data-target]");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = el.dataset.target;
        setTimeout(() => { el.style.width = target + "%"; }, 200);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });
  fills.forEach(f => observer.observe(f));
}
animateFactorBars();

/* ── Credit History Toggle ────────────────────────────────── */
function setCredit(val) {
  $("credit_history").value = val;
  const good = $("credit-good");
  const bad  = $("credit-bad");
  if (val === 1) {
    good.classList.add("active", "good-active");
    bad.classList.remove("active", "bad-active");
  } else {
    bad.classList.add("active", "bad-active");
    good.classList.remove("active", "good-active");
  }
  updateCalc();
}

/* ── Live Financial Calculator ────────────────────────────── */
function getNumVal(id) { return parseFloat($(id).value) || 0; }

function updateCalc() {
  const appInc  = getNumVal("applicant_income");
  const coInc   = getNumVal("coapplicant_income");
  const loanAmt = getNumVal("loan_amount");
  const term    = parseFloat($("loan_term").value) || 360;

  const totalInc = appInc + coInc;
  const emi      = term > 0 ? loanAmt / term : 0;
  const balance  = totalInc - (emi * 1000);
  const dti      = totalInc > 0 ? (emi * 1000) / totalInc : 0;

  const incEl  = $("calc-income");
  const emiEl  = $("calc-emi");
  const balEl  = $("calc-balance");
  const dtiEl  = $("calc-dti");

  if (totalInc > 0 || loanAmt > 0) {
    incEl.textContent = totalInc > 0  ? fmt(totalInc)  : "—";
    emiEl.textContent = emi > 0       ? fmt(emi * 1000): "—";
    balEl.textContent = totalInc > 0  ? fmt(balance)   : "—";
    dtiEl.textContent = totalInc > 0  ? fmtPct(dti)    : "—";

    // colour balance
    balEl.className = "calc-value " + (balance >= 0 ? "green" : "red");
    dtiEl.className = "calc-value " + (dti < 0.4 ? "green" : dti < 0.6 ? "" : "red");

    // highlight cards
    $("ci-balance").className = "calc-item " + (balance >= 0 ? "positive" : "negative");
    $("ci-dti").className     = "calc-item " + (dti < 0.4 ? "positive" : dti < 0.6 ? "highlight" : "negative");
  } else {
    ["calc-income","calc-emi","calc-balance","calc-dti"].forEach(id => {
      $(id).textContent = "—";
      $(id).className = "calc-value";
    });
    ["ci-income","ci-emi","ci-balance","ci-dti"].forEach(id => $(id).className = "calc-item");
  }
}

// Attach live listeners
["applicant_income","coapplicant_income","loan_amount"].forEach(id => {
  $(id).addEventListener("input", updateCalc);
});
$("loan_term").addEventListener("change", updateCalc);

/* ── Confidence Ring ──────────────────────────────────────── */
function setRing(pct, approved) {
  const ring = $("ring-fill");
  const circumference = 314;
  const offset = circumference - (pct / 100) * circumference;
  ring.style.strokeDashoffset = offset;
  ring.className = "ring-fill " + (approved ? "approved-ring" : "rejected-ring");
}

/* ── Toast ────────────────────────────────────────────────── */
function showToast(msg, duration = 3000) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

/* ── DTI Health Indicator ─────────────────────────────────── */
function setDTIIndicator(dti) {
  const el   = $("dti-indicator");
  const icon = $("dti-icon");
  const text = $("dti-text");
  if (dti < 0.36) {
    el.className = "dti-indicator safe";
    icon.textContent = "✓";
    text.textContent = `DTI ${fmtPct(dti)} — Healthy (below 36%)`;
  } else if (dti < 0.55) {
    el.className = "dti-indicator caution";
    icon.textContent = "!";
    text.textContent = `DTI ${fmtPct(dti)} — Moderate risk (36%–55%)`;
  } else {
    el.className = "dti-indicator risky";
    icon.textContent = "✕";
    text.textContent = `DTI ${fmtPct(dti)} — High risk (above 55%)`;
  }
}

/* ── Form Submit ──────────────────────────────────────────── */
$("loan-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Collect form data
  const fd  = new FormData(e.target);
  const raw = Object.fromEntries(fd.entries());

  // Basic validation
  if (!raw.Gender || !raw.Married || !raw.Education || !raw.Property_Area) {
    showToast("⚠ Please fill in all required fields.");
    return;
  }
  if (!raw.ApplicantIncome || parseFloat(raw.ApplicantIncome) <= 0) {
    showToast("⚠ Please enter a valid applicant income.");
    return;
  }
  if (!raw.LoanAmount || parseFloat(raw.LoanAmount) <= 0) {
    showToast("⚠ Please enter a valid loan amount.");
    return;
  }

  // Loading state
  $("btn-text").style.display    = "none";
  $("btn-loading").style.display = "flex";
  $("predict-btn").disabled      = true;
  $("step-2").classList.add("active");

  try {
    const res  = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });
    const data = await res.json();

    if (data.error) {
      showToast("Error: " + data.error);
      return;
    }

    // ── Populate result panel ──────────────────────────────
    const approved = data.approved;
    const pct      = data.probability;
    const d        = data.details;

    // Show result panel
    $("result-placeholder").style.display = "none";
    const content = $("result-content");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.classList.add("scale-in");

    // Verdict badge
    const badge = $("result-badge");
    badge.className = "result-badge " + (approved ? "approved" : "rejected");
    $("status-icon").textContent  = approved ? "✓" : "✕";
    $("result-status").textContent = approved ? "APPROVED" : "REJECTED";

    // Ring
    setTimeout(() => setRing(pct, approved), 100);
    $("prob-value").textContent = `${pct.toFixed(1)}%`;

    // Metrics
    const incFmt = d.total_income   >= 1000 ? `₹${(d.total_income/1000).toFixed(1)}K`   : `₹${d.total_income.toFixed(0)}`;
    const emiFmt = (d.emi*1000)     >= 1000 ? `₹${(d.emi*1000/1000).toFixed(1)}K`       : `₹${(d.emi*1000).toFixed(0)}`;
    const balFmt = Math.abs(d.balance_income) >= 1000
      ? `${d.balance_income < 0 ? "-" : ""}₹${(Math.abs(d.balance_income)/1000).toFixed(1)}K`
      : `${d.balance_income < 0 ? "-₹" : "₹"}${Math.abs(d.balance_income).toFixed(0)}`;

    $("res-income").textContent  = incFmt;
    $("res-emi").textContent     = emiFmt;
    $("res-balance").textContent = balFmt;
    $("res-balance").className   = "a-value " + (d.balance_income >= 0 ? "good" : "bad");
    $("res-dti").textContent     = fmtPct(d.dti_ratio);
    $("res-dti").className       = "a-value " + (d.dti_ratio < 0.4 ? "good" : d.dti_ratio < 0.6 ? "" : "bad");
    $("res-lir").textContent     = d.loan_income_ratio.toFixed(2) + "x";
    $("res-lir").className       = "a-value " + (d.loan_income_ratio < 3 ? "good" : "bad");
    $("res-afford").textContent  = d.is_affordable ? "Yes ✓" : "No ✕";
    $("res-afford").className    = "a-value " + (d.is_affordable ? "good" : "bad");

    // DTI indicator
    setDTIIndicator(d.dti_ratio);

    // Scroll to result
    $("result-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
    showToast(approved ? "✓ Analysis complete — Loan Approved" : "✕ Analysis complete — Loan Rejected");

  } catch (err) {
    console.error(err);
    showToast("Network error. Is the server running?");
  } finally {
    $("btn-text").style.display    = "";
    $("btn-loading").style.display = "none";
    $("predict-btn").disabled      = false;
  }
});
