import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './LaunchModal.css';

export interface LaunchPrompt {
  id: string;
  label: string;
  path: string;
  reason: 'desktop-app' | 'missing';
}

interface LaunchModalProps {
  prompt: LaunchPrompt;
  busy: boolean;
  onClose: () => void;
  onBrowse: () => Promise<string | null>;
  onLaunch: (nextPath: string) => Promise<void>;
  note?: string | null;
}

export function LaunchModal({ prompt, busy, onClose, onBrowse, onLaunch, note }: LaunchModalProps) {
  const [pickedPath, setPickedPath] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPickedPath(null);
  }, [prompt.path, prompt.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const headline = prompt.reason === 'missing'
    ? 'This app was not found at the configured path.'
    : 'The configured shortcut did not open this app.';

  const displayPath = pickedPath ?? prompt.path;
  const hasPicked = Boolean(pickedPath);
  const host = document.querySelector('.app-content') ?? document.body;

  const applyPicked = (next: string) => {
    const trimmed = next.trim();
    if (trimmed) setPickedPath(trimmed);
  };

  return createPortal(
    <div className="launch-modal-scrim" role="presentation" onClick={() => { if (!busy) onClose(); }}>
      <div
        className="launch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="launch-modal-title">Locate {prompt.label}</h2>
        <p>{headline} Use Browse to choose the executable on this computer.</p>
        {note && <p className="launch-modal-note">{note}</p>}
        <div className="launch-modal-path">
          <span>
            Application path
            {!hasPicked && <em>Not found</em>}
          </span>
          <div
            className={`launch-modal-path-value${hasPicked ? ' is-ok' : ' is-bad'}`}
            title={displayPath}
          >
            {displayPath || 'No path configured'}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".exe,.lnk"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0] as (File & { path?: string }) | undefined;
            event.target.value = '';
            if (!file) return;
            applyPicked(file.path || file.name);
          }}
        />
        <div className="launch-modal-actions">
          <button
            type="button"
            className="launch-modal-btn"
            disabled={busy}
            onClick={() => {
              void (async () => {
                const picked = await onBrowse();
                if (picked) {
                  applyPicked(picked);
                  return;
                }
                fileRef.current?.click();
              })();
            }}
          >
            Browse…
          </button>
          {hasPicked && (
            <button
              type="button"
              className="launch-modal-btn launch-modal-btn--primary"
              disabled={busy}
              onClick={() => {
                if (pickedPath) void onLaunch(pickedPath);
              }}
            >
              {busy ? 'Launching…' : 'Launch'}
            </button>
          )}
          <button type="button" className="launch-modal-btn" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    host,
  );
}
