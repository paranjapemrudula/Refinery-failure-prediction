# Monitor Refinery Machines

This project monitors refinery machines such as pumps, compressors, and valves using sensor inputs and predicts possible failures before they happen.

The system is being built as an interview-ready predictive maintenance prototype with these core goals:

- Real-time style machine health input and monitoring
- Failure prediction using machine learning
- Maintenance alerts and scheduling support
- AI-generated maintenance reports
- GenAI-assisted root cause explanations

## Project Goal

The user enters machine sensor readings from the frontend:

- `machine_id`
- `temperature`
- `pressure`
- `vibration`
- `flow_rate`
- `humidity`

The backend automatically records the timestamp, stores the reading, predicts whether the machine is healthy or at risk, and returns an explanation.

## Planned Data Flow

`Sensor Data -> ML Model -> Failure Prediction -> Alert -> GenAI Explanation`

## Why This Project Uses Django

We chose Django instead of Flask for this implementation because:

- Django is already familiar to the project owner, which improves development speed and confidence.
- Django provides built-in models, admin, routing, forms, and authentication support.
- The project needs structured entities such as sensor readings, predictions, alerts, schedules, and generated reports.
- Django admin will help demonstrate the system during interviews without building every internal management page from scratch.
- Django REST Framework can expose prediction APIs cleanly if we later connect a richer frontend.

Flask is still a valid option for smaller ML demos, but Django is a better fit for this full application workflow.

## Development Phases

### Phase 1

- Document architecture and technical choices
- Expand the small seed dataset into a larger synthetic dataset
- Train an initial ML model
- Build a Django app for sensor entry and prediction

### Phase 2

- Add dashboard views
- Add alert generation and maintenance scheduling
- Add AI-generated explanations and maintenance summaries

### Phase 3

- Improve data realism
- Improve model quality
- Add better analytics, charts, and role-based workflows

## Current Dataset Status

The provided seed dataset currently contains 24 rows. That is enough to define the schema and demonstrate failure patterns, but it is too small for a meaningful predictive model.

Because of that, the first practical step is to generate a larger synthetic dataset using the seed data as a pattern reference.

## Documentation

Detailed project notes are maintained in:

- `docs/project_journal.md`

This file is intended to help with interviews by documenting:

- architecture decisions
- framework selection
- ML design choices
- implementation phases
- tradeoffs and limitations

## Repository Structure

The project is now organized into clear top-level sections:

- `backend/`: Django app, ML artifacts, scripts, templates, and data
- `frontend/`: separate React application
- `docs/`: interview and project documentation
- `README.md`: root project overview

Compatibility wrappers are also available at the repo root:

- `manage.py`
- `scripts/`

These forward to the `backend/` implementation so older commands and IDE tabs still work.

## Data Files

- `backend/data/seed_machine_readings.csv`: the original 24-row reference dataset
- `backend/data/synthetic_machine_readings.csv`: the larger generated dataset used for training

## Synthetic Data Generator

The synthetic data generator script is:

- `backend/scripts/generate_synthetic_data.py`

Example usage:

```bash
cd backend
python scripts/generate_synthetic_data.py --rows 1000
```

This script:

- reads the 24-row seed dataset
- learns simple healthy and failure patterns per machine
- generates a larger time-series style dataset
- preserves the relationship between higher stress readings and failure risk

## Model Training

Train the baseline failure prediction model with:

```bash
cd backend
python scripts/train_failure_model.py
```

This creates:

- `backend/artifacts/failure_model.joblib`
- `backend/artifacts/failure_model_metadata.json`

## Smoke Test

Run a quick end-to-end API verification with:

```bash
cd backend
python scripts/smoke_test_prediction.py
```

This sends a sample machine reading through the Django prediction endpoint and prints the JSON response.

## Seed Dataset Schema

The dataset format is:

`timestamp, machine_id, temperature, pressure, vibration, flow_rate, humidity, failure`

## Expected Output

For each sensor entry, the system should return:

- machine health status
- failure probability or risk level
- maintenance alert if needed
- GenAI explanation of likely root cause

## GenAI Report Generation

The project now supports optional backend-only GenAI report generation for maintenance reports.

How it works:

- Django generates reports on the server side
- if `OPENAI_API_KEY` is configured, medium and high-risk reports can be generated using OpenAI
- if no key is configured, or the API call fails, the backend automatically falls back to the existing rule-based report generator
- the frontend never receives or stores the API key

Environment variables:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_REPORT_MODEL=gpt-4.1-mini
```

Important:

- do not put the API key in the React frontend
- do not commit the API key to git
- use environment variables or your hosting provider's secret manager

## GenAI Deployment Risks And Solutions

### 1. API key exposure

Risk:

- exposing the OpenAI key in React, git, logs, or public files

Solution:

- keep the key only in Django backend environment variables
- never use `VITE_...` variables for the key
- never hardcode the key in code

### 2. Rate limits

Risk:

- too many report generation requests can hit request or token limits

Solution:

- generate GenAI reports only for medium and high-risk cases
- keep prompts concise
- add retry/backoff later if traffic increases
- use the fallback rule-based report when API requests fail

### 3. Usage cost

Risk:

- frequent or long completions can increase cost

Solution:

- save generated reports in the database
- avoid regenerating existing reports
- use a smaller model for report generation
- keep outputs short and practical

### 4. External API downtime

Risk:

- report generation may fail when the external API is unavailable

Solution:

- wrap the GenAI call in backend error handling
- automatically fall back to rule-based reports
- keep prediction and alert flow working even if GenAI is unavailable

### 5. Hallucination risk

Risk:

- GenAI can produce overconfident explanations

Solution:

- ground prompts only in actual sensor values and prediction outputs
- do not let the model invent maintenance history
- present it as AI-assisted guidance, not a final engineering diagnosis

## Status

The first working backend prototype is now in place with:

- synthetic data generation
- baseline ML model training
- Django web pages for dashboard, input, and results
- a JSON prediction API at `/api/predict/`
- SQLite-backed storage for readings, predictions, and maintenance alerts
- dashboard summaries for machine health, alert distribution, and active maintenance alerts
- AI-style maintenance report generation with root cause summaries
- a separate React frontend with hoverable charts and API-driven monitoring views

## Run The Project

Apply migrations:

```bash
cd backend
python manage.py migrate
```

Train the model:

```bash
python scripts/train_failure_model.py
```

Start the server:

```bash
python manage.py runserver
```

## Run The React Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The React app runs at:

`http://127.0.0.1:5173/`

It connects to the Django backend at:

`http://127.0.0.1:8000/`

## Authentication

The React frontend now starts with a landing page and supports:

- `Log In` for existing users
- `Create Account` for first-time users

You can either register directly in the React app or create an admin user manually:

```bash
cd backend
python manage.py createsuperuser
```

Protected API endpoints:

- `/api/dashboard/`
- `/api/predict/`
- `/api/reports/<id>/`

Password policy for new accounts:

- minimum 8 characters
- at least one uppercase letter
- at least one lowercase letter
- at least one number
- at least one special character

## Frontend Features

- separate React app for a cleaner product-style user experience
- hoverable charts using live API data
- machine filter for dashboard exploration
- API-driven prediction form
- in-app maintenance report viewing
- report actions on the same main page with `View Report` and `Download Report`
