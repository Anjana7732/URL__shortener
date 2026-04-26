# API documentation

Base URL (local development): `http://localhost:3000`

All JSON responses use `Content-Type: application/json` except where noted.

## `GET /`

Health check.

| | |
| --- | --- |
| **Response** | `200 OK`, plain text |

```http
URL Shortener API is running
```

---

## `GET /urls`

List all shortened URLs, newest first.

| | |
| --- | --- |
| **Response** | `200 OK` |

```json
[
  {
    "_id": "67890abcdef1234567890abcd",
    "shortCode": "a1b2c3",
    "originalUrl": "https://example.com",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
]
```

(Empty list `[]` if there are no URLs.)

---

## `POST /shorten`

Create a new short link. **Rate-limited** (5 requests per 60 seconds per IP). Attaches the `rateLimiter` middleware; CORS exposes the `Retry-After` response header for browsers.

| | |
| --- | --- |
| **Request headers** | `Content-Type: application/json` |
| **Request body** | See below |
| **Success** | `200 OK` + JSON |
| **Too many requests** | `429` + JSON + `Retry-After` (seconds) |

**Request body**

```json
{
  "url": "https://example.com/very/long/path"
}
```

**Response `200`**

```json
{
  "newUrl": {
    "_id": "67890abcdef1234567890abcd",
    "shortCode": "x7y9k2a",
    "originalUrl": "https://example.com/very/long/path",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
}
```

(`_id` and `__v` may be present on the nested document depending on MongoDB / Mongoose.)

**Response `429`**

```json
{
  "message": "Too many requests",
  "retryAfter": 47
}
```

`Retry-After` is also sent as an HTTP header (string seconds).

---

## `GET /:code`

Open a short link: looks up the code and **redirects** the browser to the stored URL, and records one **click** for analytics.

`code` is the short string (e.g. `a1b2c3`), not a path like `urls` or `analytics` (those are reserved routes and matched first).

| | |
| --- | --- |
| **Response** | `302` redirect, `Location: <originalUrl>` |
| **Not found** | `404`, body is plain text `Not found` |

No JSON body on success; the client follows the redirect.

---

## `GET /analytics/scale`

Returns a suggested vertical scale for charts: maximum clicks in the date range, and a `yMax` for the axis. Uses **UTC** calendar days; range is the last `days` days including today.

| | |
| --- | --- |
| **Query** | `days` (optional) — integer, default `7`, max `31` |
| **Example** | `GET /analytics/scale?days=7` |

**Response `200`**

```json
{
  "maxClicks": 12,
  "yMax": 18
}
```

---

## `GET /analytics/:code`

Clicks per **UTC** calendar day for the last `days` days, with **0** for days that had no clicks. Days are `YYYY-MM-DD` strings.

| | |
| --- | --- |
| **Path** | `code` — the short code to analyze |
| **Query** | `days` (optional) — default `7`, max `31` |
| **Example** | `GET /analytics/x7y9k2a?days=7` |

**Response `200`**

```json
[
  { "date": "2026-01-20", "clicks": 0 },
  { "date": "2026-01-21", "clicks": 3 },
  { "date": "2026-01-22", "clicks": 1 }
]
```
