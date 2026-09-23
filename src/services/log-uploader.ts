import { getCapturedLogs } from './diagnostic-logger';

export const SALES_DEMO_TRACKING_ID = 'VsSalesDemoL0g1';

const LOG_UPLOAD_URL =
  import.meta.env.VITE_LOG_UPLOAD_URL ||
  'https://analytics.voyantstudios.com/api/v1/client-logs';

const UPLOAD_FETCH_TIMEOUT_MS = 12_000;

function deviceId(): string {
  try {
    const key = 'voyant_sales_demo_device_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(key, next);
    return next;
  } catch {
    return 'unknown-device';
  }
}

function runtime(): 'electron' | 'web' {
  return typeof window !== 'undefined' && window.electronAPI ? 'electron' : 'web';
}

async function mainProcessLogs() {
  if (!window.electronAPI?.getDiagnosticLogFiles) return null;
  try {
    return await window.electronAPI.getDiagnosticLogFiles({ maxBytes: 60_000 });
  } catch {
    return null;
  }
}

export async function uploadLogs(
  reason: string,
  context: Record<string, unknown> = {},
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const version = await window.electronAPI?.getAppVersion().catch(() => 'web') ?? 'web';
  const bundle = {
    trackingId: SALES_DEMO_TRACKING_ID,
    reason,
    timestamp: new Date().toISOString(),
    app: {
      version,
      appType: runtime(),
      url: window.location.href,
      userAgent: navigator.userAgent.slice(0, 200),
      os: navigator.platform,
    },
    user: {
      email: null,
      name: null,
      company: null,
      function: null,
      isAuthenticated: false,
    },
    device: {
      voyantDeviceId: deviceId(),
      userMachine: null,
      sessionId: null,
      email: null,
    },
    consoleLogs: getCapturedLogs(),
    flightRecorder: null,
    playbackTrace: null,
    mainProcessLogs: await mainProcessLogs(),
    context: {
      appVersion: version,
      runtime: runtime(),
      ...context,
    },
  };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), UPLOAD_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(LOG_UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[launch-log] upload failed HTTP ${res.status} (${reason})`);
      return false;
    }
    console.info(`[launch-log] uploaded (${reason})`);
    return true;
  } catch (error) {
    console.warn(`[launch-log] upload error (${reason})`, error);
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
