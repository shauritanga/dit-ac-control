# DIT AC Control — IoT engineer guide (prototype)

**University final-year prototype.**  
Manages **two** ACs. IoT endpoints are **open** (no login, no device token).

| AC unit | `ac_id` | Room |
|---------|---------|------|
| Lab 1 AC | `DIT-AC-001` | Computer Lab 1 |
| Lab 2 AC | `DIT-AC-002` | Computer Lab 2 |

---

## Live server

| | |
|--|--|
| Dashboard | http://139.59.139.30:8080 |
| API base | `http://139.59.139.30:8080/v1` |

```text
POST http://139.59.139.30:8080/v1/iot/telemetry
POST http://139.59.139.30:8080/v1/iot/checkin
POST http://139.59.139.30:8080/v1/iot/commands/{commandId}/ack
```

**No authentication headers.** Only `Content-Type: application/json`.

---

## Send telemetry (shows on dashboard)

```http
POST http://139.59.139.30:8080/v1/iot/telemetry
Content-Type: application/json
```

### Payload (firmware field names)

```json
{
  "device_id": "RAFIC-DEMO-NODE-001",
  "ac_id": "DIT-AC-001",
  "timestamp": "2026-06-19T22:30:00Z",
  "voltage_v": 5.05,
  "current_a": 0.95,
  "power_w": 4.79,
  "energy_kwh": 0.0008,
  "temperature_c": 27.5,
  "humidity_percent": 62,
  "ac_state": "ON",
  "relay_state": "ON",
  "device_status": "ONLINE",
  "wifi_rssi": -58
}
```

### Lab 1 example

```bash
curl -sS -X POST "http://139.59.139.30:8080/v1/iot/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32-LAB1",
    "ac_id": "DIT-AC-001",
    "timestamp": "2026-07-19T12:00:00Z",
    "voltage_v": 230.1,
    "current_a": 5.2,
    "power_w": 1198,
    "energy_kwh": 12.4,
    "temperature_c": 24.5,
    "humidity_percent": 60,
    "ac_state": "ON",
    "relay_state": "ON",
    "device_status": "ONLINE",
    "wifi_rssi": -55
  }'
```

### Lab 2 example

```bash
curl -sS -X POST "http://139.59.139.30:8080/v1/iot/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32-LAB2",
    "ac_id": "DIT-AC-002",
    "temperature_c": 25.1,
    "humidity_percent": 58,
    "power_w": 980,
    "ac_state": "ON",
    "relay_state": "ON",
    "device_status": "ONLINE",
    "wifi_rssi": -60
  }'
```

### Fields

| Field | Required | Values / notes |
|-------|----------|----------------|
| `ac_id` | preferred* | `DIT-AC-001` or `DIT-AC-002` |
| `device_id` | preferred* | Controller serial / node name |
| `ac_state` | **yes** | `ON` \| `OFF` \| `UNKNOWN` |
| `timestamp` | no | ISO-8601; server time if omitted |
| `voltage_v` | no | Volts |
| `current_a` | no | Amps |
| `power_w` | no | Active power (W) — used on dashboard & alerts |
| `energy_kwh` | no | Energy (kWh) |
| `temperature_c` | no | Ambient °C |
| `humidity_percent` | no | 0–100 |
| `relay_state` | no | Accepted; dashboard uses `ac_state` |
| `device_status` | no | `ONLINE` / `OFFLINE` |
| `wifi_rssi` | no | dBm |
| `mode` | no | `COOL` \| `HEAT` \| `DRY` \| `FAN` \| `AUTO` (default `AUTO`) |
| `setpoint_c` | no | 16–30 |
| `fan_speed` | no | e.g. `AUTO`, `LOW`, `HIGH` |
| `error_code` | no | Creates a fault alert if set |

\* Provide **`ac_id` and/or `device_id`**.

### Success

```json
{
  "accepted": true,
  "telemetryId": "...",
  "acUnitId": "...",
  "ac_id": "DIT-AC-001",
  "device_id": "RAFIC-DEMO-NODE-001",
  "name": "Lab 1 AC"
}
```

Send telemetry every **30–60 seconds** so the unit stays online.

---

## Check-in (receive commands from the web UI)

```bash
curl -sS -X POST "http://139.59.139.30:8080/v1/iot/checkin" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32-LAB1",
    "ac_id": "DIT-AC-001",
    "wifi_rssi": -55,
    "device_status": "ONLINE"
  }'
```

Poll every **5–10 seconds**. If `command` is not null, execute it, then ACK.

---

## Acknowledge command

```bash
curl -sS -X POST "http://139.59.139.30:8080/v1/iot/commands/COMMAND_ID/ack" \
  -H "Content-Type: application/json" \
  -d '{ "success": true, "result": "OK" }'
```

---

## Command types (from dashboard / mobile)

| Type | Payload |
|------|---------|
| `POWER` | `{ "powerState": "ON" }` or `"OFF"` |
| `SETPOINT` | `{ "setpointC": 22 }` |
| `MODE` | `{ "mode": "COOL" }` |
| `FAN_SPEED` | `{ "fanSpeed": "HIGH" }` |
| `SWING` | `{ "swingEnabled": true }` |
| `FULL_STATE` | combined fields |

---

## Firmware loop

```text
API = "http://139.59.139.30:8080/v1"
AC_ID = "DIT-AC-001"   # or DIT-AC-002
DEVICE_ID = "RAFIC-DEMO-NODE-001"

while true:
  POST API + "/iot/telemetry"
    {
      device_id, ac_id, timestamp,
      voltage_v, current_a, power_w, energy_kwh,
      temperature_c, humidity_percent,
      ac_state, relay_state, device_status, wifi_rssi
    }

  r = POST API + "/iot/checkin" { device_id, ac_id }
  if r.command:
    ok = apply(r.command)
    POST API + "/iot/commands/" + r.command.id + "/ack" { success: ok }

  wait 5–30 seconds
```

---

## Definition of done

1. Telemetry returns `"accepted": true`  
2. Dashboard shows the unit **Online** with your readings  
3. A command from the web/mobile UI is received on check-in and ACKed  

---

## Note on security

Open IoT endpoints are for the **course prototype** only.  
Do not expose unauthenticated ingest on a public production system.
