## Anonymous Chat – Matrix-Themed, Privacy-First

Anonymous chat application for Klymo Ascent – built around **privacy**, **ephemeral conversations**, and **device-based safety** (no PII, no image or message storage).

### Core User Flow
- **1. Open app → Device ID**
  - Browser generates a unique **device fingerprint** using FingerprintJS.
  - Device ID is stored locally (LocalStorage + IndexedDB), never tied to any PII.

- **2. Take selfie (camera only) → AI verifies gender → Delete image**
  - React camera component (`react-webcam`) with **camera-only** capture (no file uploads).
  - Selfie sent to a separate **Flask ML service** for gender classification.
  - Flask processes the image **in-memory only** and immediately discards it.
  - Backend stores only: `device_id`, `gender`, `verified_at`.

- **3. Join queue with filter → Match via Socket.IO (planned)**
  - User selects a filter: `male`, `female`, or `any`.
  - Queue join endpoint enforces:
    - Device presence & validation
    - Ban status
    - **5 specific-gender matches/day** limit
    - **30s cooldown** between queue joins
    - Per-device rate limiting

- **4. 1-to-1 Chat → Messages never hit DB**
  - Ephemeral chat UI with a matrix/terminal aesthetic.
  - Messages are held only in memory on the server/client (no database persistence).

- **5. Usage limits & abuse prevention**
  - MongoDB `Device` model tracks:
    - `device_id`
    - `gender`, `verified_at`
    - `daily_matches` (per filter)
    - `last_queue_join`, `is_banned`
  - Enforced by Express middleware (rate limits, daily caps, cooldowns, bans).

### Tech Stack
- **Frontend**: React, Vite, `react-webcam`, `axios`
  - Matrix-themed UI (custom CSS)
  - Onboarding, queue, and chat screens
  - Device fingerprinting integration

- **Backend**: Node.js, Express, MongoDB (Mongoose)
  - Device-based rate limiting (`express-rate-limit`)
  - Usage limit & cooldown middleware
  - Gender verification result endpoint
  - Queue/matching endpoints (stubs ready for Socket.IO integration)

- **ML Service**: Python + Flask
  - `/classify` endpoint for gender classification
  - In-memory image handling only (no disk writes / DB storage)

### Key Privacy Guarantees
- **No PII**: No email, phone, or real identity collected.
- **No image storage**: Selfies used only for real-time classification, then discarded.
- **No chat history storage**: Messages never hit the database.
- **Device-based enforcement**: Limits and bans are per-device, not per-identity.

### Local Development

**Backend**
```bash
cd backend
npm install
npm run dev
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**ML Service**
```bash
cd ml-service
pip install -r requirements.txt
python main.py
```

Make sure environment variables (API URLs, MongoDB URI, etc.) are set according to the `.env.example` files.

### Status
- UI: Matrix-themed onboarding, queue, and chat flows implemented.
- Backend: Core REST endpoints + device limits in place; Socket.IO wiring planned next.
- ML: Flask service stubbed with mock classifier; ready to plug in a real model.