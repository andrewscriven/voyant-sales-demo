const MAX_ENTRIES = 200;

export type CapturedLog = { time: string; type: string; message: string };

const buffer: CapturedLog[] = [];
let hooked = false;

function push(type: string, args: unknown[]) {
  const message = args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ')
    .slice(0, 2000);
  buffer.push({ time: new Date().toISOString(), type, message });
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
}

export function captureLog(type: string, ...args: unknown[]) {
  push(type, args);
}

export function getCapturedLogs(): CapturedLog[] {
  return buffer.slice();
}

export function getCapturedLogCount(): number {
  return buffer.length;
}

export function initDiagnosticLogger() {
  if (hooked || typeof console === 'undefined') return;
  hooked = true;
  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.log = (...args: unknown[]) => {
    push('log', args);
    original.log(...args);
  };
  console.info = (...args: unknown[]) => {
    push('info', args);
    original.info(...args);
  };
  console.warn = (...args: unknown[]) => {
    push('warn', args);
    original.warn(...args);
  };
  console.error = (...args: unknown[]) => {
    push('error', args);
    original.error(...args);
  };
}
