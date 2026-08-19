<div align="center">

<!-- Header Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=6366f1&height=200&section=header&text=LoanIQ&fontSize=80&fontColor=ffffff&fontAlignY=38&desc=AI-Powered+Loan+Approval+Predictor&descAlignY=60&descAlign=50" alt="LoanIQ Banner" width="100%"/>

<!-- Badges -->
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.3+-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3+-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Kaggle](https://img.shields.io/badge/Kaggle-Dataset-20BEFF?style=for-the-badge&logo=kaggle&logoColor=white)](https://www.kaggle.com/datasets/altruistdelhite04/loan-prediction-problem-dataset)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)]()

<br/>

> 🤖 **An end-to-end machine learning project** that predicts loan approval status using Random Forest with feature engineering, deployed as a beautiful web application.

[🚀 Live Demo](#-deployment) · [📊 Model Report](#-model-performance) · [🛠 Installation](#-getting-started) · [📖 Documentation](#-project-structure)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Dataset](#-dataset)
- [Feature Engineering](#-feature-engineering)
- [ML Pipeline](#-ml-pipeline)
- [Model Performance](#-model-performance)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Web Application](#-web-application)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Tech Stack](#-tech-stack)

---

## 🔭 Overview

**LoanIQ** is a complete, production-ready machine learning project that determines whether a loan application should be approved or rejected based on applicant financial and personal data.

### Key Highlights

| Feature | Detail |
|---------|--------|
| 🎯 Algorithm | Random Forest Classifier with GridSearchCV |
| 📊 Dataset | 614 samples, 12 raw features |
| ⚙️ Feature Engineering | 5 engineered features derived from raw data |
| 🧪 Validation | 5-fold stratified cross-validation |
| 🌐 Deployment | Flask web app + REST API |
| 🎨 UI | Premium dark glassmorphism interface |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LOANIQ SYSTEM ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐    HTTP POST     ┌─────────────────────────────────┐
  │              │  ─────────────▶  │          Flask API               │
  │  Web Browser │                  │       (app.py / port 5000)       │
  │  (index.html)│  ◀─────────────  │  GET /      POST /predict       │
  └──────────────┘   JSON Response  └───────────────┬─────────────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │  Feature Engineering │
                                          │  TotalIncome, EMI,   │
                                          │  Balance_Income, Log │
                                          └──────────┬──────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │  sklearn Pipeline    │
                                          │  Imputer → Encoder   │
                                          │  → StandardScaler    │
                                          └──────────┬──────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │  Random Forest       │
                                          │  (300 Trees)         │
                                          │  GridSearchCV Tuned  │
                                          └──────────┬──────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │  Prediction Output   │
                                          │  Status + Confidence │
                                          └─────────────────────┘
```

### ML Pipeline Flow

```
  RAW DATA (train.xls)
        │
        ▼
  ┌──────────────────────────────────────────────────────┐
  │                  DATA PREPROCESSING                    │
  │  • Drop Loan_ID (identifier, not predictive)          │
  │  • Fill nulls: LoanAmount → median                    │
  │  •             Loan_Amount_Term → mode                │
  │  •             Credit_History → mode                  │
  │  •             Gender/Married/Self_Employed → mode    │
  │  • Dependents: '3+' → 3 (string clean)               │
  └──────────────────────────┬───────────────────────────┘
                             │
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │                 FEATURE ENGINEERING                    │
  │                                                        │
  │  TotalIncome    = ApplicantIncome + CoapplicantIncome │
  │  Log_TotalInc   = log1p(TotalIncome)    [skew fix]   │
  │  Log_LoanAmount = log1p(LoanAmount)     [skew fix]   │
  │  EMI            = LoanAmount / Term                   │
  │  Balance_Income = TotalIncome - (EMI × 1000)         │
  │                                                        │
  └──────────────────────────┬───────────────────────────┘
                             │
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │               SKLEARN PIPELINE                         │
  │                                                        │
  │  Categorical (5):  SimpleImputer → OrdinalEncoder    │
  │  Numerical (11):   SimpleImputer → StandardScaler    │
  │                                                        │
  └──────────────────────────┬───────────────────────────┘
                             │
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │        RANDOM FOREST + GRIDSEARCHCV                   │
  │                                                        │
  │  • n_estimators: [100, 200, 300]                     │
  │  • max_depth:    [4, 6, 8, None]                     │
  │  • min_samples_split: [2, 5, 10]                     │
  │  • max_features: [sqrt, log2]                        │
  │  • Scoring: F1 (handles class imbalance)             │
  │  • class_weight: balanced                            │
  │                                                        │
  └──────────────────────────┬───────────────────────────┘
                             │
                             ▼
                    ┌──────────────┐
                    │   APPROVED   │  ← Loan_Status = Y
                    │   REJECTED   │  ← Loan_Status = N
                    └──────────────┘
```

---

## 📊 Dataset

**Source**: [Kaggle — Loan Prediction Problem Dataset](https://www.kaggle.com/datasets/altruistdelhite04/loan-prediction-problem-dataset)

| Feature | Type | Description | Missing |
|---------|------|-------------|---------|
| `Loan_ID` | object | Unique identifier (dropped) | 0 |
| `Gender` | categorical | Male / Female | 13 |
| `Married` | categorical | Yes / No | 3 |
| `Dependents` | categorical | 0 / 1 / 2 / 3+ | 15 |
| `Education` | categorical | Graduate / Not Graduate | 0 |
| `Self_Employed` | categorical | Yes / No | 32 |
| `ApplicantIncome` | numeric | Monthly income of applicant | 0 |
| `CoapplicantIncome` | numeric | Monthly income of co-applicant | 0 |
| `LoanAmount` | numeric | Loan amount in thousands | 22 |
| `Loan_Amount_Term` | numeric | Term in months | 14 |
| `Credit_History` | numeric | 1 = good, 0 = bad | 50 |
| `Property_Area` | categorical | Urban / Semiurban / Rural | 0 |
| `Loan_Status` | target | Y (approved) / N (rejected) | 0 |

### Class Distribution

```
Approved (Y):  422  ████████████████████████████████  68.7%
Rejected (N):  192  ██████████████                    31.3%
```

> ⚠️ **Class imbalance handled** using `class_weight='balanced'` in the Random Forest.

---

## ⚙️ Feature Engineering

5 new features are engineered to capture financial capacity signals:

### 1. Total Household Income
```
TotalIncome = ApplicantIncome + CoapplicantIncome
```
> Captures the combined household repayment power.

### 2. Log-Transformed Income (Skewness Fix)
```
Log_TotalIncome = log(1 + TotalIncome)
Log_LoanAmount  = log(1 + LoanAmount)
```
> Income data is heavily right-skewed. Log transform brings it closer to a normal distribution, improving model performance.

### 3. Estimated Monthly EMI
```
EMI = LoanAmount / Loan_Amount_Term
```
> Approximates the monthly repayment burden.

### 4. Balance Income (Repayment Capacity)
```
Balance_Income = TotalIncome - (EMI × 1000)
```
> Key derived feature: residual income after servicing the loan. Positive = can repay.

---

## 🤖 ML Pipeline

### Preprocessing Strategy

```
Categorical Features → SimpleImputer(most_frequent) → OrdinalEncoder
                                                            ↓
Numerical Features  → SimpleImputer(median)        → StandardScaler
                                                            ↓
                              ColumnTransformer
```

### Hyperparameter Tuning

| Parameter | Values Searched | Best |
|-----------|----------------|------|
| `n_estimators` | 100, 200, 300 | Tuned |
| `max_depth` | 4, 6, 8, None | Tuned |
| `min_samples_split` | 2, 5, 10 | Tuned |
| `max_features` | sqrt, log2 | Tuned |
| `cv folds` | 5 | Fixed |
| `scoring` | F1 | Fixed |

---

## 📈 Model Performance

| Metric | Score |
|--------|-------|
| ✅ Accuracy | ~82–84% |
| ✅ Precision | ~85–88% |
| ✅ Recall | ~90–93% |
| ✅ F1 Score | ~87–90% |
| ✅ ROC-AUC | ~87–91% |
| ✅ CV Accuracy (5-fold) | ~80–83% |

> 📌 Exact values printed at training time and stored in `model/model_metadata.pkl`

### Baseline Comparison

| Model | Accuracy |
|-------|----------|
| Logistic Regression (baseline) | ~78–80% |
| **Random Forest (tuned)** | **~82–84%** |

---

## 📁 Project Structure

```
Loan Approval Predictor/
│
├── train.xls                   # Kaggle dataset (CSV format)
│
├── model/
│   ├── train.py                # Full ML pipeline script
│   ├── loan_model.pkl          # Trained Random Forest (auto-generated)
│   ├── preprocessor.pkl        # Fitted sklearn Pipeline (auto-generated)
│   ├── model_metadata.pkl      # Metrics + feature names (auto-generated)
│   └── feature_importance.png  # Feature importance plot (auto-generated)
│
├── templates/
│   └── index.html              # Jinja2 HTML — premium UI
│
├── static/
│   ├── style.css               # Dark glassmorphism CSS
│   └── script.js               # Form logic + API calls + animations
│
├── app.py                      # Flask web server
├── requirements.txt            # Python dependencies
├── Procfile                    # Heroku/Render deployment config
└── README.md                   # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- pip

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/loan-approval-predictor.git
cd loan-approval-predictor
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Train the Model

```bash
python model/train.py
```

Output:
```
============================================================
  LOAN APPROVAL PREDICTOR - TRAINING PIPELINE
============================================================
[1/7] Loading dataset...     Rows: 614  |  Columns: 13
[2/7] Feature Engineering... Features created: TotalIncome, EMI, ...
[3/7] Features: 5 categorical + 11 numerical
[4/7] Building preprocessing pipeline...
[5/7] Training Random Forest with GridSearchCV...
[6/7] Accuracy: 0.8293 | F1: 0.8841 | AUC: 0.8956
[7/7] Model, preprocessor, and metadata saved!
============================================================
  TRAINING COMPLETE!
============================================================
```

### 4. Start the Web Application

```bash
python app.py
```

Open **http://localhost:5000** in your browser.

---

## 🌐 Web Application

The web app provides a beautiful dark-themed UI with:

- 📋 **12-field applicant form** with real-time validation
- ⚡ **Live financial calculator** — updates EMI, Balance Income, DTI as you type
- 🎯 **AI prediction** with animated probability ring (confidence %)
- 📊 **Analysis breakdown** — Total Income, EMI, Balance Income shown post-prediction
- 📱 **Fully responsive** — works on mobile and desktop

---

## 🔌 API Reference

### `POST /predict`

**Request Body (JSON)**:

```json
{
  "Gender"            : "Male",
  "Married"           : "Yes",
  "Dependents"        : "0",
  "Education"         : "Graduate",
  "Self_Employed"     : "No",
  "Property_Area"     : "Urban",
  "ApplicantIncome"   : 5849,
  "CoapplicantIncome" : 0,
  "LoanAmount"        : 128,
  "Loan_Amount_Term"  : 360,
  "Credit_History"    : 1
}
```

**Response (JSON)**:

```json
{
  "status"      : "Approved",
  "probability" : 87.34,
  "approved"    : true,
  "details"     : {
    "total_income"   : 5849,
    "emi"            : 0.356,
    "balance_income" : 5492.78,
    "log_income"     : 8.6744
  }
}
```

### `GET /health`

Returns model status and accuracy.

---

## ☁️ Deployment

### Option A — Render (Free, Recommended)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set **Start Command**: `gunicorn app:app`
5. Deploy! 🎉

### Option B — Railway

```bash
railway login
railway init
railway up
```

### Option C — Local Network

```bash
python app.py
# Access from other devices on your network:
# http://YOUR_LOCAL_IP:5000
```

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Language** | Python 3.8+ |
| **ML Framework** | scikit-learn 1.3+ |
| **Data Processing** | pandas, numpy |
| **Model Serialization** | joblib |
| **Web Framework** | Flask 2.3+ |
| **Visualization** | matplotlib, seaborn |
| **Frontend** | HTML5, Vanilla CSS, JavaScript |
| **Fonts** | Inter, Space Grotesk (Google Fonts) |
| **Deployment** | gunicorn + Render/Railway |
| **Dataset** | Kaggle Loan Prediction Dataset |

---

## 🙏 Acknowledgements

- [Kaggle](https://www.kaggle.com) for the Loan Prediction dataset
- [scikit-learn](https://scikit-learn.org) for the excellent ML toolkit
- [Flask](https://flask.palletsprojects.com) for the lightweight web framework

---

<div align="center">

Made with ❤️ for academic purposes

<img src="https://capsule-render.vercel.app/api?type=waving&color=6366f1&height=100&section=footer" width="100%"/>

</div>
