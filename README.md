# LoanIQ — AI Loan Approval Predictor

[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.3+-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3+-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Kaggle Dataset](https://img.shields.io/badge/Dataset-Kaggle-20BEFF?style=flat-square&logo=kaggle&logoColor=white)](https://www.kaggle.com/datasets/ninzaami/loan-predication?resource=download)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://loan-approval-predictor-8p0v.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

An end-to-end machine learning project that predicts loan approval status from applicant financial data. The system includes a preprocessing pipeline, feature engineering, hyperparameter-tuned Random Forest classifier, and a Flask web application for real-time inference.

**Live deployment:** [loan-approval-predictor-8p0v.onrender.com](https://loan-approval-predictor-8p0v.onrender.com)

---

## Table of Contents

- [Live Demo](#live-demo)
- [Architecture](#architecture)
- [Dataset](#dataset)
- [Feature Engineering](#feature-engineering)
- [ML Pipeline](#ml-pipeline)
- [Model Performance](#model-performance)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)

---

## Live Demo

The application is deployed on Render and accessible at:

> **[https://loan-approval-predictor-8p0v.onrender.com](https://loan-approval-predictor-8p0v.onrender.com)**

Note: Render free-tier instances spin down after inactivity. The first request may take 30–60 seconds to cold-start.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Client                          │
│         Vanilla JS · Glassmorphism UI · Real-time Calc         │
└─────────────────────────┬───────────────────────────────────────┘
                          │  HTTP / JSON
┌─────────────────────────▼───────────────────────────────────────┐
│                      Flask Application                          │
│                app.py · /predict · /health                      │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                      ML Inference Layer                         │
│                                                                  │
│  Raw Input ──► Feature Engineering ──► Preprocessing Pipeline  │
│                                                                  │
│    TotalIncome       ColumnTransformer     Random Forest        │
│    EMI               SimpleImputer    ──►  (300 trees)     ──►  │
│    Balance_Income    OrdinalEncoder        GridSearchCV         │
│    Log Transforms    StandardScaler        5-fold CV            │
└─────────────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                      Model Artifacts                            │
│          model/artifacts/model.pkl  ·  pipeline.pkl            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dataset

**Source:** [Loan Prediction Dataset — Kaggle](https://www.kaggle.com/datasets/ninzaami/loan-predication?resource=download)

| Property | Value |
|---|---|
| Training samples | 614 |
| Test samples | 367 |
| Raw features | 12 |
| Target variable | `Loan_Status` (Y / N) |
| Class distribution | ~69% approved, ~31% rejected |

**Raw features:**

| Feature | Type | Description |
|---|---|---|
| `Gender` | Categorical | Male / Female |
| `Married` | Categorical | Yes / No |
| `Dependents` | Categorical | 0, 1, 2, 3+ |
| `Education` | Categorical | Graduate / Not Graduate |
| `Self_Employed` | Categorical | Yes / No |
| `ApplicantIncome` | Numeric | Monthly income of the applicant |
| `CoapplicantIncome` | Numeric | Monthly income of the co-applicant |
| `LoanAmount` | Numeric | Loan amount in thousands |
| `Loan_Amount_Term` | Numeric | Term in months |
| `Credit_History` | Binary | 1 = good, 0 = poor |
| `Property_Area` | Categorical | Urban / Semiurban / Rural |

---

## Feature Engineering

Four engineered features are derived before preprocessing:

| Feature | Formula | Rationale |
|---|---|---|
| `TotalIncome` | `ApplicantIncome + CoapplicantIncome` | Combined household repayment capacity |
| `EMI` | `LoanAmount / Loan_Amount_Term` | Monthly obligation |
| `Balance_Income` | `TotalIncome - (EMI × 1000)` | Disposable income after EMI |
| `Log_TotalIncome` | `log(TotalIncome + 1)` | Normalises right-skewed income distribution |
| `Log_LoanAmount` | `log(LoanAmount + 1)` | Normalises right-skewed loan amounts |

---

## ML Pipeline

```
Raw Input
    │
    ▼
Feature Engineering (pandas)
    │
    ▼
ColumnTransformer
    ├── Numeric columns  → SimpleImputer(median) → StandardScaler
    └── Categorical cols → SimpleImputer(most_frequent) → OrdinalEncoder
    │
    ▼
RandomForestClassifier
    └── Tuned via GridSearchCV (5-fold stratified CV)
        ├── n_estimators: [100, 200, 300]
        ├── max_depth: [None, 10, 20]
        ├── min_samples_split: [2, 5, 10]
        └── Scoring: AUC-ROC
```

---

## Model Performance

| Metric | Score |
|---|---|
| Accuracy | 87.0% |
| AUC-ROC | 0.8307 |
| F1-Score | 0.911 |
| Precision | 0.88 |
| Recall | 0.94 |

**Top feature importances** (from Random Forest):

1. Credit History — 95
2. Balance Income — 72
3. Total Income — 65
4. EMI Amount — 58
5. Loan Amount — 45

---

## Project Structure

```
Loan Approval Predictor/
├── app.py                  # Flask application — /predict and /health endpoints
├── requirements.txt        # Python dependencies
├── Procfile                # Deployment entry point
│
├── model/
│   ├── train.py            # Training script — feature engineering + GridSearchCV
│   └── artifacts/
│       ├── model.pkl       # Trained Random Forest classifier
│       └── pipeline.pkl    # Fitted ColumnTransformer preprocessing pipeline
│
├── data/
│   └── train.xls           # Kaggle training dataset (CSV format)
│
├── templates/
│   └── index.html          # Jinja2 template — prediction UI
│
└── static/
    ├── style.css           # Dark glassmorphism design system
    └── script.js           # UI logic, animation components, API client
```

---

## Getting Started

### Prerequisites

- Python 3.8 or higher
- pip

### Installation

```bash
# Clone the repository
git clone https://github.com/how-vaibhav/Loan-Approval-Predictor.git
cd Loan-Approval-Predictor

# Install dependencies
pip install -r requirements.txt
```

### Train the Model

Run this once before starting the server. Artifacts are saved to `model/artifacts/`.

```bash
python model/train.py
```

Expected output:

```
Training complete.
Accuracy : 0.8699
AUC-ROC  : 0.8307
F1-Score : 0.9109
Model saved → model/artifacts/model.pkl
Pipeline saved → model/artifacts/pipeline.pkl
```

### Run Locally

```bash
python app.py
```

The application starts on `http://localhost:5000`.

---

## API Reference

### `GET /health`

Returns model status and loaded performance metrics.

**Response**
```json
{
  "status": "ok",
  "model": "Random Forest",
  "accuracy": 0.8699,
  "auc": 0.8307,
  "f1": 0.9109
}
```

### `POST /predict`

Accepts applicant data and returns a loan approval prediction.

**Request body**
```json
{
  "Gender": "Male",
  "Married": "Yes",
  "Dependents": "0",
  "Education": "Graduate",
  "Self_Employed": "No",
  "Property_Area": "Urban",
  "ApplicantIncome": 5000,
  "CoapplicantIncome": 1500,
  "LoanAmount": 150,
  "Loan_Amount_Term": 360,
  "Credit_History": 1
}
```

**Response**
```json
{
  "approved": true,
  "status": "Approved",
  "probability": 64.87,
  "details": {
    "total_income": 6500,
    "emi": 0.4167,
    "balance_income": 6083.3,
    "log_income": 8.7796
  }
}
```

---

## License

This project is licensed under the MIT License.
