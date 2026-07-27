import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  LayoutGrid,
  Radio,
  Search,
  Table2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { OverviewDevice } from '../types';
import { formatRelativeTime } from '../lib/format';

type DevicesPageProps = {
  devices: OverviewDevice[];
  onOpenUnit: (unitId: string) => void;
};

type ViewMode = 'table' | 'grid';
type StatusFilter = 'all' | 'online' | 'offline' | 'unassigned';
type SortKey = 'serial' | 'status' | 'rssi' | 'lastSeen' | 'firmware';

const PAGE_SIZES = [10, 25, 50, 100] as const;
const VIEW_KEY = 'dit-ac-devices-view';
const PAGE_SIZE_KEY = 'dit-ac-devices-page-size';

function signalLabel(rssi: number | null) {
  if (rssi == null) return { text: 'Unknown', tone: 'info' as const, tag: 'info' as const };
  if (rssi >= -55) return { text: 'Excellent', tone: 'success' as const, tag: 'good' as const };
  if (rssi >= -70) return { text: 'Good', tone: 'success' as const, tag: 'good' as const };
  if (rssi >= -80) return { text: 'Fair', tone: 'warning' as const, tag: 'warning' as const };
  return { text: 'Weak', tone: 'critical' as const, tag: 'critical' as const };
}

