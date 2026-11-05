import { useState, useMemo } from 'react';
import {
  AlertTriangle, Check, CheckCircle2, Clock, Info,
  MapPin, Search, ShieldAlert, Sparkles, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageTitle, MetricCard, SectionHeader } from '../components/Primitives';
import { ProvenanceBadge } from '../components/Badges';
import { useMineStore } from '../store/useMineStore';
import type { AlertSeverity, AlertState } from '../models/types';

interface ExtendedHazardItem {
  id: string;
  title: string;
  category: 'Atmospheric / Gas' | 'Geotechnical / Rock' | 'Hydrological / Water' | 'Telemetry / Comms';
  severity: AlertSeverity;
  zoneId: string;
  zoneName: string;
  time: string;
  state: AlertState;
  source: string;
  confidence: number;
  confidenceReason: string;
  recommendedAction: string;
  taskId?: string;
  details: string;
}

export function HazardsPage() {
  const alerts = useMineStore((s) => s.alerts);
  const zones = useMineStore((s) => s.zones);
  const acknowledgeAlert = useMineStore((s) => s.acknowledgeAlert);
  const linkAlertToTask = useMineStore((s) => s.linkAlertToTask);
  const resolveAlert = useMineStore((s) => s.resolveAlert);
  const createInspection = useMineStore((s) => s.createInspection);
  const setActiveZoneId = useMineStore((s) => s.setActiveZoneId);

  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [zoneFilter, setZoneFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHazard, setSelectedHazard] = useState<ExtendedHazardItem | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Map seed alerts and hazards into unified rich hazard register
  const allHazards: ExtendedHazardItem[] = useMemo(() => {
    return alerts.map((alert) => {
      const zone = zones.find((z) => z.id === alert.zoneId);
      const zName = zone?.name ?? alert.zoneId;

      let category: ExtendedHazardItem['category'] = 'Atmospheric / Gas';
      let source = 'Stationary Ambient Sensor Array';
      let confidence = 96;
      let confidenceReason = 'Threshold exceedance confirmed over multiple reading windows';
      let details = 'Environmental telemetry detected parameters outside standard baseline limits.';

      if (alert.title.toLowerCase().includes('water') || alert.title.toLowerCase().includes('sump')) {
        category = 'Hydrological / Water';
        source = 'Pumping Station Influx Monitor S-04';
        confidence = 94;
        confidenceReason = 'Ultrasonic liquid-level sensor detected continuous rate of rise';
        details = 'Sump inflow velocity exceeds nominal pump evacuation capacity.';
      } else if (alert.title.toLowerCase().includes('comm') || alert.title.toLowerCase().includes('offline') || alert.title.toLowerCase().includes('stale')) {
        category = 'Telemetry / Comms';
        source = 'Subterranean Mesh Node Gateway';
        confidence = 99;
        confidenceReason = 'Heartbeat missed for >180 seconds across redundant channels';
        details = 'Telemetry packet drop detected; zone marked uncertain until verified by physical inspection.';
      } else if (alert.title.toLowerCase().includes('temp') || alert.title.toLowerCase().includes('thermal')) {
        category = 'Atmospheric / Gas';
        source = 'Thermal Imaging Sensor Array & Fixed Thermistor';
        confidence = 92;
        confidenceReason = 'Localized temperature delta >6°C over 15-minute rolling window';
        details = 'Elevated ambient temperature detected near electrical transformer substation.';
      } else if (alert.title.toLowerCase().includes('rock') || alert.title.toLowerCase().includes('crack') || alert.title.toLowerCase().includes('roof')) {
        category = 'Geotechnical / Rock';
        source = 'Extensometer & Repeat LiDAR Scan Comparison';
        confidence = 88;
        confidenceReason = 'Point-cloud displacement of East wall exceeds 4.0 cm tolerance';
        details = 'Micro-fracture acoustic emission and laser divergence indicate localized roof convergence.';
      }

      return {
        id: alert.id,
        title: alert.title,
        category,
        severity: alert.severity,
        zoneId: alert.zoneId,
        zoneName: zName,
        time: alert.time,
        state: alert.state,
        source,
        confidence,
        confidenceReason,
        recommendedAction: alert.recommendedAction,
        taskId: alert.taskId,
        details,
      };
    });
  }, [alerts, zones]);

  // Apply Search and Filters
  const filteredHazards = useMemo(() => {
    return allHazards.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSeverity = severityFilter === 'All' || item.severity === severityFilter;
      const matchCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchZone = zoneFilter === 'All' || item.zoneId === zoneFilter;
      const matchStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Open'
          ? item.state !== 'resolved'
          : item.state === statusFilter.toLowerCase();

      return matchSearch && matchSeverity && matchCategory && matchZone && matchStatus;
    });
  }, [allHazards, searchQuery, severityFilter, categoryFilter, zoneFilter, statusFilter]);

  // Stats
  const criticalCount = allHazards.filter((h) => h.severity === 'Critical' && h.state !== 'resolved').length;
  const highCount = allHazards.filter((h) => h.severity === 'High' && h.state !== 'resolved').length;
  const totalOpen = allHazards.filter((h) => h.state !== 'resolved').length;
  const resolvedCount = allHazards.filter((h) => h.state === 'resolved').length;

  const handleAcknowledge = (id: string) => {
    acknowledgeAlert(id);
    setSuccessNotice(`Alert ${id} acknowledged and logged in shift audit log.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleCreateTask = (item: ExtendedHazardItem) => {
    const taskId = createInspection(item.zoneId, `Verify condition: ${item.title}`);
    if (taskId) {
      linkAlertToTask(item.id, taskId);
      setSuccessNotice(`Inspection task ${taskId} assigned to maintenance crew.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  const handleResolve = (id: string) => {
    resolveAlert(id);
    setSuccessNotice(`Alert ${id} marked as resolved.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="SAFETY & HAZARD INTELLIGENCE"
        title="Hazard Detection & Monitoring"
        detail="Review identified hazards and their severity across all mine sectors."
      >
        <span className="header-demo-label">
          <ShieldAlert size={14} /> {totalOpen} OPEN ALERTS
        </span>
      </PageTitle>

      <div className="workspace-note">
        <Info size={14} />
        <span>
          Hazard detection thresholds and confidence scores are simulated for demonstration. All data reflects configured scenarios and rule engines.
        </span>
        <ProvenanceBadge type="SIMULATED" />
      </div>

      {successNotice && (
        <div className="inline-success" role="status">
          <CheckCircle2 size={15} />
          <span>{successNotice}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="work-kpi-grid">
        <MetricCard
          label="Critical Hazards"
          value={criticalCount}
          note="Immediate shift intervention required"
          icon={<ShieldAlert size={16} />}
          tone={criticalCount > 0 ? 'alert' : 'neutral'}
        />
        <MetricCard
          label="High Severity"
          value={highCount}
          note="Requires verification within 1 hour"
          icon={<AlertTriangle size={16} />}
          tone={highCount > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Total Unresolved"
          value={totalOpen}
          note="Awaiting triage or assigned to crew"
          icon={<Clock size={16} />}
          tone="neutral"
        />
        <MetricCard
          label="Resolved Today"
          value={resolvedCount}
          note="Successfully closed this shift"
          icon={<CheckCircle2 size={16} />}
          tone="teal"
        />
      </div>

      {/* Main Hazard Management Table Panel */}
      <section className="panel hazard-main-panel">
        <SectionHeader
          title="Hazard Register & Attention Queue"
          aside="Filter by severity, category, or affected sector"
        />

        {/* Filters Toolbar */}
        <div className="hazard-toolbar">
          <div className="search-field">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search hazards by title, sector, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="icon-button" onClick={() => setSearchQuery('')} aria-label="Clear">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="hazard-filters-group">
            <label>
              <span>Category</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="All">All Categories</option>
                <option value="Atmospheric / Gas">Atmospheric / Gas</option>
                <option value="Geotechnical / Rock">Geotechnical / Rock</option>
                <option value="Hydrological / Water">Hydrological / Water</option>
                <option value="Telemetry / Comms">Telemetry / Comms</option>
              </select>
            </label>

            <label>
              <span>Sector</span>
              <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
                <option value="All">All Sectors</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Open">Unresolved Only</option>
                <option value="new">New Alerts</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="linked">Task Assigned</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
          </div>
        </div>

        {/* Severity Quick Tabs */}
        <div className="hazard-severity-tabs">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => {
            const count = sev === 'All' ? allHazards.length : allHazards.filter((h) => h.severity === sev).length;
            return (
              <button
                key={sev}
                className={`severity-tab-btn ${severityFilter === sev ? 'active' : ''} tab-${sev.toLowerCase()}`}
                onClick={() => setSeverityFilter(sev)}
              >
                <span className={`tab-indicator-dot sev-dot-${sev.toLowerCase()}`} />
                <span>{sev}</span>
                <span className="tab-count-badge">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Table of Hazards */}
        {filteredHazards.length > 0 ? (
          <div className="work-table-wrap">
            <table className="work-table hazard-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Hazard Description</th>
                  <th>Category</th>
                  <th>Sector Location</th>
                  <th>Detection Source</th>
                  <th>Confidence</th>
                  <th>State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHazards.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className={`hazard-row ${item.state === 'resolved' ? 'row-resolved' : ''} ${selectedHazard?.id === item.id ? 'row-selected' : ''}`}
                    >
                      <td>
                        <span className={`severity-badge sev-${item.severity.toLowerCase()}`}>
                          {item.severity}
                        </span>
                      </td>

                      <td>
                        <div className="hazard-title-cell">
                          <strong>{item.title}</strong>
                          <small>ID: {item.id} · Logged {item.time}</small>
                        </div>
                      </td>

                      <td>
                        <span className="hazard-category-chip">{item.category}</span>
                      </td>

                      <td>
                        <Link
                          to="/map"
                          className="zone-link-btn"
                          onClick={() => setActiveZoneId(item.zoneId)}
                          title="View sector on Underground Map"
                        >
                          <MapPin size={13} />
                          <span>{item.zoneName}</span>
                        </Link>
                      </td>

                      <td className="source-cell">
                        <span>{item.source}</span>
                      </td>

                      <td>
                        <span
                          className="confidence-score-badge"
                          title={item.confidenceReason}
                        >
                          {item.confidence}%
                        </span>
                      </td>

                      <td>
                        <span className={`alert-state-tag state-${item.state}`}>
                          {item.state === 'new'
                            ? 'New'
                            : item.state === 'acknowledged'
                            ? 'Acknowledged'
                            : item.state === 'linked'
                            ? 'Task Assigned'
                            : 'Resolved'}
                        </span>
                      </td>

                      <td>
                        <div className="hazard-actions-cell">
                          <button
                            className="small-action"
                            onClick={() => setSelectedHazard(item)}
                            title="Open detailed report"
                          >
                            Details
                          </button>

                          {item.state === 'new' && (
                            <button
                              className="small-action button-primary-subtle"
                              onClick={() => handleAcknowledge(item.id)}
                            >
                              Acknowledge
                            </button>
                          )}

                          {item.state !== 'resolved' && !item.taskId && (
                            <button
                              className="small-action"
                              onClick={() => handleCreateTask(item)}
                            >
                              Dispatch
                            </button>
                          )}

                          {item.state !== 'resolved' && (
                            <button
                              className="small-action button-resolve"
                              onClick={() => handleResolve(item.id)}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <ShieldAlert size={28} />
            <strong>No hazards match this selection</strong>
            <p>Try clearing active search queries or loosening the severity and sector filters.</p>
            <button
              className="button button-secondary"
              onClick={() => {
                setSearchQuery('');
                setSeverityFilter('All');
                setCategoryFilter('All');
                setZoneFilter('All');
                setStatusFilter('All');
              }}
            >
              Reset all filters
            </button>
          </div>
        )}
      </section>

      {/* Hazard Detail Modal Drawer */}
      {selectedHazard && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedHazard(null);
          }}
        >
          <div
            className="hazard-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hazard-dialog-title"
          >
            <div className="hazard-modal-head">
              <div>
                <span className="eyebrow">HAZARD INCIDENT DOSSIER · {selectedHazard.id}</span>
                <h2 id="hazard-dialog-title">{selectedHazard.title}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedHazard(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="hazard-modal-body">
              <div className="hazard-modal-grid">
                <div>
                  <span className="modal-label">Severity Level</span>
                  <span className={`severity-badge sev-${selectedHazard.severity.toLowerCase()}`}>
                    {selectedHazard.severity}
                  </span>
                </div>

                <div>
                  <span className="modal-label">Sector Location</span>
                  <strong>{selectedHazard.zoneName}</strong>
                </div>

                <div>
                  <span className="modal-label">Detection Timestamp</span>
                  <strong>{selectedHazard.time} (Simulated Shift)</strong>
                </div>

                <div>
                  <span className="modal-label">Rule / Model Confidence</span>
                  <strong>{selectedHazard.confidence}% Confirmed</strong>
                </div>
              </div>

              <div className="hazard-modal-section">
                <h4>Detection Source & Sensor Telemetry</h4>
                <p>{selectedHazard.source}</p>
                <div className="hazard-confidence-box">
                  <Sparkles size={14} />
                  <span>{selectedHazard.confidenceReason}</span>
                </div>
              </div>

              <div className="hazard-modal-section">
                <h4>Incident Observation & Context</h4>
                <p>{selectedHazard.details}</p>
              </div>

              <div className="hazard-modal-section">
                <h4>Recommended Action Under Mining Safety Plan</h4>
                <div className="recommended-action-box">
                  <AlertTriangle size={15} />
                  <span>{selectedHazard.recommendedAction}</span>
                </div>
              </div>
            </div>

            <div className="hazard-modal-foot">
              <Link
                to="/map"
                className="button button-secondary"
                onClick={() => {
                  setActiveZoneId(selectedHazard.zoneId);
                  setSelectedHazard(null);
                }}
              >
                <MapPin size={14} /> View on Map
              </Link>

              {selectedHazard.state === 'new' && (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    handleAcknowledge(selectedHazard.id);
                    setSelectedHazard(null);
                  }}
                >
                  <Check size={14} /> Acknowledge Alert
                </button>
              )}

              {selectedHazard.state !== 'resolved' && !selectedHazard.taskId && (
                <button
                  className="button button-primary"
                  onClick={() => {
                    handleCreateTask(selectedHazard);
                    setSelectedHazard(null);
                  }}
                >
                  Assign Inspection Task
                </button>
              )}

              {selectedHazard.state !== 'resolved' && (
                <button
                  className="button button-danger-outline"
                  onClick={() => {
                    handleResolve(selectedHazard.id);
                    setSelectedHazard(null);
                  }}
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
