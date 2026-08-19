"""
Loan Approval Predictor — Training Pipeline
============================================
Dataset  : Kaggle Loan Prediction Dataset (train.xls / CSV format)
Algorithm: Random Forest Classifier (with GridSearchCV tuning)
Outputs  : model/preprocessor.pkl  ->  sklearn Pipeline
           model/loan_model.pkl    ->  Trained Random Forest model
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
import seaborn as sns

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler, OrdinalEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report, roc_auc_score
)

warnings.filterwarnings("ignore")

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH  = os.path.join(BASE_DIR, "train.xls")
MODEL_DIR  = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("  LOAN APPROVAL PREDICTOR - TRAINING PIPELINE")
print("=" * 60)

# 1. LOAD DATA
print("\n[1/7] Loading dataset...")
df = pd.read_csv(DATA_PATH)
print(f"      Rows: {df.shape[0]}  |  Columns: {df.shape[1]}")
df.drop(columns=["Loan_ID"], inplace=True)

# 2. FEATURE ENGINEERING
print("\n[2/7] Feature Engineering...")
df["LoanAmount"]       = df["LoanAmount"].fillna(df["LoanAmount"].median())
df["Loan_Amount_Term"] = df["Loan_Amount_Term"].fillna(df["Loan_Amount_Term"].mode()[0])
df["Credit_History"]   = df["Credit_History"].fillna(df["Credit_History"].mode()[0])
df["TotalIncome"]      = df["ApplicantIncome"] + df["CoapplicantIncome"]
df["Log_TotalIncome"]  = np.log1p(df["TotalIncome"])
df["Log_LoanAmount"]   = np.log1p(df["LoanAmount"])
df["EMI"]              = df["LoanAmount"] / df["Loan_Amount_Term"]
df["Balance_Income"]   = df["TotalIncome"] - (df["EMI"] * 1000)
df["Dependents"]       = df["Dependents"].replace("3+", "3").fillna("0").astype(int)
print("      Features created: TotalIncome, Log transforms, EMI, Balance_Income")

# 3. ENCODE TARGET
le_target = LabelEncoder()
df["Loan_Status"] = le_target.fit_transform(df["Loan_Status"])

# 4. FEATURE SETS
CAT_FEATURES = ["Gender", "Married", "Education", "Self_Employed", "Property_Area"]
NUM_FEATURES = [
    "ApplicantIncome", "CoapplicantIncome", "LoanAmount",
    "Loan_Amount_Term", "Credit_History", "Dependents",
    "TotalIncome", "Log_TotalIncome", "Log_LoanAmount", "EMI", "Balance_Income"
]

X = df[CAT_FEATURES + NUM_FEATURES]
y = df["Loan_Status"]
print(f"\n[3/7] Features: {len(CAT_FEATURES)} categorical + {len(NUM_FEATURES)} numerical")

# 5. SKLEARN PIPELINE
print("\n[4/7] Building preprocessing pipeline...")
cat_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1))
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

# 6. TRAIN
print("\n[5/7] Training Random Forest with GridSearchCV...")
param_grid = {
    "n_estimators"    : [100, 200, 300],
    "max_depth"       : [4, 6, 8, None],
    "min_samples_split": [2, 5, 10],
    "max_features"    : ["sqrt", "log2"]
}
rf_base = RandomForestClassifier(random_state=42, class_weight="balanced")
grid_search = GridSearchCV(rf_base, param_grid, cv=5, scoring="f1", n_jobs=-1, verbose=0)

X_train_proc = preprocessor.fit_transform(X_train)
X_test_proc  = preprocessor.transform(X_test)
grid_search.fit(X_train_proc, y_train)
best_rf = grid_search.best_estimator_

print(f"      Best params: {grid_search.best_params_}")

# 7. EVALUATE
print("\n[6/7] Evaluating...")
y_pred = best_rf.predict(X_test_proc)
y_prob = best_rf.predict_proba(X_test_proc)[:, 1]
acc  = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred)
rec  = recall_score(y_test, y_pred)
f1   = f1_score(y_test, y_pred)
auc  = roc_auc_score(y_test, y_prob)
X_all_proc = preprocessor.transform(X)
cv_scores  = cross_val_score(best_rf, X_all_proc, y, cv=5, scoring="accuracy")

print(f"""
      Accuracy   : {acc:.4f}
      Precision  : {prec:.4f}
      Recall     : {rec:.4f}
      F1 Score   : {f1:.4f}
      ROC-AUC    : {auc:.4f}
      CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})
""")
print(classification_report(y_test, y_pred, target_names=["Rejected", "Approved"]))

# 8. FEATURE IMPORTANCE PLOT
all_feature_names = CAT_FEATURES + NUM_FEATURES
importances = pd.Series(best_rf.feature_importances_, index=all_feature_names).sort_values(ascending=True)
fig, ax = plt.subplots(figsize=(10, 7))
colors = ["#6366f1" if i >= len(importances) - 5 else "#374151" for i in range(len(importances))]
importances.plot(kind="barh", ax=ax, color=colors, edgecolor="none")
ax.set_title("Feature Importance - Random Forest", fontsize=14, fontweight="bold", color="white")
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
print(f"      Feature importance chart saved.")

# 9. SAVE ARTIFACTS
print("\n[7/7] Saving model artifacts...")
joblib.dump(best_rf, os.path.join(MODEL_DIR, "loan_model.pkl"))
joblib.dump(preprocessor, os.path.join(MODEL_DIR, "preprocessor.pkl"))
metadata = {
    "cat_features"  : CAT_FEATURES,
    "num_features"  : NUM_FEATURES,
    "target_classes": le_target.classes_.tolist(),
    "accuracy"      : round(acc, 4),
    "f1_score"      : round(f1, 4),
    "auc"           : round(auc, 4),
    "best_params"   : grid_search.best_params_
}
joblib.dump(metadata, os.path.join(MODEL_DIR, "model_metadata.pkl"))
print("      Model, preprocessor, and metadata saved!")
print("\n" + "=" * 60)
print("  TRAINING COMPLETE!")
print("=" * 60)
