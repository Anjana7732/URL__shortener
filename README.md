# URL Shortener

A simple full-stack URL shortener built with Express, MongoDB, and React.  
It allows users to create short links, redirect to original URLs, and track clicks with basic analytics.

---

## Features

- Create short URLs from long links
- Redirect using short codes
- Track clicks with timestamps
- View 7-day click analytics in a chart
- Basic rate limiting to prevent abuse

---

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js, Express
- **Database:** MongoDB

---

## Project Structure

- `backend/` — Express API (runs on port 3000)
- `frontend/` — React app (runs on port 5173)

The frontend communicates with the backend at: http://localhost:3000

## Rate Limiter (Brief Explanation)

The rate limiter is implemented as a simple in-memory middleware that tracks requests based on the client’s IP address.

- Each IP has a record storing:
  - `count` → number of requests made
  - `startTime` → when the current time window started

- When a request is made:
  - If it’s the first request, a new record is created
  - If within 60 seconds, the request count is incremented
  - If the count exceeds 5 requests in that time window, the request is blocked

- If the limit is exceeded:
  - The server responds with **HTTP 429 (Too Many Requests)**
  - A `Retry-After` header is sent, telling the client how long to wait

- After 60 seconds:
  - The counter resets and a new window starts

## Install & run

### Backend

```bash
cd backend
npm install
node index.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Docker (optional)

Run this from the **project root** (the folder that contains `docker-compose.yml`, not from `backend/` or `frontend/`). That directory must include **`backend/Dockerfile`**, or the build will fail with *“open Dockerfile: no such file or directory”* on the backend service.

```bash
docker compose up -d --build
```

(Use `docker compose up --build` if you want logs in the foreground; `-d` runs in the background.)

- **UI:** [http://localhost:3000](http://localhost:3000)  
- **API:** [http://localhost:5000](http://localhost:5000) (mapped from the backend container’s port 3000)

The frontend uses `VITE_API_URL` (set in `docker-compose.yml`) so the browser calls the API on port **5000**; local non-Docker dev still defaults to the API on port **3000**.

### Do you need a `.env` file for Docker?

- **With the current project:** you do **not** need a `.env` to start the containers, as long as your MongoDB connection is configured in `backend/database/connection.js` and Atlas (or your host) allows connections from the internet.
- **Recommended later:** put sensitive values in a `.env` (and **never commit** real passwords). If you do, wire `MONGODB_URI` in code and pass it in `docker-compose` or `env_file` instead of hardcoding the URI.