function formatAbsolute(input: string | null) {
  if (!input) return '—';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function DevicesPage({ devices, onOpenUnit }: DevicesPageProps) {
  const [view, setView] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_KEY);
    return stored === 'table' || stored === 'grid' ? stored : 'table';
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [firmware, setFirmware] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('serial');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const stored = Number(localStorage.getItem(PAGE_SIZE_KEY));
    return PAGE_SIZES.includes(stored as (typeof PAGE_SIZES)[number]) ? stored : 10;
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
  }, [pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, status, firmware, pageSize, sortKey, sortDir]);

  useEffect(() => {
    if (!selectedId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedId(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const firmwareOptions = useMemo(() => {
    const set = new Set<string>();
    for (const device of devices) {
      if (device.firmware) set.add(device.firmware);
    }
    return [...set].sort();
  }, [devices]);

  const summary = useMemo(() => {
    const online = devices.filter((d) => d.online).length;
    const offline = devices.length - online;
    const unassigned = devices.filter((d) => !d.acUnit).length;
    const weak = devices.filter((d) => d.rssi != null && d.rssi < -80).length;
    return { total: devices.length, online, offline, unassigned, weak };
  }, [devices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let rows = devices.filter((device) => {
      if (status === 'online' && !device.online) return false;
      if (status === 'offline' && device.online) return false;
      if (status === 'unassigned' && device.acUnit) return false;
      if (firmware !== 'all' && (device.firmware ?? '') !== firmware) return false;

      if (!q) return true;
      const haystack = [
        device.serial,
        device.firmware ?? '',
        device.ipAddress ?? '',
        device.acUnit?.name ?? '',
        device.acUnit?.assetTag ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'serial':
          cmp = a.serial.localeCompare(b.serial);
          break;
        case 'status':
          cmp = Number(b.online) - Number(a.online);
          break;
        case 'rssi':
          cmp = (a.rssi ?? -999) - (b.rssi ?? -999);
          break;
        case 'lastSeen':
          cmp =
            new Date(a.lastSeenAt ?? 0).getTime() - new Date(b.lastSeenAt ?? 0).getTime();
          break;
        case 'firmware':
          cmp = (a.firmware ?? '').localeCompare(b.firmware ?? '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [devices, query, status, firmware, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);
  const selected = devices.find((d) => d.id === selectedId) ?? null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'status' || key === 'lastSeen' ? 'desc' : 'asc');
    }
  }

  function openDevice(id: string) {
    setSelectedId(id);
  }

  return (
    <div className="page-shell devices-page">
      <div className="ops-strip" aria-label="Device summary">
        <div className="ops-strip-item">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="ops-strip-item">
          <span>Online</span>
          <strong>{summary.online}</strong>
        </div>
        <div className="ops-strip-item">
          <span>Stale / offline</span>
          <strong className={summary.offline > 0 ? 'is-warn' : ''}>{summary.offline}</strong>
        </div>
        <div className="ops-strip-item">
          <span>Unassigned</span>
          <strong>{summary.unassigned}</strong>
        </div>
        <div className="ops-strip-item">
          <span>Weak signal</span>
          <strong className={summary.weak > 0 ? 'is-warn' : ''}>{summary.weak}</strong>
        </div>
      </div>

      <section className="ov-card page-fill-card devices-panel">
        <div className="devices-toolbar">
          <div className="devices-toolbar-left">
            <label className="devices-search">
              <Search size={15} aria-hidden="true" />
              <span className="sr-only">Search devices</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search serial, unit, asset, IP, firmware…"
              />
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="online">Online</option>
              <option value="offline">Stale / offline</option>
              <option value="unassigned">Unassigned</option>
            </select>

            <select
              value={firmware}
              onChange={(e) => setFirmware(e.target.value)}
              aria-label="Filter by firmware"
            >
              <option value="all">All firmware</option>
              {firmwareOptions.map((fw) => (
                <option key={fw} value={fw}>
                  {fw}
                </option>
              ))}
            </select>
          </div>

          <div className="devices-toolbar-right">
            <div className="devices-view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={view === 'table' ? 'is-active' : ''}
                aria-pressed={view === 'table'}
                onClick={() => setView('table')}
                title="Table view"
              >
                <Table2 size={16} />
                Table
              </button>
              <button
                type="button"
                className={view === 'grid' ? 'is-active' : ''}
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
                title="Grid view"
              >
                <LayoutGrid size={16} />
                Grid
              </button>
            </div>
          </div>
        </div>

        <div className="devices-meta-row">
          <p>
            Showing <strong>{pageRows.length}</strong> of <strong>{filtered.length}</strong>
            {filtered.length !== devices.length ? ` (filtered from ${devices.length})` : ''} devices
          </p>
          {(query || status !== 'all' || firmware !== 'all') && (
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setQuery('');
                setStatus('all');
                setFirmware('all');
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="devices-empty">
            <Cpu size={28} />
            <h3>No devices match</h3>
            <p>Try a different search term or clear filters.</p>
          </div>
        ) : view === 'table' ? (
          <div className="devices-table-wrap page-fill-list">
            <table className="ov-table devices-table">
              <thead>
                <tr>
                  <SortTh label="Serial" active={sortKey === 'serial'} dir={sortDir} onClick={() => toggleSort('serial')} />
                  <SortTh label="Status" active={sortKey === 'status'} dir={sortDir} onClick={() => toggleSort('status')} />
                  <th>Linked unit</th>
                  <SortTh label="Firmware" active={sortKey === 'firmware'} dir={sortDir} onClick={() => toggleSort('firmware')} />
                  <SortTh label="RSSI" active={sortKey === 'rssi'} dir={sortDir} onClick={() => toggleSort('rssi')} />
                  <th>IP</th>
                  <SortTh label="Last seen" active={sortKey === 'lastSeen'} dir={sortDir} onClick={() => toggleSort('lastSeen')} />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((device) => (
                  <tr
                    key={device.id}
                    className={`devices-row ${selectedId === device.id ? 'is-selected' : ''}`}
                    onClick={() => openDevice(device.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDevice(device.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${device.serial}`}
                  >
                    <td>
                      <div className="devices-serial-cell">
                        <Cpu size={14} />
                        <strong>{device.serial}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`ov-tag ${device.online ? 'ov-tag-good' : 'ov-tag-critical'}`}>
                        {device.online ? 'Online' : 'Stale'}
                      </span>
                    </td>
                    <td>
                      {device.acUnit ? (
                        <>
                          <strong className="devices-cell-strong">{device.acUnit.name}</strong>
                          <span className="ov-table-sub">{device.acUnit.assetTag}</span>
                        </>
                      ) : (
                        <span className="muted">Unassigned</span>
                      )}
                    </td>
                    <td className="ov-num">{device.firmware ?? '—'}</td>
                    <td>
                      {device.rssi != null ? (
                        <>
                          <span className="ov-num">{device.rssi} dBm</span>
                          <span className={`ov-table-sub tone-${signalLabel(device.rssi).tone}`}>
                            {signalLabel(device.rssi).text}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="ov-num devices-mono">{device.ipAddress ?? '—'}</td>
                    <td>
                      <span>{formatRelativeTime(device.lastSeenAt)}</span>
                      <span className="ov-table-sub">{formatAbsolute(device.lastSeenAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="device-grid-full page-fill-list">
            {pageRows.map((device) => (
              <button
                key={device.id}
                type="button"
                className={`device-tile device-tile-btn ${device.online ? '' : 'is-off'} ${
                  selectedId === device.id ? 'is-selected' : ''
                }`}
                onClick={() => openDevice(device.id)}
              >
                <div className="device-tile-top">
                  <span className={`ov-dot ${device.online ? 'ov-dot-success' : 'ov-dot-critical'}`} />
                  <strong>{device.serial}</strong>
                  <span className={`ov-tag ${device.online ? 'ov-tag-good' : 'ov-tag-critical'}`}>
                    {device.online ? 'Online' : 'Stale'}
                  </span>
                </div>
                <p>
                  {device.acUnit
                    ? `${device.acUnit.name} · ${device.acUnit.assetTag}`
                    : 'Unassigned'}
                </p>
                <dl className="device-tile-meta">
                  <div>
                    <dt>Firmware</dt>
                    <dd>{device.firmware ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>RSSI</dt>
                    <dd>{device.rssi != null ? `${device.rssi} dBm` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Last seen</dt>
                    <dd>{formatRelativeTime(device.lastSeenAt)}</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
        )}

        <footer className="devices-pagination">
          <label className="devices-page-size">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <div className="devices-page-controls">
            <span>
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className="devices-page-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="devices-page-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>

      {selected && (
        <>
          <button
            type="button"
            className="drawer-backdrop"
            aria-label="Close device details"
            onClick={() => setSelectedId(null)}
          />
          <aside
            className="device-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-drawer-title"
          >
            <header className="device-drawer-head">
              <div>
                <p className="eyebrow">Controller</p>
                <h2 id="device-drawer-title">{selected.serial}</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={() => setSelectedId(null)}
              >
                <X size={18} />
              </button>
            </header>

            <div className="device-drawer-body">
              <div className="device-drawer-status">
                <span className={`ov-tag ${selected.online ? 'ov-tag-good' : 'ov-tag-critical'}`}>
                  {selected.online ? (
                    <>
                      <Wifi size={12} /> Online
                    </>
                  ) : (
                    <>
                      <WifiOff size={12} /> Stale / offline
                    </>
                  )}
                </span>
                {selected.rssi != null && (
                  <span className={`ov-tag ov-tag-${signalLabel(selected.rssi).tag}`}>
                    <Radio size={12} />
                    {signalLabel(selected.rssi).text} ({selected.rssi} dBm)
                  </span>
                )}
              </div>

              <section className="device-drawer-section">
                <h3>Identity</h3>
                <dl className="settings-defs">
                  <div>
                    <dt>Serial</dt>
                    <dd className="settings-mono">{selected.serial}</dd>
                  </div>
                  <div>
                    <dt>Device ID</dt>
                    <dd className="settings-mono">{selected.id}</dd>
                  </div>
                  <div>
                    <dt>Firmware</dt>
                    <dd>{selected.firmware ?? '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="device-drawer-section">
                <h3>Connectivity</h3>
                <dl className="settings-defs">
                  <div>
                    <dt>IP address</dt>
                    <dd className="settings-mono">{selected.ipAddress ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>RSSI</dt>
                    <dd>{selected.rssi != null ? `${selected.rssi} dBm` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Last seen</dt>
                    <dd>
                      {formatRelativeTime(selected.lastSeenAt)}
                      <span className="ov-table-sub">{formatAbsolute(selected.lastSeenAt)}</span>
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="device-drawer-section">
                <h3>Linked AC unit</h3>
                {selected.acUnit ? (
                  <div className="device-drawer-unit">
                    <strong>{selected.acUnit.name}</strong>
                    <span>{selected.acUnit.assetTag}</span>
                    <span className={`ov-tag ${selected.acUnit.online ? 'ov-tag-good' : 'ov-tag-critical'}`}>
                      Unit {selected.acUnit.online ? 'online' : 'offline'}
                    </span>
                    <button
                      type="button"
                      className="btn-primary device-drawer-cta"
                      onClick={() => {
                        setSelectedId(null);
                        onOpenUnit(selected.acUnit!.id);
                      }}
                    >
                      Open in operations
                    </button>
                  </div>
                ) : (
                  <p className="ov-empty">This controller is not assigned to an AC unit.</p>
                )}
              </section>

              <section className="device-drawer-section">
                <h3>Notes for technicians</h3>
                <ul className="device-drawer-tips">
                  <li>Stale devices usually mean power, Wi‑Fi, or token issues on the ESP32.</li>
                  <li>RSSI below −80 dBm often precedes disconnects.</li>
                  <li>Use Operations to issue commands once the linked unit is online.</li>
                </ul>
              </section>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function SortTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <th>
      <button type="button" className={`devices-sort ${active ? 'is-active' : ''}`} onClick={onClick}>
        {label}
        <span aria-hidden="true">{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}</span>
      </button>
    </th>
  );
}
