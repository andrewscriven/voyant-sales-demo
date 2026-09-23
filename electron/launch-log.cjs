const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TRACKING_ID = 'VsSalesDemoL0g1';
const LOG_UPLOAD_URL =
  process.env.VOYANT_LOG_UPLOAD_URL ||
  'https://analytics.voyantstudios.com/api/v1/client-logs';
const S3_BUCKET = process.env.CLIENT_LOGS_S3_BUCKET || 'voyantstudios-client-app-logs';
const S3_PREFIX = process.env.CLIENT_LOGS_S3_PREFIX || `prod/${TRACKING_ID}`;
const MAX_LOG_BYTES = 200_000;

let logFilePath = null;
let deviceId = null;

function ensureLogFile(userDataPath) {
  if (logFilePath) return logFilePath;
  logFilePath = path.join(userDataPath, 'launch-debug.log');
  return logFilePath;
}

function getDeviceId(userDataPath) {
  if (deviceId) return deviceId;
  const file = path.join(userDataPath, 'device-id.txt');
  try {
    if (fs.existsSync(file)) {
      deviceId = fs.readFileSync(file, 'utf8').trim() || null;
    }
  } catch {
    deviceId = null;
  }
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    try {
      fs.writeFileSync(file, deviceId, 'utf8');
    } catch {
      /* ignore */
    }
  }
  return deviceId;
}

function appendLaunchLog(userDataPath, entry) {
  const file = ensureLogFile(userDataPath);
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`;
  try {
    fs.appendFileSync(file, line, 'utf8');
    const stats = fs.statSync(file);
    if (stats.size > MAX_LOG_BYTES) {
      const content = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, content.slice(-Math.floor(MAX_LOG_BYTES * 0.7)), 'utf8');
    }
  } catch (error) {
    console.warn('[launch-log] write failed', error.message);
  }
  return line;
}

function readLaunchLogTail(userDataPath, maxBytes = 60_000) {
  const file = ensureLogFile(userDataPath);
  try {
    if (!fs.existsSync(file)) return null;
    const content = fs.readFileSync(file, 'utf8');
    return content.length > maxBytes ? content.slice(-maxBytes) : content;
  } catch (error) {
    return `__READ_ERROR__: ${error.message}`;
  }
}

function machineLabel() {
  try {
    return `${os.hostname()} - ${os.userInfo().username}`;
  } catch {
    return os.hostname();
  }
}

function buildBundle({ userDataPath, reason, context, version }) {
  return {
    trackingId: TRACKING_ID,
    reason,
    timestamp: new Date().toISOString(),
    app: {
      version: version || 'unknown',
      appType: 'electron',
      url: 'electron://sales-demo',
      userAgent: `VoyantSalesDemo/${version || 'unknown'}`,
      os: `${os.platform()} ${os.release()}`,
    },
    user: {
      email: null,
      name: null,
      company: null,
      function: null,
      isAuthenticated: false,
    },
    device: {
      voyantDeviceId: getDeviceId(userDataPath),
      userMachine: machineLabel(),
      sessionId: null,
      email: null,
    },
    consoleLogs: [],
    flightRecorder: null,
    playbackTrace: null,
    mainProcessLogs: {
      launchDebug: readLaunchLogTail(userDataPath),
      videoDebug: null,
      svgAnimationDebug: null,
      packDownload: null,
    },
    context: {
      appVersion: version || 'unknown',
      ...context,
    },
  };
}

function awsS3Key(reason, device) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hhmmss = now.toISOString().slice(11, 19).replace(/:/g, '');
  const safeReason = String(reason || 'unknown').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80);
  const safeDevice = String(device || 'unknown-device').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80);
  return `${S3_PREFIX}/${yyyy}/${mm}/${dd}/${safeDevice}/${hhmmss}-${safeReason}-${crypto.randomUUID().slice(0, 8)}.json`;
}

function uploadViaAwsCli(bundle) {
  return new Promise((resolve) => {
    const key = awsS3Key(bundle.reason, bundle.device?.voyantDeviceId);
    const tmp = path.join(os.tmpdir(), `voyant-sales-demo-log-${Date.now()}.json`);
    try {
      fs.writeFileSync(tmp, JSON.stringify(bundle), 'utf8');
    } catch (error) {
      resolve({ ok: false, via: 's3', error: error.message });
      return;
    }
    execFile(
      'aws',
      ['s3', 'cp', tmp, `s3://${S3_BUCKET}/${key}`, '--content-type', 'application/json', '--no-cli-pager'],
      { windowsHide: true, timeout: 20_000 },
      (error) => {
        try {
          fs.unlinkSync(tmp);
        } catch {
          /* ignore */
        }
        if (error) {
          resolve({ ok: false, via: 's3', error: error.message });
          return;
        }
        resolve({ ok: true, via: 's3', key });
      },
    );
  });
}

async function uploadViaApi(bundle) {
  try {
    const res = await fetch(LOG_UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, via: 'api', status: res.status, error: text.slice(0, 300) };
    }
    return { ok: true, via: 'api', body: text.slice(0, 300) };
  } catch (error) {
    return { ok: false, via: 'api', error: error.message };
  }
}

async function uploadLaunchLogs(userDataPath, reason, context, version) {
  const bundle = buildBundle({ userDataPath, reason, context, version });
  const api = await uploadViaApi(bundle);
  if (api.ok) {
    appendLaunchLog(userDataPath, { event: 'log-uploaded', reason, via: 'api' });
    return api;
  }
  const s3 = await uploadViaAwsCli(bundle);
  appendLaunchLog(userDataPath, {
    event: 'log-upload-result',
    reason,
    api,
    s3,
  });
  return s3.ok ? s3 : { ok: false, api, s3 };
}

module.exports = {
  TRACKING_ID,
  appendLaunchLog,
  readLaunchLogTail,
  uploadLaunchLogs,
  getDeviceId,
};
