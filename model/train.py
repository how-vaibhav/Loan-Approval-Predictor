"""
Loan Approval Predictor — Training Pipeline (v2 — Improved)
=============================================================
Improvements over v1:
  ✅ XGBoost + LightGBM + Random Forest Stacking Ensemble
  ✅ Richer feature engineering (DTI, Loan-to-Income, Credit interactions)
  ✅ OneHotEncoder instead of OrdinalEncoder for categorical features
  ✅ SMOTE to handle class imbalance
  ✅ Probability calibration (Platt Scaling) for trustworthy confidence scores
  ✅ Optuna-based hyperparameter tuning (Bayesian optimisation)
  ✅ 10-fold StratifiedKFold cross-validation

Outputs:
  model/preprocessor.pkl   → sklearn ColumnTransformer
  model/loan_model.pkl     → Calibrated Stacking Ensemble
  model/model_metadata.pkl → Metrics + feature lists
  model/feature_importance.png
"""

import os
import sys
import warnings
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import (
    train_test_split, StratifiedKFold, cross_val_score
)
from sklearn.preprocessing import LabelEncoder, StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report, roc_auc_score
)

import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)

from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from imblearn.over_sampling import SMOTE

warnings.filterwarnings("ignore")

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "train.xls")
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("  LOAN APPROVAL PREDICTOR — TRAINING PIPELINE v2")
print("=" * 60)

# ── 1. LOAD DATA ───────────────────────────────────────────────
print("\n[1/8] Loading dataset...")
df = pd.read_csv(DATA_PATH)
print(f"      Rows: {df.shape[0]}  |  Columns: {df.shape[1]}")
df.drop(columns=["Loan_ID"], inplace=True)

# ── 2. FEATURE ENGINEERING ────────────────────────────────────
print("\n[2/8] Feature Engineering...")

# Fill key missing values before feature creation
df["LoanAmount"]       = df["LoanAmount"].fillna(df["LoanAmount"].median())
df["Loan_Amount_Term"] = df["Loan_Amount_Term"].fillna(df["Loan_Amount_Term"].mode()[0])
df["Credit_History"]   = df["Credit_History"].fillna(df["Credit_History"].mode()[0])
df["Dependents"]       = df["Dependents"].replace("3+", "3").fillna("0").astype(int)

# Core transforms
df["TotalIncome"]      = df["ApplicantIncome"] + df["CoapplicantIncome"]
df["Log_TotalIncome"]  = np.log1p(df["TotalIncome"])
df["Log_LoanAmount"]   = np.log1p(df["LoanAmount"])
df["EMI"]              = df["LoanAmount"] / df["Loan_Amount_Term"]
df["Balance_Income"]   = df["TotalIncome"] - (df["EMI"] * 1000)

# ── NEW: Richer financial ratios ──
# Debt-to-Income: most important banking metric
df["DTI_Ratio"]          = (df["EMI"] * 1000) / (df["TotalIncome"] + 1)
# Loan relative to income
df["Loan_Income_Ratio"]  = df["LoanAmount"] / (df["TotalIncome"] + 1)
# Credit score × income interaction
df["Credit_x_Income"]    = df["Credit_History"] * df["Log_TotalIncome"]
# Affordability per dependent
df["Income_Per_Dep"]     = df["TotalIncome"] / (df["Dependents"] + 1)
# Binary affordability flag
df["Is_Affordable"]      = (df["Balance_Income"] > 0).astype(int)

print("      New features: DTI_Ratio, Loan_Income_Ratio, Credit_x_Income,")
print("                    Income_Per_Dep, Is_Affordable")

# ── 3. ENCODE TARGET ──────────────────────────────────────────
le_target = LabelEncoder()
df["Loan_Status"] = le_target.fit_transform(df["Loan_Status"])

# ── 4. FEATURE SETS ───────────────────────────────────────────
CAT_FEATURES = ["Gender", "Married", "Education", "Self_Employed", "Property_Area"]
NUM_FEATURES = [
    "ApplicantIncome", "CoapplicantIncome", "LoanAmount",
    "Loan_Amount_Term", "Credit_History", "Dependents",
    "TotalIncome", "Log_TotalIncome", "Log_LoanAmount",
    "EMI", "Balance_Income",
    # New features
    "DTI_Ratio", "Loan_Income_Ratio", "Credit_x_Income",
    "Income_Per_Dep", "Is_Affordable",
]

X = df[CAT_FEATURES + NUM_FEATURES]
y = df["Loan_Status"]
print(f"\n[3/8] Features: {len(CAT_FEATURES)} categorical + {len(NUM_FEATURES)} numerical")

