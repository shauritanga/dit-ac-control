# IoT board sheet (prototype: 2 ACs, no auth)

**No passwords or device tokens.**  
Send the JSON fields below — same names as firmware.

| Board | `ac_id` | Room |
|-------|---------|------|
| Lab 1 ESP32 | `DIT-AC-001` | Computer Lab 1 |
| Lab 2 ESP32 | `DIT-AC-002` | Computer Lab 2 |

## Live server

| Field | Value |
|-------|--------|
| Dashboard | http://139.59.139.30:8080 |
| API base | `http://139.59.139.30:8080/v1` |
| Telemetry | `POST .../v1/iot/telemetry` (no auth) |
| Check-in | `POST .../v1/iot/checkin` (no auth) |
| Command ACK | `POST .../v1/iot/commands/{id}/ack` (no auth) |

## Payload format (required field names)

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

| Field | Required | Notes |
|-------|----------|--------|
| `ac_id` | preferred* | `DIT-AC-001` or `DIT-AC-002` |
| `device_id` | preferred* | Your board serial / node name |
| `ac_state` | **yes** | `ON` \| `OFF` \| `UNKNOWN` |
| Others | no | As above |

\* Provide **`ac_id` and/or `device_id`**.

## Quick test — Lab 1

```bash
curl -sS -X POST "http://139.59.139.30:8080/v1/iot/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32-LAB1",
    "ac_id": "DIT-AC-001",
    "timestamp": "2026-07-19T12:00:00Z",
    "voltage_v": 230.1,
    "current_a": 5.2,
    "power_w": 1000,
    "energy_kwh": 1.2,
    "temperature_c": 25,
    "humidity_percent": 60,
    "ac_state": "ON",
    "relay_state": "ON",
    "device_status": "ONLINE",
    "wifi_rssi": -55
  }'
```

## Quick test — Lab 2

```bash
curl -sS -X POST "http://139.59.139.30:8080/v1/iot/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32-LAB2",
    "ac_id": "DIT-AC-002",
    "temperature_c": 26,
    "humidity_percent": 58,
    "power_w": 900,
    "ac_state": "ON",
    "relay_state": "ON",
    "device_status": "ONLINE",
    "wifi_rssi": -60
  }'
```

Expect `"accepted": true`. Then open http://139.59.139.30:8080 → login → confirm both units online.

Full guide: [IOT_INTEGRATION.md](../IOT_INTEGRATION.md)
