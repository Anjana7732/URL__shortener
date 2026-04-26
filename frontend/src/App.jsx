import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./App.css";

const API = "http://localhost:3000";
const CHART_DAYS = 7;
const SESSION_KEY = "urlShortenerUiV1";

function readSessionState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p === "object" && p ? p : null;
  } catch {
    return null;
  }
}

function writeSessionState(payload) {
  if (typeof window === "undefined") return;
  try {
    const { url, shortCode, selectedCode, rateLimitUntil: rl } = payload;
    const hasData =
      (url && String(url).trim()) ||
      (shortCode && String(shortCode)) ||
      (selectedCode && String(selectedCode)) ||
      (rl != null && rl > Date.now());
    if (!hasData) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip
);

const lineChartBase = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  animation: { duration: 400 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(0,0,0,0.75)",
      padding: 10,
      cornerRadius: 6,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: "#6b7280",
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 8,
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: "rgba(0,0,0,0.06)" },
      ticks: { color: "#6b7280", precision: 0 },
    },
  },
};

function buildEmptyLastNDays(days) {
  const n = Math.min(31, Math.max(1, days));
  const dayKeys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    dayKeys.push(d.toISOString().split("T")[0]);
  }
  return dayKeys.map((date) => ({ date, clicks: 0 }));
}

function yAxisMaxFromSeries(series) {
  if (!series.length) return 2;
  const peak = Math.max(
    0,
    ...series.map((d) => {
      const n = Number(d.clicks);
      return Number.isFinite(n) ? n : 0;
    })
  );
  if (peak === 0) return 2;
  const withHeadroom = Math.ceil(peak * 1.2);
  return Math.max(2, withHeadroom, peak + 1);
}

function yAxisStepSize(yMax) {
  if (yMax <= 20) return 1;
  return Math.max(1, Math.ceil(yMax / 8));
}

