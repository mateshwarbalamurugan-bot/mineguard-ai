import { useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, Download,
  Info, ShieldCheck
} from 'lucide-react';
import { PageTitle, MetricCard, SectionHeader } from '../components/Primitives';
import { ProvenanceBadge } from '../components/Badges';

type TimeRange = '24h' | '7d' | '30d';

interface DailyDataPoint {
  day: string;
  critical: number;
  high: number;
  medium: number;
  inspectionsCompleted: number;
  inspectionsAssigned: number;
  avgCh4: number;
  avgCo: number;
}

const mockTrendData7d: DailyDataPoint[] = [
  { day: 'Mon', critical: 1, high: 2, medium: 3, inspectionsCompleted: 4, inspectionsAssigned: 5, avgCh4: 0.38, avgCo: 10.2 },
  { day: 'Tue', critical: 0, high: 1, medium: 2, inspectionsCompleted: 6, inspectionsAssigned: 6, avgCh4: 0.32, avgCo: 8.5 },
  { day: 'Wed', critical: 2, high: 3, medium: 1, inspectionsCompleted: 7, inspectionsAssigned: 8, avgCh4: 0.65, avgCo: 16.4 },
  { day: 'Thu', critical: 0, high: 2, medium: 4, inspectionsCompleted: 5, inspectionsAssigned: 5, avgCh4: 0.41, avgCo: 11.0 },
  { day: 'Fri', critical: 1, high: 1, medium: 2, inspectionsCompleted: 8, inspectionsAssigned: 9, avgCh4: 0.35, avgCo: 9.8 },
  { day: 'Sat', critical: 0, high: 0, medium: 1, inspectionsCompleted: 3, inspectionsAssigned: 3, avgCh4: 0.28, avgCo: 7.2 },
  { day: 'Sun (Today)', critical: 1, high: 2, medium: 2, inspectionsCompleted: 5, inspectionsAssigned: 6, avgCh4: 0.44, avgCo: 12.5 },
];

