import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, classification_report, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "synthetic_machine_readings.csv"
MODEL_PATH = BASE_DIR / "artifacts" / "failure_model.joblib"
METADATA_PATH = BASE_DIR / "artifacts" / "failure_model_metadata.json"

FEATURE_COLUMNS = [
    "machine_id",
    "temperature",
    "pressure",
    "vibration",
    "flow_rate",
    "humidity",
]
TARGET_COLUMN = "failure"


def build_pipeline():
    numeric_features = [
        "temperature",
        "pressure",
        "vibration",
        "flow_rate",
        "humidity",
    ]
    categorical_features = ["machine_id"]

    numeric_pipeline = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="median"))]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, numeric_features),
            ("cat", categorical_pipeline, categorical_features),
        ]
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=250,
                    max_depth=10,
                    random_state=42,
                    class_weight="balanced",
                ),
            ),
        ]
    )


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Synthetic dataset not found at {DATA_PATH}. Generate it before training."
        )

    dataframe = pd.read_csv(DATA_PATH)
    X = dataframe[FEATURE_COLUMNS]
    y = dataframe[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, f1_score, _ = precision_recall_fscore_support(
        y_test,
        y_pred,
        average="binary",
        zero_division=0,
    )
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)

    metadata = {
        "model_type": "RandomForestClassifier",
        "feature_columns": FEATURE_COLUMNS,
        "decision_threshold": 0.5,
        "dataset_path": str(DATA_PATH.name),
        "known_machine_ids": sorted(dataframe["machine_id"].dropna().astype(str).unique().tolist()),
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1_score), 4),
        "classification_report": report,
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(f"Model saved to {MODEL_PATH}")
    print(f"Metadata saved to {METADATA_PATH}")
    print(f"Accuracy: {accuracy:.4f}")
    print("Classification report:")
    print(classification_report(y_test, y_pred, zero_division=0))


if __name__ == "__main__":
    main()
