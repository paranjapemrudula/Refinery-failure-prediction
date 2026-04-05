# Monitor Refinery Machines: Technical Interview Questions And Answers

This document contains 30 practical interview questions with sample answers.

The questions are ordered from easy to difficult and are written as if a technical interviewer is asking about this specific project while you explain it.

## Easy Level

### 1. What problem does this project solve?

**Sample answer:**

This project is a predictive maintenance system for refinery machines such as pumps, compressors, and valves. It collects sensor readings like temperature, pressure, vibration, flow rate, and humidity, then predicts whether a machine is healthy or at risk of failure. The main goal is to identify issues early so maintenance can be scheduled before a real breakdown happens.

### 2. Why did you choose this project?

**Sample answer:**

I chose it because predictive maintenance is a practical real-world problem that combines frontend development, backend APIs, database design, and machine learning. It also gave me a strong full-stack project to discuss in interviews because it is not just CRUD, it includes risk prediction, alert generation, reporting, and authentication.

### 3. What is the high-level architecture of your project?

**Sample answer:**

The frontend is built in React and the backend is built in Django with Django REST Framework. The user enters machine readings in the React app, the frontend sends them to the Django API, the backend stores the reading in SQLite, runs the trained ML model, creates a prediction result, optionally creates a maintenance alert and report, and then returns the result to the frontend.

### 4. What sensor inputs does your system use?

**Sample answer:**

The system currently uses six main inputs: `machine_id`, `temperature`, `pressure`, `vibration`, `flow_rate`, and `humidity`. These are enough to demonstrate how operating conditions can be translated into machine risk signals.

### 5. Why did you use Django instead of Flask for the backend?

**Sample answer:**

I used Django because this project needed more than just a lightweight API. It needed models, authentication, admin support, structured database entities, and room for future workflows like reports and maintenance scheduling. Django gave me a faster and more organized way to build that complete workflow.

### 6. Why did you choose React for the frontend?

**Sample answer:**

React was a good fit because the UI has multiple connected workflows like dashboard, prediction, alerts, and reports. It also made it easier to manage state, route navigation, and page-based architecture. Since this project has many interactive screens and dynamic API-driven updates, React was more scalable than plain HTML templates for the main user experience.

### 7. What happens when a user submits a prediction request?

**Sample answer:**

When the user submits the form, the frontend first validates the inputs. Then it sends the reading to `/api/predict/`. The backend validates again, stores the reading in `SensorReading`, runs `create_prediction_for_reading`, calculates failure probability, determines alert level, creates a `PredictionResult`, may create a `MaintenanceAlert`, creates a `GeneratedReport`, and sends the response back to the frontend.

### 8. What database tables or models are in this project?

**Sample answer:**

The main models are `SensorReading`, `PredictionResult`, `MaintenanceAlert`, `GeneratedReport`, and `AuthenticatorProfile`. `SensorReading` stores raw machine inputs, `PredictionResult` stores the ML outcome, `MaintenanceAlert` stores scheduling-related actions, `GeneratedReport` stores maintenance summaries, and `AuthenticatorProfile` supports OTP-based account recovery.

### 9. How is the frontend organized?

**Sample answer:**

The frontend is organized into `pages`, `components`, `utils`, and `api.js`. Pages like Dashboard, Prediction, Alerts, and Reports each handle one workflow. `TopNav` is a shared component. `api.js` centralizes backend communication, and `predictionGuidance.js` handles frontend validation logic.

### 10. What is the purpose of the dashboard page?

**Sample answer:**

The dashboard gives a monitoring view of machine behavior. It shows sensor trends, machine filters, summary cards, chart data, and recent predictions or alerts. It helps the user understand machine condition over time rather than only looking at one prediction form submission.

## Medium Level

### 11. How did you handle validation in this project? 

**Sample answer:**

I used validation in both the frontend and backend. On the frontend, `SensorValidationGuide` checks whether values are numeric, non-zero, and within healthy guidance ranges, which improves user experience. On the backend, serializers enforce the real validation rules again, which is important because frontend validation alone is not secure.

### 12. Why do you validate on both frontend and backend?

**Sample answer:**

Frontend validation is mainly for usability, so the user gets instant feedback without unnecessary API calls. Backend validation is for correctness and security, because clients can bypass the frontend completely. In production systems, the backend must always be treated as the final gatekeeper.

### 13. How is authentication implemented in your project?

**Sample answer:**

The project uses JWT-based authentication through `rest_framework_simplejwt`. The login API returns `access` and `refresh` tokens, and the frontend stores them in local storage. Protected endpoints like `/api/predict/`, `/api/dashboard/`, and `/api/reports/<id>/` require authentication.

### 14. What is the role of the `api.js` file in the frontend?

**Sample answer:**

`api.js` is the communication layer between React and Django. It stores token helper functions, attaches the bearer token to authenticated requests, centralizes error handling, and provides reusable functions like `login`, `fetchDashboard`, `submitPrediction`, `fetchReport`, and `updateAlert`. This keeps fetch logic out of page components.

### 15. How does the project keep machine context when moving between pages?

**Sample answer:**

The project uses query parameters like `?machine_id=PUMP_1` and sometimes `report_id` to preserve context. For example, after a high-risk prediction, the user can jump directly to alerts or reports for the same machine without selecting it again. That makes the workflow feel connected.

