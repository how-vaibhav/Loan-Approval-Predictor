"""
Loan Approval Predictor - Flask Web Application
================================================
Routes:
  GET  /          -> Serve the prediction UI
  POST /predict   -> Accept form data, return prediction JSON
  GET  /health    -> Health check
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# ─── Load model artifacts ──────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR   = os.path.join(BASE_DIR, "model")

print("Loading model artifacts...")
model        = joblib.load(os.path.join(MODEL_DIR, "loan_model.pkl"))
preprocessor = joblib.load(os.path.join(MODEL_DIR, "preprocessor.pkl"))
metadata     = joblib.load(os.path.join(MODEL_DIR, "model_metadata.pkl"))
CAT_FEATURES = metadata["cat_features"]
NUM_FEATURES = metadata["num_features"]
print(f"Model loaded | Accuracy: {metadata['accuracy']} | AUC: {metadata['auc']}")


# ─── Routes ────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html", model_accuracy=metadata["accuracy"],
                           model_auc=metadata["auc"], model_f1=metadata["f1_score"])


@app.route("/health")
def health():
    return jsonify({"status": "ok", "model_accuracy": metadata["accuracy"]})


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)

        # --- Extract raw fields ---
        applicant_income   = float(data.get("ApplicantIncome", 0))
        coapplicant_income = float(data.get("CoapplicantIncome", 0))
        loan_amount        = float(data.get("LoanAmount", 0))
        loan_term          = float(data.get("Loan_Amount_Term", 360))
        credit_history     = float(data.get("Credit_History", 1))
        dependents_raw     = str(data.get("Dependents", "0")).replace("3+", "3")
        dependents         = int(dependents_raw)

        # --- Feature Engineering (mirrors train.py) ---
        total_income      = applicant_income + coapplicant_income
        log_total_income  = float(np.log1p(total_income))
        log_loan_amount   = float(np.log1p(loan_amount))
        emi               = loan_amount / loan_term if loan_term > 0 else 0
        balance_income    = total_income - (emi * 1000)

        # --- Build input DataFrame ---
        input_data = {
            "Gender"           : [data.get("Gender", "Male")],
            "Married"          : [data.get("Married", "No")],
            "Education"        : [data.get("Education", "Graduate")],
            "Self_Employed"    : [data.get("Self_Employed", "No")],
            "Property_Area"    : [data.get("Property_Area", "Urban")],
            "ApplicantIncome"  : [applicant_income],
            "CoapplicantIncome": [coapplicant_income],
            "LoanAmount"       : [loan_amount],
            "Loan_Amount_Term" : [loan_term],
            "Credit_History"   : [credit_history],
            "Dependents"       : [dependents],
            "TotalIncome"      : [total_income],
            "Log_TotalIncome"  : [log_total_income],
            "Log_LoanAmount"   : [log_loan_amount],
            "EMI"              : [emi],
            "Balance_Income"   : [balance_income],
        }
        df_input = pd.DataFrame(input_data)[CAT_FEATURES + NUM_FEATURES]

        # --- Preprocess & Predict ---
        X_proc      = preprocessor.transform(df_input)
        prediction  = model.predict(X_proc)[0]
        probability = model.predict_proba(X_proc)[0][1]

        status = "Approved" if prediction == 1 else "Rejected"
        # Map internal class order: target_classes = ['N', 'Y'] -> 1=Approved
        if metadata["target_classes"][1] == "N":
            status = "Rejected" if prediction == 1 else "Approved"
            probability = 1 - probability

        return jsonify({
            "status"     : status,
            "probability": round(float(probability) * 100, 2),
            "approved"   : status == "Approved",
            "details"    : {
                "total_income"   : round(total_income, 2),
                "emi"            : round(emi, 2),
                "balance_income" : round(balance_income, 2),
                "log_income"     : round(log_total_income, 4),
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)