const mockTrendData30d: DailyDataPoint[] = [
  { day: 'Week 1', critical: 4, high: 8, medium: 14, inspectionsCompleted: 28, inspectionsAssigned: 32, avgCh4: 0.42, avgCo: 11.2 },
  { day: 'Week 2', critical: 2, high: 6, medium: 11, inspectionsCompleted: 34, inspectionsAssigned: 35, avgCh4: 0.36, avgCo: 9.8 },
  { day: 'Week 3', critical: 5, high: 9, medium: 16, inspectionsCompleted: 38, inspectionsAssigned: 42, avgCh4: 0.58, avgCo: 14.1 },
  { day: 'Week 4', critical: 3, high: 7, medium: 12, inspectionsCompleted: 31, inspectionsAssigned: 33, avgCh4: 0.40, avgCo: 10.5 },
];

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const trendData = timeRange === '30d' ? mockTrendData30d : mockTrendData7d;

  // Aggregate metrics
  const totalAlerts = trendData.reduce((acc, d) => acc + d.critical + d.high + d.medium, 0);
  const totalCritical = trendData.reduce((acc, d) => acc + d.critical, 0);
  const totalTasksCompleted = trendData.reduce((acc, d) => acc + d.inspectionsCompleted, 0);
  const totalTasksAssigned = trendData.reduce((acc, d) => acc + d.inspectionsAssigned, 0);
  const completionRate = Math.round((totalTasksCompleted / Math.max(1, totalTasksAssigned)) * 100);

  const downloadCsvAnalytics = () => {
    const headers = ['Period', 'Critical Hazards', 'High Hazards', 'Medium Hazards', 'Completed Tasks', 'Assigned Tasks', 'Avg CH4 (%)', 'Avg CO (ppm)'];
    const rows = trendData.map((d) => [
      d.day,
      d.critical,
      d.high,
      d.medium,
      d.inspectionsCompleted,
      d.inspectionsAssigned,
      d.avgCh4,
      d.avgCo,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mineguard-analytics-${timeRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="SAFETY & OPERATIONAL INTELLIGENCE"
        title="Safety Analytics & Trends"
        detail="Understand safety, inspection completion and operational trends over time."
      >
        <div className="analytics-head-actions">
          <div className="period-switch">
            {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                className={timeRange === range ? 'active' : ''}
                onClick={() => setTimeRange(range)}
              >
                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          <button className="button button-secondary" onClick={downloadCsvAnalytics}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </PageTitle>

      <div className="workspace-note">
        <Info size={14} />
        <span>
          Safety trends and atmospheric time-series are aggregated from local simulation logs for demonstration.
        </span>
        <ProvenanceBadge type="SIMULATED" />
      </div>

      {downloadSuccess && (
        <div className="inline-success" role="status">
          <CheckCircle2 size={15} />
          <span>Analytics dataset exported as CSV successfully.</span>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="work-kpi-grid">
        <MetricCard
          label="Hazards Logged"
          value={totalAlerts}
          note={`${totalCritical} critical events in period`}
          icon={<AlertTriangle size={16} />}
          tone={totalCritical > 2 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Inspection Rate"
          value={`${completionRate}%`}
          note={`${totalTasksCompleted} of ${totalTasksAssigned} tasks closed`}
          icon={<CheckCircle2 size={16} />}
          tone="teal"
        />
        <MetricCard
          label="Mean Triage Time"
          value="4.2 mins"
          note="From detection to operator sign-off"
          icon={<Clock size={16} />}
          tone="teal"
        />
        <MetricCard
          label="Uptime Index"
          value="99.8%"
          note="Subterranean mesh node availability"
          icon={<ShieldCheck size={16} />}
          tone="neutral"
        />
      </div>

      {/* Primary Analytics Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Chart 1: Hazards Detected Over Time */}
        <section className="panel chart-panel">
          <SectionHeader
            title="Hazards & Safety Anomalies Detected"
            aside="Daily breakdown by severity level"
          />

          <div className="chart-legend-row">
            <span className="legend-item">
              <span className="legend-box color-critical" /> Critical
            </span>
            <span className="legend-item">
              <span className="legend-box color-high" /> High
            </span>
            <span className="legend-item">
              <span className="legend-box color-medium" /> Medium
            </span>
          </div>

          <div className="svg-chart-container" style={{ height: 260 }}>
            <svg viewBox="0 0 540 220" className="analytics-svg" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              {[40, 80, 120, 160].map((y) => (
                <line
                  key={y}
                  x1="45"
                  y1={y}
                  x2="520"
                  y2={y}
                  stroke="var(--line)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}

              {/* Y Axis Labels */}
              <text x="35" y="44" className="chart-axis-label" textAnchor="end">8</text>
              <text x="35" y="84" className="chart-axis-label" textAnchor="end">6</text>
              <text x="35" y="124" className="chart-axis-label" textAnchor="end">4</text>
              <text x="35" y="164" className="chart-axis-label" textAnchor="end">2</text>
              <text x="35" y="200" className="chart-axis-label" textAnchor="end">0</text>

              {/* Stacked Bars */}
              {trendData.map((d, idx) => {
                const colWidth = timeRange === '30d' ? 50 : 34;
                const gap = (475 - trendData.length * colWidth) / (trendData.length + 1);
                const x = 55 + idx * (colWidth + gap);

                const scale = 20; // 20px per count
                const hMed = d.medium * scale;
                const hHigh = d.high * scale;
                const hCrit = d.critical * scale;

                const yMed = 200 - hMed;
                const yHigh = yMed - hHigh;
                const yCrit = yHigh - hCrit;

                return (
                  <g
                    key={d.day}
                    className="bar-group"
                    onMouseEnter={() => setActiveTooltip(`${d.day}: ${d.critical} Crit, ${d.high} High, ${d.medium} Med`)}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    {/* Medium */}
                    <rect
                      x={x}
                      y={yMed}
                      width={colWidth}
                      height={hMed}
                      fill="#eab308"
                      rx="2"
                    />
                    {/* High */}
                    <rect
                      x={x}
                      y={yHigh}
                      width={colWidth}
                      height={hHigh}
                      fill="#f97316"
                      rx="2"
                    />
                    {/* Critical */}
                    <rect
                      x={x}
                      y={yCrit}
                      width={colWidth}
                      height={hCrit}
                      fill="#ef4444"
                      rx="3"
                    />
                    {/* X Axis Label */}
                    <text
                      x={x + colWidth / 2}
                      y="215"
                      className="chart-axis-label"
                      textAnchor="middle"
                    >
                      {d.day}
                    </text>
                  </g>
                );
              })}
            </svg>

            {activeTooltip && (
              <div className="chart-floating-tooltip">
                <span>{activeTooltip}</span>
              </div>
            )}
          </div>
        </section>

        {/* Chart 2: Inspection Completion Efficiency */}
        <section className="panel chart-panel">
          <SectionHeader
            title="Inspection Tasks Assigned vs Resolved"
            aside="Operational follow-through rate"
          />

          <div className="chart-legend-row">
            <span className="legend-item">
              <span className="legend-box color-assigned" /> Tasks Assigned
            </span>
            <span className="legend-item">
              <span className="legend-box color-completed" /> Tasks Completed
            </span>
          </div>

          <div className="svg-chart-container" style={{ height: 260 }}>
            <svg viewBox="0 0 540 220" className="analytics-svg" preserveAspectRatio="none">
              {/* Grid Lines */}
              {[40, 80, 120, 160].map((y) => (
                <line
                  key={y}
                  x1="45"
                  y1={y}
                  x2="520"
                  y2={y}
                  stroke="var(--line)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}

              <text x="35" y="44" className="chart-axis-label" textAnchor="end">10</text>
              <text x="35" y="84" className="chart-axis-label" textAnchor="end">7</text>
              <text x="35" y="124" className="chart-axis-label" textAnchor="end">5</text>
              <text x="35" y="164" className="chart-axis-label" textAnchor="end">2</text>
              <text x="35" y="200" className="chart-axis-label" textAnchor="end">0</text>

              {trendData.map((d, idx) => {
                const colWidth = timeRange === '30d' ? 24 : 16;
                const gap = (475 - trendData.length * (colWidth * 2 + 6)) / (trendData.length + 1);
                const xAssigned = 55 + idx * (colWidth * 2 + 6 + gap);
                const xCompleted = xAssigned + colWidth + 2;

                const maxVal = timeRange === '30d' ? 50 : 10;
                const hAssigned = (d.inspectionsAssigned / maxVal) * 160;
                const hCompleted = (d.inspectionsCompleted / maxVal) * 160;

                return (
                  <g key={d.day}>
                    {/* Assigned */}
                    <rect
                      x={xAssigned}
                      y={200 - hAssigned}
                      width={colWidth}
                      height={hAssigned}
                      fill="var(--navy)"
                      opacity="0.45"
                      rx="3"
                    />
                    {/* Completed */}
                    <rect
                      x={xCompleted}
                      y={200 - hCompleted}
                      width={colWidth}
                      height={hCompleted}
                      fill="#15803d"
                      rx="3"
                    />
                    <text
                      x={xAssigned + colWidth}
                      y="215"
                      className="chart-axis-label"
                      textAnchor="middle"
                    >
                      {d.day}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        {/* Chart 3: Atmospheric Gas Trends (CH4 & CO) */}
        <section className="panel chart-panel">
          <SectionHeader
            title="Atmospheric Gas Baseline Levels (CH4 & CO)"
            aside="Continuous ambient shift tracking"
          />

          <div className="chart-legend-row">
            <span className="legend-item">
              <span className="legend-box color-methane" /> Methane CH4 (%)
            </span>
            <span className="legend-item">
              <span className="legend-box color-co" /> Carbon Monoxide CO (ppm)
            </span>
            <span className="legend-item">
              <span className="legend-line-dashed" /> Safety Threshold Limit
            </span>
          </div>

          <div className="svg-chart-container" style={{ height: 260 }}>
            <svg viewBox="0 0 540 220" className="analytics-svg" preserveAspectRatio="none">
              {/* Threshold line at 1.0% CH4 */}
              <line
                x1="45"
                y1="60"
                x2="520"
                y2="60"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text x="525" y="64" fill="#ef4444" fontSize="10" fontWeight="700">1.0% Lim</text>

              {/* Background grid */}
              {[95, 130, 165].map((y) => (
                <line
                  key={y}
                  x1="45"
                  y1={y}
                  x2="520"
                  y2={y}
                  stroke="var(--line)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}

              {/* Gas Curve Polylines */}
              {(() => {
                const pointsCh4 = trendData
                  .map((d, i) => {
                    const x = 55 + i * (465 / (trendData.length - 1));
                    const y = 200 - d.avgCh4 * 140;
                    return `${x},${y}`;
                  })
                  .join(' ');

                const pointsCo = trendData
                  .map((d, i) => {
                    const x = 55 + i * (465 / (trendData.length - 1));
                    const y = 200 - (d.avgCo / 25) * 140;
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <>
                    <polyline
                      points={pointsCh4}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <polyline
                      points={pointsCo}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {trendData.map((d, i) => {
                      const x = 55 + i * (465 / (trendData.length - 1));
                      const yCh4 = 200 - d.avgCh4 * 140;
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={yCh4}
                          r="4"
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </>
                );
              })()}

              {/* X Axis */}
              {trendData.map((d, idx) => {
                const x = 55 + idx * (465 / (trendData.length - 1));
                return (
                  <text
                    key={d.day}
                    x={x}
                    y="215"
                    className="chart-axis-label"
                    textAnchor="middle"
                  >
                    {d.day}
                  </text>
                );
              })}
            </svg>
          </div>
        </section>

        {/* Chart 4: Hazard Category Distribution Breakdown */}
        <section className="panel chart-panel">
          <SectionHeader
            title="Hazard Distribution by Category"
            aside="Historical share across underground operations"
          />

          <div className="category-breakdown-wrap">
            <div className="category-metric-list">
              <div className="cat-metric-row">
                <div className="cat-metric-label">
                  <span className="cat-indicator cat-gas" />
                  <strong>Atmospheric & Gas Ingress</strong>
                </div>
                <div className="cat-metric-val">
                  <span>42%</span>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill cat-gas-fill" style={{ width: '42%' }} />
                  </div>
                </div>
              </div>

              <div className="cat-metric-row">
                <div className="cat-metric-label">
                  <span className="cat-indicator cat-rock" />
                  <strong>Geotechnical & Roof Convergence</strong>
                </div>
                <div className="cat-metric-val">
                  <span>26%</span>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill cat-rock-fill" style={{ width: '26%' }} />
                  </div>
                </div>
              </div>

              <div className="cat-metric-row">
                <div className="cat-metric-label">
                  <span className="cat-indicator cat-water" />
                  <strong>Hydrological Sump Surge</strong>
                </div>
                <div className="cat-metric-val">
                  <span>18%</span>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill cat-water-fill" style={{ width: '18%' }} />
                  </div>
                </div>
              </div>

              <div className="cat-metric-row">
                <div className="cat-metric-label">
                  <span className="cat-indicator cat-telemetry" />
                  <strong>Telemetry & Comms Link Failure</strong>
                </div>
                <div className="cat-metric-val">
                  <span>14%</span>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill cat-telemetry-fill" style={{ width: '14%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="analytics-summary-callout">
              <ShieldCheck size={16} />
              <div>
                <strong>Predictable Hazard Concentration</strong>
                <p>
                  Atmospheric ventilation fluctuations in Tunnel B and East Crosscut account for 68% of safety triage interventions. Priority preventative sweeps are scheduled for Shift 2.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
