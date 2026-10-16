# Architecture and telemetry contract

## Data path

Simulation and hardware adapters submit normalized measurements to the Express API. The API stores users, password hashes, motors, telemetry readings, alerts and maintenance records in PostgreSQL. The analysis module updates motor health and creates an alert when a motor changes into a warning or critical state. The React application reads the data through authenticated REST endpoints.

## Telemetry

`POST /api/telemetry` accepts `motorId`, `vibration` (mm/s RMS), `temperature` (°C), `current` (A), `rpm`, and optional `source` (`hardware` or `simulation`). Measurements must be finite numbers; vibration, current and RPM cannot be negative. Each reading, motor health update and status-transition alert is stored in one PostgreSQL transaction. Hardware integrations need a dedicated device credential before exposing this endpoint outside a trusted network; the current build uses a user JWT.

## Health score

The demonstration score is 100 minus the largest of three bounded deviation scores:

- vibration: `max(0, (vibration - 1.5) × 24)`
- temperature: `max(0, (temperature - 65) × 3)`
- current: `max(0, (current - 22) × 4)`

Scores below 78 are warnings; below 55 are critical. Under this formula, vibration alone moves the score below the warning boundary at about 2.42 mm/s and below the critical boundary at about 3.38 mm/s. These values are demonstration defaults, not an equipment safety standard. Calibrate them against motor ratings, sensor placement and site practices before operational use.
