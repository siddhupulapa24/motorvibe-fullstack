# MotorVibe: Industrial Motor Vibration & Health Dashboard

MotorVibe is a React and Express application for monitoring motor vibration, temperature, current, RPM and runtime. PostgreSQL is the sole application datastore for users, password hashes, motors, telemetry, alerts and maintenance records.

## Architecture

```text
ESP32 / simulator → Express REST API → PostgreSQL → React dashboard
                                   ↘ health analysis → alerts
```

The API hashes account passwords with bcrypt before inserting them into PostgreSQL. Login checks the submitted password against that stored hash. Telemetry readings are also inserted into PostgreSQL.

## Stack

- Frontend: React, Vite, React Router, Axios, Recharts, Lucide
- Backend: Node.js, Express, PostgreSQL (`pg`), JWT, bcryptjs
- Schema: `backend/src/db.js` creates tables and indexes at API startup.

## Setup

Install Node.js 20+ and PostgreSQL. Create a database named `motorvibe` (for example with `createdb motorvibe` or pgAdmin). Copy `backend/.env.example` to `backend/.env`, set `DATABASE_URL` to your PostgreSQL connection string, and set a long random `JWT_SECRET`. MongoDB is no longer used by this app.

From the project root in PowerShell:

```powershell
npm.cmd install
npm.cmd install --prefix frontend
npm.cmd install --prefix backend
npm.cmd run seed
npm.cmd run dev
```

Open http://localhost:5173. API health check: http://localhost:5000/api/health.

Seed demo login: `admin@motorvibe.local` / `MotorVibe!2026` (development only). The seed command clears and repopulates the configured MotorVibe PostgreSQL tables; use it only for a development database.

## Telemetry API

Authenticated API routes use `Authorization: Bearer <JWT>`. The hardware adapter sends normalized data to `POST /api/telemetry`:

```json
{"motorId":"<numeric PostgreSQL motor id>","vibration":2.1,"temperature":64.5,"current":16.2,"rpm":1480,"source":"hardware"}
```

The web UI simulator sends the same fields with `source: "simulation"`. Hardware devices must use a dedicated device credential before exposing ingestion outside a trusted local development network; do not put PostgreSQL credentials on an ESP32.

## PBL demonstration

Register an account or use the seeded admin account, then confirm that the account row and password hash appear in PostgreSQL. From Live Monitoring, submit a simulation reading and confirm a new row appears in PostgreSQL `readings`. Passwords are stored as bcrypt hashes, never as plain text. PostgreSQL is the only database used by the application.
