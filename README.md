# DIT AC Control

Prototype monorepo for monitoring and controlling **two** air conditioners in a DIT building.

| Unit | Asset tag | Default room |
|------|-----------|--------------|
| Lab 1 AC | `DIT-AC-001` | Computer Lab 1 |
| Lab 2 AC | `DIT-AC-002` | Computer Lab 2 |

## Apps

- `apps/api` - NestJS API, Prisma, PostgreSQL, IoT ingestion, WebSocket updates.
- `apps/web` - React dashboard for managers and facilities staff.
- `apps/mobile` - Expo React Native app for technicians (login, live fleet, alerts, commands).

## Local Setup

```bash
npm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate
npm --workspace apps/api run db:seed
```

Start the apps:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

Default URLs:

- API: `http://localhost:3001/v1`
- Web dashboard: `http://localhost:5173`
- Mobile: Expo development server from `apps/mobile`

### Mobile (production-ready technician app)

```bash
# Point at live server (physical device / release default)
cp apps/mobile/.env.example apps/mobile/.env
# EXPO_PUBLIC_API_URL=http://139.59.139.30:8080/v1

npm run dev:mobile
```

Features: secure token storage, home/units/alerts/account tabs, unit detail with power/setpoint/mode/fan commands, pull-to-refresh, live Socket.IO updates.

| Mode | API base |
|------|----------|
| Release build | `http://139.59.139.30:8080/v1` |
| Local emulator (`__DEV__` without env) | Android `10.0.2.2:3001`, iOS `localhost:3001` |
| Override | `EXPO_PUBLIC_API_URL` |

## IoT Flow

Prototype IoT endpoints are **open** (no device token). Controllers POST telemetry using firmware field names (`device_id`, `ac_id`, `power_w`, …), poll for commands on check-in, then ACK.

Representative endpoints:

- `POST /v1/iot/telemetry`
- `POST /v1/iot/checkin`
- `POST /v1/iot/commands/:id/ack`

### Live server (so data appears on the dashboard)

| | |
|--|--|
| Dashboard | http://139.59.139.30:8080 |
| API base | `http://139.59.139.30:8080/v1` |
| Telemetry | `POST http://139.59.139.30:8080/v1/iot/telemetry` |

Example body:

```json
{
  "device_id": "RAFIC-DEMO-NODE-001",
  "ac_id": "DIT-AC-001",
  "temperature_c": 27.5,
  "humidity_percent": 62,
  "power_w": 4.79,
  "ac_state": "ON",
  "device_status": "ONLINE",
  "wifi_rssi": -58
}
```

**IoT engineer guide:** [IOT_INTEGRATION.md](./IOT_INTEGRATION.md)  
**One-page board sheet:** [docs/IOT_CREDENTIALS_TEMPLATE.md](./docs/IOT_CREDENTIALS_TEMPLATE.md)

## Production deployment

The production server runs the API with PM2 and serves the built web app through Nginx. Once its read-only GitHub deploy key is registered, deploy the current `main` branch with:

```bash
ssh root@139.59.139.30 '/var/www/dit-ac-control/scripts/deploy.sh'
```

The script fetches `origin/main`, installs locked dependencies, generates the Prisma client, applies Prisma migrations when migration files exist, builds the API and web app, restarts `dit-ac-api` through PM2, and saves the PM2 process list. It refuses to overwrite uncommitted changes on the server.
