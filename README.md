# Refinery Failure Prediction

Refinery Failure Prediction is a full-stack predictive maintenance application for refinery equipment such as pumps, compressors, and valves. It combines a Django backend, a React frontend, a synthetic sensor dataset, and a machine learning model to estimate failure risk, raise maintenance alerts, and generate maintenance reports.

## Overview

The application is designed to support a typical monitoring workflow:

- capture machine sensor readings
- estimate failure probability with a trained ML model
- classify alert severity
- create maintenance alerts for risky conditions
- generate maintenance reports with rule-based or OpenAI-assisted summaries

## Key Features

- Django backend for API, persistence, authentication, and report workflows
- React frontend for dashboard, prediction, alerts, reports, and authentication flows
- synthetic dataset generation for training and experimentation
- failure prediction model trained with scikit-learn
- maintenance alert creation for medium and high-risk conditions
- maintenance report generation with fallback-safe backend logic
- Microsoft Authenticator-based signup verification and password reset flow




### Sequence Diagram
<img width="1485" height="888" alt="refinary_prediction_SequenceDiagram" src="https://github.com/user-attachments/assets/42bb8708-8571-4d02-9fbc-0aba0fab2914" />


```

## Technology Stack

### Backend

- Django 5
- Django REST Framework
- pandas
- scikit-learn
- joblib
- OpenAI Python SDK

### Frontend

- React 18
- React Router
- Recharts
- Vite





## Local Setup

### 1. Backend

Install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Apply migrations:

```bash
python manage.py migrate
```

Generate synthetic data:

```bash
python scripts/generate_synthetic_data.py --rows 1000
```

Train the model:

```bash
python scripts/train_failure_model.py
```

Run the backend:

```bash
python manage.py runserver
```

### 2. Frontend

Install dependencies and start the Vite app:

```bash
cd frontend
npm install
npm run dev
```

Default local URLs:

- frontend: `http://127.0.0.1:5173/`
- backend: `http://127.0.0.1:8000/`

## Environment Variables

Optional backend environment variables for AI-assisted reports:

```bash
OPENAI_API_KEY=api_key
OPENAI_REPORT_MODEL=gpt-4.1-mini
```

If these variables are not configured, report generation falls back to the built-in rule-based implementation.

## Useful Commands

Generate synthetic data:

```bash
python backend/scripts/generate_synthetic_data.py --rows 1000
```

Train the failure model:

```bash
python backend/scripts/train_failure_model.py
```

Run a backend smoke test:

```bash
python backend/scripts/smoke_test_prediction.py
```

## Notes

- Keep secrets such as API keys in backend environment variables only.
- Do not expose OpenAI keys in the React application.
- The root `scripts/` and `manage.py` files are compatibility wrappers for the backend implementation.