# ── 5. PREPROCESSING PIPELINE ─────────────────────────────────
print("\n[4/8] Building preprocessing pipeline...")
# OneHotEncoder treats categories as independent (no false ordering)
cat_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
])
num_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler())
])
preprocessor = ColumnTransformer([
    ("cat", cat_pipeline, CAT_FEATURES),
    ("num", num_pipeline, NUM_FEATURES)
])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"      Train: {X_train.shape[0]}  |  Test: {X_test.shape[0]}")

X_train_proc = preprocessor.fit_transform(X_train)
X_test_proc  = preprocessor.transform(X_test)

# ── 6. SMOTE — Handle class imbalance ────────────────────────
print("\n[5/8] Applying SMOTE to balance training classes...")
class_counts = np.bincount(y_train)
print(f"      Before SMOTE -> Class 0: {class_counts[0]}, Class 1: {class_counts[1]}")
sm = SMOTE(random_state=42)
X_train_res, y_train_res = sm.fit_resample(X_train_proc, y_train)
class_counts_after = np.bincount(y_train_res)
print(f"      After  SMOTE -> Class 0: {class_counts_after[0]}, Class 1: {class_counts_after[1]}")

# ── 7. OPTUNA TUNING — XGBoost ────────────────────────────────
print("\n[6/8] Tuning XGBoost with Optuna (50 trials)...")
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

def xgb_objective(trial):
    params = {
        "n_estimators":       trial.suggest_int("n_estimators", 100, 600),
        "max_depth":          trial.suggest_int("max_depth", 3, 10),
        "learning_rate":      trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "subsample":          trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree":   trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "min_child_weight":   trial.suggest_int("min_child_weight", 1, 10),
        "gamma":              trial.suggest_float("gamma", 0, 5),
        "reg_alpha":          trial.suggest_float("reg_alpha", 0, 2),
        "reg_lambda":         trial.suggest_float("reg_lambda", 0, 2),
        "random_state": 42,
        "eval_metric": "auc",
        "verbosity": 0,
    }
    mdl = XGBClassifier(**params)
    scores = cross_val_score(mdl, X_train_res, y_train_res, cv=skf,
                             scoring="roc_auc", n_jobs=-1)
    return scores.mean()

xgb_study = optuna.create_study(direction="maximize",
                                 sampler=optuna.samplers.TPESampler(seed=42))
xgb_study.optimize(xgb_objective, n_trials=50, show_progress_bar=False)
best_xgb_params = xgb_study.best_params
best_xgb_params.update({"random_state": 42, "eval_metric": "auc", "verbosity": 0})
print(f"      Best XGB AUC: {xgb_study.best_value:.4f}")
print(f"      Best params: {best_xgb_params}")

print("\n      Tuning LightGBM with Optuna (50 trials)...")

def lgbm_objective(trial):
    params = {
        "n_estimators":      trial.suggest_int("n_estimators", 100, 600),
        "max_depth":         trial.suggest_int("max_depth", 3, 12),
        "learning_rate":     trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "num_leaves":        trial.suggest_int("num_leaves", 20, 150),
        "subsample":         trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree":  trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "min_child_samples": trial.suggest_int("min_child_samples", 5, 50),
        "reg_alpha":         trial.suggest_float("reg_alpha", 0, 2),
        "reg_lambda":        trial.suggest_float("reg_lambda", 0, 2),
        "random_state": 42,
        "verbose": -1,
    }
    mdl = LGBMClassifier(**params)
    scores = cross_val_score(mdl, X_train_res, y_train_res, cv=skf,
                             scoring="roc_auc", n_jobs=-1)
    return scores.mean()

lgbm_study = optuna.create_study(direction="maximize",
                                   sampler=optuna.samplers.TPESampler(seed=42))
lgbm_study.optimize(lgbm_objective, n_trials=50, show_progress_bar=False)
best_lgbm_params = lgbm_study.best_params
best_lgbm_params.update({"random_state": 42, "verbose": -1})
print(f"      Best LGBM AUC: {lgbm_study.best_value:.4f}")

# ── 8. BUILD STACKING ENSEMBLE ────────────────────────────────
print("\n[7/8] Building Stacking Ensemble + Calibrating probabilities...")

xgb_model  = XGBClassifier(**best_xgb_params)
lgbm_model = LGBMClassifier(**best_lgbm_params)
rf_model   = RandomForestClassifier(
    n_estimators=300, max_depth=8, class_weight="balanced",
    random_state=42, n_jobs=-1
)
lr_meta    = LogisticRegression(C=1.0, max_iter=1000, random_state=42)

