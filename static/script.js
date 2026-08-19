/* ═══════════════════════════════════════════════════
   LoanIQ — Frontend JavaScript
   ═══════════════════════════════════════════════════ */

// ─── Live Calculator ───────────────────────────────
function updateCalculator() {
  const ai = parseFloat(document.getElementById("applicant_income").value) || 0;
  const ci = parseFloat(document.getElementById("coapplicant_income").value) || 0;
  const la = parseFloat(document.getElementById("loan_amount").value) || 0;
  const lt = parseFloat(document.getElementById("loan_term").value) || 360;

  if (ai > 0 || la > 0) {
    const totalIncome   = ai + ci;
    const emi           = la / lt;
    const balanceIncome = totalIncome - (emi * 1000);
    const dti           = totalIncome > 0 ? ((emi * 1000) / totalIncome * 100).toFixed(1) : 0;

    document.getElementById("calc-income").textContent  = "₹" + totalIncome.toLocaleString("en-IN");
    document.getElementById("calc-emi").textContent     = "₹" + emi.toFixed(2);
    document.getElementById("calc-balance").textContent = "₹" + balanceIncome.toFixed(2);
    document.getElementById("calc-dti").textContent     = dti + "%";
    document.getElementById("live-calc").style.display  = "block";
  }
}

["applicant_income", "coapplicant_income", "loan_amount", "loan_term"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", updateCalculator);
});
document.getElementById("loan_term")?.addEventListener("change", updateCalculator);

// ─── Credit Toggle ─────────────────────────────────
function setCredit(val) {
  document.getElementById("credit_history").value = val;
  document.getElementById("credit-good").classList.toggle("active", val === 1);
  document.getElementById("credit-bad").classList.toggle("active", val === 0);
}

// ─── Probability Ring Animation ────────────────────
function animateRing(pct, approved) {
  const circle        = document.getElementById("ring-fill");
  const probValue     = document.getElementById("prob-value");
  const circumference = 2 * Math.PI * 50; // r=50
  const offset        = circumference * (1 - pct / 100);

  circle.className = "ring-fill " + (approved ? "approved" : "rejected");
  circle.style.strokeDashoffset = offset;

  // Counter animation
  let current = 0;
  const target = pct;
  const step = target / 60;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    probValue.textContent = current.toFixed(1) + "%";
    if (current >= target) clearInterval(timer);
  }, 16);
}

// ─── Show Result ───────────────────────────────────
function showResult(data) {
  const placeholder   = document.getElementById("result-placeholder");
  const content       = document.getElementById("result-content");
  const badge         = document.getElementById("result-badge");
  const icon          = document.getElementById("result-icon");
  const statusEl      = document.getElementById("result-status");
  const resultCard    = document.getElementById("result-card");

  placeholder.style.display = "none";
  content.style.display     = "block";

  const approved = data.approved;
  badge.className = "result-badge " + (approved ? "approved" : "rejected");
  icon.textContent   = approved ? "✓" : "✗";
  statusEl.textContent = data.status;

  // Ring
  animateRing(data.probability, approved);

  // Analysis grid
  document.getElementById("res-income").textContent  = "₹" + (data.details.total_income || 0).toLocaleString("en-IN");
  document.getElementById("res-emi").textContent     = "₹" + (data.details.emi || 0).toFixed(2);
  document.getElementById("res-balance").textContent = "₹" + (data.details.balance_income || 0).toFixed(0);
  document.getElementById("res-loginc").textContent  = (data.details.log_income || 0).toFixed(4);

  // Pulse card border
  resultCard.style.borderColor = approved ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)";
  resultCard.style.boxShadow = approved
    ? "0 0 40px rgba(16,185,129,0.15)"
    : "0 0 40px rgba(244,63,94,0.15)";

  // Scroll to result on mobile
  if (window.innerWidth < 1024) {
    document.getElementById("result-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ─── Form Submit ───────────────────────────────────
document.getElementById("loan-form").addEventListener("submit", async function(e) {
  e.preventDefault();

  const btnText    = document.getElementById("btn-text");
  const btnLoading = document.getElementById("btn-loading");
  const btn        = document.getElementById("predict-btn");

  btnText.style.display    = "none";
  btnLoading.style.display = "flex";
  btn.disabled = true;

  const formData = {
    Gender           : document.getElementById("gender").value,
    Married          : document.getElementById("married").value,
    Dependents       : document.getElementById("dependents").value,
    Education        : document.getElementById("education").value,
    Self_Employed    : document.getElementById("self_employed").value,
    Property_Area    : document.getElementById("property_area").value,
    ApplicantIncome  : parseFloat(document.getElementById("applicant_income").value) || 0,
    CoapplicantIncome: parseFloat(document.getElementById("coapplicant_income").value) || 0,
    LoanAmount       : parseFloat(document.getElementById("loan_amount").value) || 0,
    Loan_Amount_Term : parseFloat(document.getElementById("loan_term").value) || 360,
    Credit_History   : parseFloat(document.getElementById("credit_history").value),
  };

  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    if (!response.ok) throw new Error("Server error: " + response.status);
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    showResult(data);

  } catch (err) {
    alert("Prediction error: " + err.message + "\n\nMake sure the Flask server is running.");
    console.error(err);
  } finally {
    btnText.style.display    = "flex";
    btnLoading.style.display = "none";
    btn.disabled = false;
  }
});

// ─── Entry Animation ───────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".glass-card");
  cards.forEach((card, i) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 100 + i * 80);
  });
});