function formatDayLabel(isoDate) {
  const d = new Date(isoDate + "T12:00:00.000Z");
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const ERROR_AUTO_DISMISS_MS = 10_000;

const saved = readSessionState();
const initialRate =
  saved?.rateLimitUntil != null &&
  typeof saved.rateLimitUntil === "number" &&
  saved.rateLimitUntil > Date.now()
    ? saved.rateLimitUntil
    : null;

function App() {
  const [url, setUrl] = useState(() =>
    typeof saved?.url === "string" ? saved.url : ""
  );
  const [shortCode, setShortCode] = useState(() =>
    typeof saved?.shortCode === "string" ? saved.shortCode : ""
  );
  const [urlList, setUrlList] = useState([]);
  const [selectedCode, setSelectedCode] = useState(() =>
    typeof saved?.selectedCode === "string" ? saved.selectedCode : ""
  );
  const [series, setSeries] = useState([]);
  const [shortenLoading, setShortenLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState("");
  const [rateLimitUntil, setRateLimitUntil] = useState(() => initialRate);
  const [rateCountdown, setRateCountdown] = useState(0);
  const [chartDataKey, setChartDataKey] = useState(0);

  useEffect(() => {
    writeSessionState({
      url,
      shortCode,
      selectedCode,
      rateLimitUntil:
        rateLimitUntil && rateLimitUntil > Date.now() ? rateLimitUntil : null,
    });
  }, [url, shortCode, selectedCode, rateLimitUntil]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(""), ERROR_AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [error]);

  useEffect(() => {
    if (!rateLimitUntil) {
      queueMicrotask(() => {
        setRateCountdown(0);
      });
      return;
    }
    const until = rateLimitUntil;
    if (Date.now() >= until) {
      queueMicrotask(() => {
        setRateLimitUntil(null);
        setError("");
      });
      return;
    }

    const tick = () => {
      const rem = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRateCountdown(rem);
      if (rem <= 0) {
        setRateLimitUntil(null);
        setError("");
      }
    };

    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [rateLimitUntil]);

  const fetchUrlList = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) {
      setListLoading(true);
    }
    try {
      const res = await fetch(`${API}/urls?_=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load URLs.");
      const data = await res.json();
      setUrlList(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      if (!silent) {
        setError(err.message || "Failed to load URLs.");
      }
      return [];
    } finally {
      if (!silent) {
        setListLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void fetchUrlList();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchUrlList]);

  const fetchChartData = useCallback(async (code) => {
    if (!code) {
      setSeries([]);
      return false;
    }
    setChartLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({
        days: String(CHART_DAYS),
        _: String(Date.now()),
      });
      const res = await fetch(`${API}/analytics/${code}?${q}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch analytics.");
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSeries([...list]);
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setSeries([]);
      return false;
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    if (listLoading) {
      return;
    }
    if (urlList.length === 0) {
      queueMicrotask(() => {
        setSelectedCode("");
      });
      return;
    }
    if (selectedCode && !urlList.some((u) => u.shortCode === selectedCode)) {
      queueMicrotask(() => {
        setSelectedCode("");
      });
    }
  }, [urlList, selectedCode, listLoading]);

  useEffect(() => {
    if (selectedCode) {
      queueMicrotask(() => {
        setSeries(buildEmptyLastNDays(CHART_DAYS));
        setChartDataKey((k) => k + 1);
        void fetchChartData(selectedCode);
      });
    } else {
      queueMicrotask(() => {
        setSeries([]);
      });
    }
  }, [selectedCode, fetchChartData]);

  const selectDisplayValue = useMemo(() => {
    if (listLoading || urlList.length === 0) return "";
    if (selectedCode && urlList.some((u) => u.shortCode === selectedCode)) {
      return selectedCode;
    }
    return "";
  }, [listLoading, urlList, selectedCode]);

  const chartData = useMemo(() => {
    return {
      labels: series.map((d) => formatDayLabel(d.date)),
      datasets: [
        {
          label: "Clicks",
          data: series.map((d) => d.clicks),
          borderColor: "rgb(37, 99, 235)",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          pointBackgroundColor: "rgb(37, 99, 235)",
          pointBorderColor: "#fff",
          pointBorderWidth: 1.5,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [series]);

  const lineChartOptions = useMemo(() => {
    const yMax = yAxisMaxFromSeries(series);
    const stepSize = yAxisStepSize(yMax);
    return {
      ...lineChartBase,
      scales: {
        x: { ...lineChartBase.scales.x },
        y: {
          type: "linear",
          ...lineChartBase.scales.y,
          min: 0,
          max: yMax,
          beginAtZero: true,
          ticks: {
            ...lineChartBase.scales.y.ticks,
            stepSize,
            precision: 0,
          },
        },
      },
    };
  }, [series]);

  const handleRefreshChart = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!selectedCode) {
      return;
    }
    setSeries(buildEmptyLastNDays(CHART_DAYS));
    setChartDataKey((k) => k + 1);
    void (async () => {
      try {
        await fetchUrlList({ silent: true });
        const ok = await fetchChartData(selectedCode);
        if (ok) {
          setChartDataKey((k) => k + 1);
        }
      } catch (err) {
        setError(err?.message || "Refresh failed. Is the API running on :3000?");
      }
    })();
  };

  const handleShorten = async () => {
    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }

    setShortenLoading(true);
    setError("");
    setRateLimitUntil(null);
    setShortCode("");

    try {
      const res = await fetch(`${API}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.status === 429) {
        let seconds = 60;
        try {
          const data = await res.json();
          const raw = data?.retryAfter ?? res.headers.get("Retry-After");
          const n = Number(raw);
          if (Number.isFinite(n) && n > 0) seconds = Math.ceil(n);
        } catch {
          0;
        }
        setRateLimitUntil(Date.now() + seconds * 1000);
        setError("Too many requests. Wait before shortening again.");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to shorten URL.");
      }

      const data = await res.json();
      const code = data?.shortCode ?? data?.newUrl?.shortCode ?? "";
      if (!code) {
        throw new Error("Server did not return a short code.");
      }

      setShortCode(code);
      await fetchUrlList({ silent: true });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setShortenLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container container-wide">
        <header className="app-header">
          <h1>URL Shortener</h1>
          <p className="subtitle">
            Create a short link and view click analytics (last {CHART_DAYS}{" "}
            days)
          </p>
        </header>

        {rateCountdown > 0 && (
          <div className="rate-limit-banner" role="status">
            <span className="rate-limit-countdown">{rateCountdown}</span>
            <span>s until you can shorten again</span>
          </div>
        )}

        <div className="card">
          <div className="form-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/..."
            />
            <button
              type="button"
              onClick={handleShorten}
              disabled={shortenLoading || rateCountdown > 0}
            >
              {shortenLoading ? "…" : "Shorten"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}

          {shortCode && (
            <div className="result">
              <p className="result-label">Short link</p>
              <a
                className="short-link"
                href={`${API}/${shortCode}`}
                target="_blank"
                rel="noreferrer"
              >
                {API}/{shortCode}
              </a>
              <p className="result-label result-label-sub">Short code</p>
              <p className="short-code-text">{shortCode}</p>
            </div>
          )}
        </div>

        <div className="card chart-card">
          <div className="dashboard-head">
            <h2 className="section-title">Analytics dashboard</h2>
            <p className="dashboard-desc">
              The vertical scale grows with your highest daily click count (with a
              little headroom). Data updates when you change the selection, or when
              you click Refresh (returning to this tab does not auto-refresh).
            </p>
          </div>

          <div className="dashboard-toolbar">
            <label className="select-label" htmlFor="url-select">
              Shortened URL
            </label>
            <div className="dashboard-row">
              <select
                id="url-select"
                className="url-select"
                value={selectDisplayValue}
                onChange={(e) => setSelectedCode(e.target.value)}
                disabled={listLoading || urlList.length === 0}
                aria-label="Select a short URL to view analytics"
              >
                {urlList.length === 0 && !listLoading && (
                  <option value="">No short URLs yet</option>
                )}
                {urlList.length > 0 && (
                  <option value="">
                    Select a short URL to view the dashboard
                  </option>
                )}
                {urlList.map((u) => (
                  <option key={u.shortCode} value={u.shortCode}>
                    {u.shortCode} — {u.originalUrl}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-refresh"
                onClick={handleRefreshChart}
                disabled={!selectedCode}
                title="Reload the URL list, scale, and chart data (no full page reload)"
              >
                {chartLoading ? "…" : "Refresh"}
              </button>
            </div>
          </div>

          {listLoading || !selectedCode ? (
            <p className="empty-hint">
              {listLoading
                ? "Loading URLs…"
                : urlList.length === 0
                  ? "Create a short link to see it listed here."
                  : "Select a short URL from the list above to view the chart (last 7 days)."}
            </p>
          ) : (
            <div className={`chart-wrap ${chartLoading ? "chart-dim" : ""}`}>
              <Line
                key={`${selectedCode}-${chartDataKey}`}
                data={chartData}
                options={lineChartOptions}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