### 16. What is the relationship between `SensorReading` and `PredictionResult`?

**Sample answer:**

It is a one-to-one relationship. Each sensor reading produces one prediction result. That design makes sense because each submitted reading should map to exactly one prediction outcome and keeps the audit trail clean.

### 17. When does the system create a maintenance alert?

**Sample answer:**

The system creates a maintenance alert only when the final alert level is `Medium` or `High`. If the alert is `Low`, no alert is created. For high-risk predictions, the maintenance alert is scheduled sooner, currently within 2 hours, while medium-risk alerts are scheduled within 12 hours.

### 18. How are reports generated in this project?

**Sample answer:**

Reports are generated on the backend after prediction. The project first builds a rule-based report using sensor values and the prediction result. If an OpenAI API key and model are configured, the backend can generate a GenAI-based report for medium and high alerts. If that call fails, it falls back to the rule-based report.

### 19. Why did you keep GenAI report generation in the backend instead of the frontend?

**Sample answer:**

The main reason is security. The OpenAI API key should never be exposed in the React app. By keeping report generation in Django, the frontend only receives the finished report and never handles secrets directly.

### 20. What is one practical strength of your frontend design?

**Sample answer:**

A strong part of the frontend is that it follows the actual operator workflow. The user can monitor machines on the dashboard, submit readings in Prediction, respond to issues in Alerts, and review root-cause guidance in Reports. That makes the app easier to explain because each page has a clear business purpose.

## Medium To Hard Level

### 21. How does the ML prediction flow work internally?

**Sample answer:**

The backend loads the trained model and metadata from artifacts, builds a pandas DataFrame with the feature columns, runs `predict_proba`, and gets the failure probability. It compares that probability with a decision threshold from metadata, assigns an alert level, applies safety override rules if needed, stores the prediction, and creates downstream alert and report records.

### 22. Why do you use `predict_proba` instead of only a binary prediction?

**Sample answer:**

Using `predict_proba` gives more operational value because probability is more informative than just healthy or failure. It lets the system define different alert bands like low, medium, and high, and it gives users more context about how confident the model is.

### 23. What is the purpose of the safety override logic?

**Sample answer:**

The safety override exists because relying only on ML probability can be risky in industrial monitoring. If a single sensor crosses a critical threshold, such as very high temperature, pressure, or vibration, the system escalates the alert even if the model probability is lower. This makes the project more realistic because safety systems usually include hard rules in addition to ML.

### 24. Can you explain a case where safety override is useful?

**Sample answer:**

Suppose the model predicts only moderate probability because most inputs look normal, but vibration suddenly jumps above a critical threshold like `0.60`. In a refinery setting, that single reading may still require immediate inspection. The safety override ensures the system does not underreact in that case.

### 25. How did you deal with the small initial dataset?

**Sample answer:**

The seed dataset was too small for meaningful training, so I created a synthetic data generation step. The generator uses the small reference dataset as a pattern source and expands it into a larger training dataset while preserving the general relationship between stressed sensor values and higher failure risk. This allowed me to build an interview-ready prototype even without real industrial data.

### 26. What are the limitations of using synthetic data here?

**Sample answer:**

Synthetic data helps demonstrate architecture and pipeline design, but it does not capture all real-world variation, sensor noise, drift, or rare failure patterns. So I would present the current model as a prototype, not as production-grade reliability. In production, I would retrain with real historical machine data and evaluate more carefully.

### 27. How would you improve the scalability of the current backend?

**Sample answer:**

A few practical improvements would be moving long-running tasks like report generation to background jobs, adding caching for dashboard queries, using PostgreSQL instead of SQLite, and separating the ML inference service if traffic grows. I would also add better observability around prediction latency, failed API calls, and alert volumes.

### 28. What are the main security concerns in this project?

**Sample answer:**

The major concerns are protecting JWT tokens, securing the OpenAI API key, validating all inputs server-side, and making sure only authenticated users can access predictions, reports, and alerts. Another concern is account recovery, which is why the project includes OTP-based flows through Microsoft Authenticator support.

### 29. If this project were deployed in production, what would you change first?

**Sample answer:**

The first changes would be production-grade database selection, stronger token handling strategy, background workers for reports, logging and monitoring, stricter API rate limiting, and automated testing around prediction, alert creation, and auth flows. I would also think about ingesting real-time sensor streams instead of manual form submission.

### 30. If I challenge you and say this project is not justifiable because it mixes ML rules and hardcoded thresholds, how would you defend it?

**Sample answer:**

I would say that the combination is intentional. In safety-related monitoring systems, pure ML is often not enough because operators need interpretable and fail-safe behavior. The ML model helps estimate risk patterns from combined signals, while threshold-based overrides protect against obviously dangerous conditions. For a refinery-style monitoring use case, that hybrid approach is more practical and easier to justify than ML alone.

## Interview Tip

When answering these questions in a real interview, avoid sounding like you only memorized theory. Anchor your answer back to your implementation, for example by mentioning:

- `PredictionApiView` for prediction flow
- `create_prediction_for_reading` for ML and safety override logic
- `SensorReading`, `PredictionResult`, and `MaintenanceAlert` for data modeling
- `api.js` for frontend-backend communication
- query-parameter based machine navigation between Dashboard, Prediction, Alerts, and Reports

That makes your explanation sound practical and project-driven.
