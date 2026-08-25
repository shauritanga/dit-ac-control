import { useEffect, useState } from 'react';
import {
  Banknote,
  Bell,
  Check,
  Monitor,
  Moon,
  Sun,
  Zap,
} from 'lucide-react';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import {
  DEFAULT_PREFERENCES,
  usePreferences,
} from '../context/PreferencesContext';
import { formatTzs } from '../lib/format';
import type { WorkspaceSettings } from '../types';

type SettingsPageProps = {
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  role: string;
  tariffTzsPerKwh: number;
  onTariffChange: (value: number) => void;
  onSaved?: (message: string) => void;
};

const THEME_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  hint: string;
  icon: typeof Sun;
  preview: 'light' | 'dark' | 'system';
}> = [
  {
    value: 'light',
    label: 'Light',
    hint: 'Bright surfaces for daytime use',
    icon: Sun,
    preview: 'light',
  },
  {
    value: 'dark',
    label: 'Dark',
    hint: 'Lower glare for low-light rooms',
    icon: Moon,
    preview: 'dark',
  },
  {
    value: 'system',
    label: 'System',
    hint: 'Follow this computer’s theme',
    icon: Monitor,
    preview: 'system',
  },
];

export function SettingsPage({
  api,
  role,
  tariffTzsPerKwh,
  onTariffChange,
  onSaved,
}: SettingsPageProps) {
  const { mode, setMode, theme } = useTheme();
  const { preferences, setPreference } = usePreferences();
  const [savedFlash, setSavedFlash] = useState('');
  const [minInput, setMinInput] = useState(String(preferences.powerThresholdMinW));
  const [maxInput, setMaxInput] = useState(String(preferences.powerThresholdMaxW));
  const [tariffInput, setTariffInput] = useState(String(tariffTzsPerKwh));
  const [tariffSaving, setTariffSaving] = useState(false);
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    setMinInput(String(preferences.powerThresholdMinW));
    setMaxInput(String(preferences.powerThresholdMaxW));
  }, [preferences.powerThresholdMinW, preferences.powerThresholdMaxW]);

  useEffect(() => {
    setTariffInput(String(tariffTzsPerKwh));
  }, [tariffTzsPerKwh]);

  useEffect(() => {
    if (!savedFlash) return;
    const t = window.setTimeout(() => setSavedFlash(''), 2200);
    return () => window.clearTimeout(t);
  }, [savedFlash]);

  function flash(message: string) {
    setSavedFlash(message);
    onSaved?.(message);
  }

  function selectTheme(next: ThemeMode, label: string) {
    setMode(next);
    flash(`Theme set to ${label}`);
  }

  function commitMin(raw: string) {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < 0) {
      setMinInput(String(preferences.powerThresholdMinW));
      return;
    }
    const clamped = Math.min(20000, Math.max(0, n));
    setPreference('powerThresholdMinW', clamped);
    setMinInput(String(clamped));
    flash(`Minimum power: ${clamped} W`);
  }

  function commitMax(raw: string) {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < 0) {
      setMaxInput(String(preferences.powerThresholdMaxW));
      return;
    }
    const clamped = Math.min(20000, Math.max(0, n));
    setPreference('powerThresholdMaxW', clamped);
    setMaxInput(String(clamped));
    flash(`Maximum power: ${clamped} W`);
  }

  async function commitTariff(raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      setTariffInput(String(tariffTzsPerKwh));
      return;
    }
    const clamped = Math.min(100000, Math.max(0, Math.round(n * 100) / 100));
    if (clamped === tariffTzsPerKwh) {
      setTariffInput(String(clamped));
      return;
    }
    setTariffSaving(true);
    try {
      const saved = await api<WorkspaceSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({ tariffTzsPerKwh: clamped }),
      });
      onTariffChange(saved.tariffTzsPerKwh);
      setTariffInput(String(saved.tariffTzsPerKwh));
      flash(`Energy tariff: ${formatTzs(saved.tariffTzsPerKwh)} / kWh`);
    } catch (err) {
      setTariffInput(String(tariffTzsPerKwh));
      flash(err instanceof Error ? err.message : 'Unable to save energy tariff.');
    } finally {
      setTariffSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div className="settings-hero-copy">
          <p className="eyebrow">Workspace</p>
          <h2>Settings</h2>
          <p>Theme and alerts stay on this device. Energy tariff is shared across the system.</p>
        </div>
        {savedFlash ? (
          <div className="settings-saved" role="status">
            <Check size={15} strokeWidth={2.5} />
            {savedFlash}
          </div>
        ) : (
          <div className="settings-hero-meta">
            Active theme
            <strong>
              {mode === 'system' ? `System (${theme})` : mode === 'dark' ? 'Dark' : 'Light'}
            </strong>
          </div>
        )}
      </header>

      {/* Appearance — keep existing polished design */}
      <section className="settings-card" aria-labelledby="theme-heading">
        <div className="settings-card-header">
          <div>
            <h3 id="theme-heading">Appearance</h3>
            <p>Pick a color theme. Your choice is saved on this device only.</p>
          </div>
        </div>

        <div className="theme-grid" role="radiogroup" aria-label="Color theme">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                className={`theme-card theme-card--${opt.preview} ${active ? 'is-active' : ''}`}
                onClick={() => selectTheme(opt.value, opt.label)}
              >
                <div className="theme-preview" aria-hidden="true">
                  <div className="theme-preview-chrome">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="theme-preview-body">
                    <div className="theme-preview-sidebar" />
                    <div className="theme-preview-main">
                      <div className="theme-preview-bar" />
                      <div className="theme-preview-blocks">
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="theme-card-footer">
                  <span className="theme-card-icon">
                    <Icon size={18} />
                  </span>
                  <span className="theme-card-text">
                    <strong>{opt.label}</strong>
                    <small>{opt.hint}</small>
                  </span>
                  <span className={`theme-check ${active ? 'is-on' : ''}`} aria-hidden="true">
                    {active ? <Check size={14} strokeWidth={2.75} /> : null}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Notifications */}
      <section className="settings-card" aria-labelledby="notify-heading">
        <div className="settings-card-header settings-card-header-row">
          <div className="settings-card-title-row">
            <span className="settings-section-icon" aria-hidden="true">
              <Bell size={18} />
            </span>
            <div>
              <h3 id="notify-heading">Notifications</h3>
              <p>Choose what appears in the header bell for this prototype.</p>
            </div>
          </div>
        </div>

        <div className="settings-toggle-list settings-toggle-list-flush">
          <ToggleRow
            label="Offline units"
            description="When Lab 1 or Lab 2 stops reporting and is offline"
            checked={preferences.notifyOffline}
            onChange={(v) => {
              setPreference('notifyOffline', v);
              flash(v ? 'Offline alerts on' : 'Offline alerts off');
            }}
          />
          <ToggleRow
            label="Power band alerts"
            description={`Outside ${preferences.powerThresholdMinW}–${preferences.powerThresholdMaxW} W (malfunction or overload)`}
            checked={preferences.notifyHighPower}
            onChange={(v) => {
              setPreference('notifyHighPower', v);
              flash(v ? 'Power band alerts on' : 'Power band alerts off');
            }}
          />
          <ToggleRow
            label="Failed commands"
            description="When a power or setpoint command fails on a controller"
            checked={preferences.notifyFailedCommand}
            onChange={(v) => {
              setPreference('notifyFailedCommand', v);
              flash(v ? 'Failed command alerts on' : 'Failed command alerts off');
            }}
          />
        </div>
      </section>

      {/* Power thresholds — min & max as separate values */}
      <section className="settings-card" aria-labelledby="power-heading">
        <div className="settings-card-header settings-card-header-row">
          <div className="settings-card-title-row">
            <span className="settings-section-icon" aria-hidden="true">
              <Zap size={18} />
            </span>
            <div>
              <h3 id="power-heading">Power thresholds</h3>
              <p>
                Track healthy operating band while an AC is on. Below minimum may mean the unit is
                not working; above maximum means overload. Defaults{' '}
                {DEFAULT_PREFERENCES.powerThresholdMinW}–{DEFAULT_PREFERENCES.powerThresholdMaxW} W.
              </p>
            </div>
          </div>
        </div>

        <div className="power-threshold-pair">
          <label className="power-field">
            <span className="power-field-label">Minimum</span>
            <span className="power-field-hint">Malfunction if ON and below this</span>
            <span className="power-field-input">
              <input
                type="number"
                min={0}
                max={20000}
                step={50}
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                onBlur={() => commitMin(minInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                aria-label="Minimum power in watts"
              />
              <span>W</span>
            </span>
          </label>

          <label className="power-field">
            <span className="power-field-label">Maximum</span>
            <span className="power-field-hint">Overload if at or above this</span>
            <span className="power-field-input">
              <input
                type="number"
                min={0}
                max={20000}
                step={50}
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                onBlur={() => commitMax(maxInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                aria-label="Maximum power in watts"
              />
              <span>W</span>
            </span>
          </label>
        </div>

        <p className="power-threshold-hint">
          Example: min 200 W, max 1500 W. Lab AC reports 50 W while ON → possible fault. Reports
          1800 W → high load alert on Overview and Alerts.
        </p>
      </section>

      <section className="settings-card" aria-labelledby="tariff-heading">
        <div className="settings-card-header settings-card-header-row">
          <div className="settings-card-title-row">
            <span className="settings-section-icon" aria-hidden="true">
              <Banknote size={18} />
            </span>
            <div>
              <h3 id="tariff-heading">Energy tariff</h3>
              <p>
                Cost per kilowatt-hour used on Reports and History for every unit. Administrators
                can change this rate for the whole system.
              </p>
            </div>
          </div>
        </div>

        <div className="power-threshold-pair">
          <label className="power-field">
            <span className="power-field-label">Cost per 1 kWh</span>
            <span className="power-field-hint">
              {isAdmin
                ? 'Applies immediately to energy cost estimates.'
                : 'Only an administrator can change this rate.'}
            </span>
            <span className="power-field-input">
              <input
                type="number"
                min={0}
                max={100000}
                step={1}
                value={tariffInput}
                disabled={!isAdmin || tariffSaving}
                onChange={(e) => setTariffInput(e.target.value)}
                onBlur={() => {
                  if (isAdmin) void commitTariff(tariffInput);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                aria-label="Cost per kilowatt-hour in Tanzanian shillings"
              />
              <span>TZS</span>
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="settings-toggle">
      <span className="settings-toggle-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        role="switch"
        aria-checked={checked}
      />
      <span className="settings-switch" aria-hidden="true" />
    </label>
  );
}
