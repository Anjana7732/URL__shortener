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