stacking = StackingClassifier(
    estimators=[
        ("xgb",  xgb_model),
        ("lgbm", lgbm_model),
        ("rf",   rf_model),
    ],
    final_estimator=lr_meta,
    cv=5,
    passthrough=False,
    n_jobs=-1,
)

# Fit stacking on SMOTE-balanced data
stacking.fit(X_train_res, y_train_res)

# Calibrate probabilities on original (non-resampled) training data
# so the confidence % reflects real-world class distribution
calibrated_model = CalibratedClassifierCV(stacking, cv="prefit", method="sigmoid")
calibrated_model.fit(X_train_proc, y_train)

# ── 9. EVALUATE ───────────────────────────────────────────────
print("\n[8/8] Evaluating on held-out test set...")
y_pred = calibrated_model.predict(X_test_proc)
y_prob = calibrated_model.predict_proba(X_test_proc)[:, 1]

acc  = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred)
rec  = recall_score(y_test, y_pred)
f1   = f1_score(y_test, y_pred)
auc  = roc_auc_score(y_test, y_prob)

# 10-fold CV on full dataset for a more reliable estimate
X_all_proc = preprocessor.transform(X)
cv10 = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)
cv_scores = cross_val_score(stacking, X_all_proc, y, cv=cv10, scoring="roc_auc", n_jobs=-1)

print(f"""
      Test-Set Metrics
      --------------------------------
      Accuracy   : {acc:.4f}
      Precision  : {prec:.4f}
      Recall     : {rec:.4f}
      F1 Score   : {f1:.4f}
      ROC-AUC    : {auc:.4f}
      10-Fold CV AUC: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}
      --------------------------------
""")
print(classification_report(y_test, y_pred, target_names=["Rejected", "Approved"]))

# -- 10. FEATURE IMPORTANCE PLOT (XGBoost base model) ---------
print("      Generating feature importance chart...")
xgb_model_fit = XGBClassifier(**best_xgb_params)
xgb_model_fit.fit(X_train_res, y_train_res)

# After OneHotEncoder the cat feature names expand — get them
ohe_names = list(
    preprocessor.named_transformers_["cat"]
    .named_steps["encoder"]
    .get_feature_names_out(CAT_FEATURES)
)
all_feature_names = ohe_names + NUM_FEATURES

importances = pd.Series(
    xgb_model_fit.feature_importances_[:len(all_feature_names)],
    index=all_feature_names
).sort_values(ascending=True).tail(20)  # top 20

fig, ax = plt.subplots(figsize=(10, 8))
colors = ["#6366f1" if i >= len(importances) - 5 else "#374151"
          for i in range(len(importances))]
importances.plot(kind="barh", ax=ax, color=colors, edgecolor="none")
ax.set_title("Top-20 Feature Importances (XGBoost)", fontsize=14,
             fontweight="bold", color="white")
ax.set_xlabel("Importance Score", color="white")
ax.tick_params(colors="white")
ax.set_facecolor("#1f2937")
fig.patch.set_facecolor("#111827")
for spine in ax.spines.values():
    spine.set_edgecolor("#374151")
plt.tight_layout()
plot_path = os.path.join(MODEL_DIR, "feature_importance.png")
plt.savefig(plot_path, dpi=150, bbox_inches="tight")
plt.close()
print("      Feature importance chart saved.")

# ── 11. SAVE ARTIFACTS ────────────────────────────────────────
print("\nSaving model artifacts...")
joblib.dump(calibrated_model, os.path.join(MODEL_DIR, "loan_model.pkl"))
joblib.dump(preprocessor,     os.path.join(MODEL_DIR, "preprocessor.pkl"))
metadata = {
    "cat_features"   : CAT_FEATURES,
    "num_features"   : NUM_FEATURES,
    "target_classes" : le_target.classes_.tolist(),
    "accuracy"       : round(acc, 4),
    "f1_score"       : round(f1, 4),
    "auc"            : round(auc, 4),
    "cv_auc_mean"    : round(float(cv_scores.mean()), 4),
    "cv_auc_std"     : round(float(cv_scores.std()), 4),
    "best_xgb_params": best_xgb_params,
    "best_lgbm_params": best_lgbm_params,
    "model_version"  : "v2-stacking-ensemble",
}
joblib.dump(metadata, os.path.join(MODEL_DIR, "model_metadata.pkl"))
print("      Model, preprocessor, and metadata saved!")
print("\n" + "=" * 60)
print("  TRAINING COMPLETE — v2 Stacking Ensemble")
print("=" * 60)
