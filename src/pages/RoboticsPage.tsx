import { useState, useMemo } from 'react';
import {
  Activity, Battery, BatteryCharging, Bot, CheckCircle2,
  Cpu, Gauge, Play, RotateCcw, Search, ShieldAlert,
  Video, Wifi, WifiOff, Wrench, X
} from 'lucide-react';
import { PageTitle, MetricCard, SectionHeader } from '../components/Primitives';
import { ProvenanceBadge } from '../components/Badges';
import { RoverCadSimulation } from '../components/RoverCadSimulation';
import { useMineStore } from '../store/useMineStore';

export type RobotStatus = 'Active' | 'Inspecting' | 'Returning' | 'Idle' | 'Offline' | 'Maintenance';

export interface RobotRecord {
  id: string;
  name: string;
  type: 'Heavy Rover' | 'Inspection Drone' | 'Sentinel Rover' | 'Deformation Scanner';
  status: RobotStatus;
  battery: number;
  charging: boolean;
  location: string;
  zoneId: string;
  connectivity: {
    protocol: string;
    signalPercent: number;
    latencyMs: number;
    online: boolean;
  };
  mission: {
    title: string;
    progress: number;
    estimatedCompletion: string;
  };
  sensors: {
    ch4: number;
    co: number;
    temp: number;
    obstacleDistanceMeters: number;
    lidarRateKhz: number;
  };
  hardwareHealth: {
    actuators: 'Normal' | 'Warning' | 'Fault';
    optics: 'Normal' | 'Warning' | 'Fault';
    batteryHealth: 'Optimal' | 'Good' | 'Check';
    lidar: 'Operational' | 'Degraded';
  };
}

const seedRobots: RobotRecord[] = [
  {
    id: 'RVR-04A',
    name: 'Rover MK-IV Alpha',
    type: 'Heavy Rover',
    status: 'Inspecting',
    battery: 84,
    charging: false,
    location: 'Tunnel B — Crosscut 4 (-180m)',
    zoneId: 'tunnel-b',
    connectivity: {
      protocol: 'Subterranean Mesh Wi-Fi (802.11ah)',
      signalPercent: 92,
      latencyMs: 38,
      online: true,
    },
    mission: {
      title: 'Atmospheric Profiling & Wall Convergence Scan',
      progress: 68,
      estimatedCompletion: '24 mins remaining',
    },
    sensors: {
      ch4: 0.45,
      co: 14.2,
      temp: 26.8,
      obstacleDistanceMeters: 4.2,
      lidarRateKhz: 300,
    },
    hardwareHealth: {
      actuators: 'Normal',
      optics: 'Normal',
      batteryHealth: 'Optimal',
      lidar: 'Operational',
    },
  },
  {
    id: 'DRN-02S',
    name: 'Drone Scout-2',
    type: 'Inspection Drone',
    status: 'Returning',
    battery: 26,
    charging: false,
    location: 'Main Shaft — Station Level (-120m)',
    zoneId: 'shaft',
    connectivity: {
      protocol: 'Ultra-Reliable LoRa Link (915MHz)',
      signalPercent: 78,
      latencyMs: 95,
      online: true,
    },
    mission: {
      title: 'Vertical Ore Pass Volumetric Survey',
      progress: 94,
      estimatedCompletion: 'Docking in 4 mins',
    },
    sensors: {
      ch4: 0.12,
      co: 4.8,
      temp: 23.1,
      obstacleDistanceMeters: 8.6,
      lidarRateKhz: 150,
    },
    hardwareHealth: {
      actuators: 'Normal',
      optics: 'Normal',
      batteryHealth: 'Good',
      lidar: 'Operational',
    },
  },
  {
    id: 'RVR-03B',
    name: 'Rover MK-III Bravo',
    type: 'Sentinel Rover',
    status: 'Idle',
    battery: 98,
    charging: true,
    location: 'Central Surface Maintenance Bay',
    zoneId: 'surface',
    connectivity: {
      protocol: 'Hardwired Gigabit Dock',
      signalPercent: 100,
      latencyMs: 2,
      online: true,
    },
    mission: {
      title: 'Standby for Shift 2 Automated Sweep',
      progress: 0,
      estimatedCompletion: 'Scheduled: 14:00',
    },
    sensors: {
      ch4: 0.05,
      co: 2.1,
      temp: 21.0,
      obstacleDistanceMeters: 12.0,
      lidarRateKhz: 0,
    },
    hardwareHealth: {
      actuators: 'Normal',
      optics: 'Normal',
      batteryHealth: 'Optimal',
      lidar: 'Operational',
    },
  },
  {
    id: 'SRV-01',
    name: 'Autonomous Surveyor 01',
    type: 'Deformation Scanner',
    status: 'Maintenance',
    battery: 15,
    charging: false,
    location: 'Geotechnical Engineering Workshop',
    zoneId: 'workshop',
    connectivity: {
      protocol: 'Offline for Routine Maintenance',
      signalPercent: 0,
      latencyMs: 0,
      online: false,
    },
    mission: {
      title: 'Quarterly Sensor Calibration & Firmware Update',
      progress: 40,
      estimatedCompletion: 'Target: Tomorrow 08:00',
    },
    sensors: {
      ch4: 0.0,
      co: 0.0,
      temp: 20.5,
      obstacleDistanceMeters: 0,
      lidarRateKhz: 0,
    },
    hardwareHealth: {
      actuators: 'Warning',
      optics: 'Normal',
      batteryHealth: 'Check',
      lidar: 'Degraded',
    },
  },
];

export function RoboticsPage() {
  const [robots, setRobots] = useState<RobotRecord[]>(seedRobots);
  const [selectedRobotId, setSelectedRobotId] = useState<string>('RVR-04A');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'cad' | 'camera' | 'telemetry'>('cad');
  const [notification, setNotification] = useState<string | null>(null);

  const addAudit = useMineStore((s) => s.addAudit);

  const selectedRobot = useMemo(
    () => robots.find((r) => r.id === selectedRobotId) ?? robots[0],
    [robots, selectedRobotId]
  );

  const filteredRobots = useMemo(() => {
    return robots.filter((robot) => {
      const matchesSearch =
        robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'All' || robot.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [robots, searchQuery, statusFilter]);

  const activeCount = robots.filter((r) => r.status === 'Active' || r.status === 'Inspecting').length;
  const avgBattery = Math.round(robots.reduce((acc, r) => acc + r.battery, 0) / robots.length);
  const onlineCount = robots.filter((r) => r.connectivity.online).length;

  const triggerAction = (actionName: string) => {
    addAudit(`Robotics Command: ${actionName}`, `${selectedRobot.name} (${selectedRobot.id})`);
    setNotification(`Command executed: ${actionName} sent to ${selectedRobot.name}`);
    setTimeout(() => setNotification(null), 4000);

    if (actionName === 'Recall to Dock') {
      setRobots((prev) =>
        prev.map((r) =>
          r.id === selectedRobot.id
            ? {
                ...r,
                status: 'Returning',
                mission: {
                  ...r.mission,
                  title: 'Returning to Base Docking Bay',
                  estimatedCompletion: 'In Transit',
                },
              }
            : r
        )
      );
    } else if (actionName === 'Initiate Inspection Sweep') {
      setRobots((prev) =>
        prev.map((r) =>
          r.id === selectedRobot.id
            ? {
                ...r,
                status: 'Inspecting',
                mission: {
                  ...r.mission,
                  title: 'Autonomous Drift Sweep & Gas Survey',
                  progress: 10,
                  estimatedCompletion: '35 mins remaining',
                },
              }
            : r
        )
      );
    }
  };

  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="AUTONOMOUS FLEET OPERATIONS"
        title="Robotics Management"
        detail="Monitor your autonomous robots and their operational status."
      >
        <span className="header-demo-label">
          <Bot size={14} /> 4 REGISTERED UNITS
        </span>
      </PageTitle>

      <div className="workspace-note">
        <Bot size={15} />
        <span>
          Autonomous underground robotics telemetry is simulated for demonstration. All rover positions, camera feeds and obstacle sensors are illustrative.
        </span>
        <ProvenanceBadge type="SIMULATED" />
      </div>

      {notification && (
        <div className="inline-success" role="status">
          <CheckCircle2 size={15} />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="work-kpi-grid">
        <MetricCard
          label="Active Fleet"
          value={`${activeCount} / ${robots.length}`}
          note="Currently inspecting or active"
          icon={<Bot size={16} />}
          tone="teal"
        />
        <MetricCard
          label="Online Telemetry"
          value={`${onlineCount} / ${robots.length}`}
          note="Subterranean mesh & LoRa connected"
          icon={<Wifi size={16} />}
          tone="neutral"
        />
        <MetricCard
          label="Average Battery"
          value={`${avgBattery}%`}
          note="Fleet power reserve"
          icon={<Battery size={16} />}
          tone={avgBattery < 30 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Fleet Status"
          value={activeCount > 0 ? 'Nominal' : 'Standby'}
          note="Zero motor collision events"
          icon={<CheckCircle2 size={16} />}
          tone="teal"
        />
      </div>

      {/* Main Layout: Robot Fleet List & Detail View */}
      <div className="robotics-workspace-grid">
        {/* Left Column: Fleet List & Filters */}
        <section className="panel robotics-list-panel">
          <SectionHeader
            title="Robotics Fleet Register"
            aside="Select a unit to inspect live diagnostics"
          />

          {/* Filter Bar */}
          <div className="robotics-filters">
            <div className="search-field">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search robot name, ID, or zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="icon-button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="robotics-status-tabs">
              {['All', 'Inspecting', 'Active', 'Returning', 'Idle', 'Maintenance'].map((st) => (
                <button
                  key={st}
                  className={`robot-filter-btn ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Robots Cards List */}
          <div className="robotics-cards-list">
            {filteredRobots.length > 0 ? (
              filteredRobots.map((robot) => {
                const isSelected = robot.id === selectedRobot.id;
                return (
                  <article
                    key={robot.id}
                    className={`robot-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedRobotId(robot.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedRobotId(robot.id);
                      }
                    }}
                  >
                    <div className="robot-card-top">
                      <div className="robot-card-title-group">
                        <span className="robot-id-tag">{robot.id}</span>
                        <h3>{robot.name}</h3>
                      </div>
                      <span className={`robot-status-pill status-${robot.status.toLowerCase()}`}>
                        <span className="status-indicator-dot" />
                        {robot.status}
                      </span>
                    </div>

                    <div className="robot-card-meta">
                      <span className="robot-type">{robot.type}</span>
                      <span className="robot-location">{robot.location}</span>
                    </div>

                    {/* Progress Bar for Active Mission */}
                    {robot.mission.progress > 0 && (
                      <div className="robot-mission-progress">
                        <div className="mission-progress-label">
                          <span>{robot.mission.title}</span>
                          <strong>{robot.mission.progress}%</strong>
                        </div>
                        <div className="progress-bar-track">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${robot.mission.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="robot-card-stats">
                      <div className="robot-stat-item">
                        <span className="stat-label">
                          {robot.charging ? <BatteryCharging size={13} /> : <Battery size={13} />}
                          Battery
                        </span>
                        <strong className={robot.battery <= 25 ? 'text-warning' : ''}>
                          {robot.battery}%
                        </strong>
                      </div>

                      <div className="robot-stat-item">
                        <span className="stat-label">
                          {robot.connectivity.online ? <Wifi size={13} /> : <WifiOff size={13} />}
                          Link
                        </span>
                        <strong>
                          {robot.connectivity.online ? `${robot.connectivity.latencyMs}ms` : 'Offline'}
                        </strong>
                      </div>

                      <div className="robot-stat-item">
                        <span className="stat-label">
                          <Gauge size={13} /> Obstacle
                        </span>
                        <strong>{robot.sensors.obstacleDistanceMeters}m</strong>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                <Bot size={28} />
                <strong>No robots match this filter</strong>
                <p>Try searching for a different robot ID, name, or change the status filter.</p>
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setStatusFilter('All');
                    setSearchQuery('');
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Selected Robot Deep Dive */}
        <section className="panel robotics-detail-panel">
          <div className="robotics-detail-header">
            <div>
              <div className="detail-eyebrow">SELECTED UNIT TELEMETRY</div>
              <h2>{selectedRobot.name}</h2>
              <span className="detail-sub">{selectedRobot.type} · ID: {selectedRobot.id} · {selectedRobot.location}</span>
            </div>
            <div className="detail-status-wrap">
              <span className={`robot-status-pill status-${selectedRobot.status.toLowerCase()}`}>
                <span className="status-indicator-dot" />
                {selectedRobot.status}
              </span>
            </div>
          </div>

          {/* View Selector Tabs */}
          <div className="robot-view-tabs">
            <button
              className={`view-tab-btn ${activeTab === 'cad' ? 'active' : ''}`}
              onClick={() => setActiveTab('cad')}
            >
              <Cpu size={14} /> 3D Hardware CAD & Exploded View
            </button>
            <button
              className={`view-tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
              onClick={() => setActiveTab('camera')}
            >
              <Video size={14} /> Simulated Optical Camera Feed
            </button>
            <button
              className={`view-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
              onClick={() => setActiveTab('telemetry')}
            >
              <Activity size={14} /> Detailed Sensor Telemetry
            </button>
          </div>

          {/* Tab 1: 3D CAD Simulation */}
          {activeTab === 'cad' && (
            <div className="cad-viewer-container">
              <RoverCadSimulation />
            </div>
          )}

          {/* Tab 2: Simulated Live Optical Camera Feed */}
          {activeTab === 'camera' && (
            <div className="robot-camera-viewport">
              <div className="camera-hud-overlay">
                <div className="hud-corner-bracket hud-tl" />
                <div className="hud-corner-bracket hud-tr" />
                <div className="hud-corner-bracket hud-bl" />
                <div className="hud-corner-bracket hud-br" />

                <div className="hud-top-bar">
                  <span className="hud-live-tag">
                    <span className="live-pulse-dot" /> LIVE FEED — CAM 01 (OPTICAL)
                  </span>
                  <span className="hud-time-tag">
                    {new Date().toISOString().slice(11, 19)} UTC
                  </span>
                </div>

                <div className="hud-reticle">
                  <div className="reticle-circle" />
                  <div className="reticle-cross-h" />
                  <div className="reticle-cross-v" />
                  <div className="reticle-telemetry">
                    <span>RANGE: {selectedRobot.sensors.obstacleDistanceMeters}m</span>
                    <span>PITCH: -1.4° | ROLL: 0.8°</span>
                  </div>
                </div>

                <div className="hud-bottom-bar">
                  <span>SECTOR: {selectedRobot.location}</span>
                  <span>CH4: {selectedRobot.sensors.ch4}%</span>
                  <span>CO: {selectedRobot.sensors.co} ppm</span>
                  <span>TEMP: {selectedRobot.sensors.temp}°C</span>
                </div>
              </div>

              {/* Synthetic Camera Background */}
              <div className="camera-tunnel-backdrop">
                <div className="tunnel-wireframe-lines" />
                <div className="camera-scanline-fx" />
              </div>
            </div>
          )}

          {/* Tab 3: Detailed Sensor Telemetry */}
          {activeTab === 'telemetry' && (
            <div className="telemetry-deep-dive">
              <div className="telemetry-grid">
                <div className="telemetry-metric-card">
                  <span className="t-label">Atmospheric Methane (CH4)</span>
                  <strong className="t-value">{selectedRobot.sensors.ch4}%</strong>
                  <span className="t-status normal">Threshold: &lt;1.00%</span>
                </div>
                <div className="telemetry-metric-card">
                  <span className="t-label">Carbon Monoxide (CO)</span>
                  <strong className="t-value">{selectedRobot.sensors.co} ppm</strong>
                  <span className="t-status normal">Threshold: &lt;25 ppm</span>
                </div>
                <div className="telemetry-metric-card">
                  <span className="t-label">Subterranean Ambient Temp</span>
                  <strong className="t-value">{selectedRobot.sensors.temp}°C</strong>
                  <span className="t-status normal">Optimal mining range</span>
                </div>
                <div className="telemetry-metric-card">
                  <span className="t-label">Obstacle LiDAR Range</span>
                  <strong className="t-value">{selectedRobot.sensors.obstacleDistanceMeters} m</strong>
                  <span className="t-status normal">Forward path clear</span>
                </div>
                <div className="telemetry-metric-card">
                  <span className="t-label">LiDAR Point Cloud Sampling</span>
                  <strong className="t-value">{selectedRobot.sensors.lidarRateKhz} kHz</strong>
                  <span className="t-status normal">High density mode</span>
                </div>
                <div className="telemetry-metric-card">
                  <span className="t-label">Radio Telemetry Link</span>
                  <strong className="t-value">{selectedRobot.connectivity.latencyMs} ms</strong>
                  <span className="t-status normal">{selectedRobot.connectivity.protocol}</span>
                </div>
              </div>

              {/* Hardware Subsystem Health */}
              <div className="hardware-health-box">
                <h4>Hardware Subsystem Diagnostics</h4>
                <div className="health-checklist">
                  <div className="health-check-item">
                    <span className="h-name">Traction & Steering Actuators</span>
                    <span className={`h-badge ${selectedRobot.hardwareHealth.actuators.toLowerCase()}`}>
                      {selectedRobot.hardwareHealth.actuators}
                    </span>
                  </div>
                  <div className="health-check-item">
                    <span className="h-name">Dual Optical Starlight Lenses</span>
                    <span className={`h-badge ${selectedRobot.hardwareHealth.optics.toLowerCase()}`}>
                      {selectedRobot.hardwareHealth.optics}
                    </span>
                  </div>
                  <div className="health-check-item">
                    <span className="h-name">Solid-State 3D LiDAR Module</span>
                    <span className={`h-badge ${selectedRobot.hardwareHealth.lidar.toLowerCase()}`}>
                      {selectedRobot.hardwareHealth.lidar}
                    </span>
                  </div>
                  <div className="health-check-item">
                    <span className="h-name">LiFePO4 Internal Battery Stack</span>
                    <span className={`h-badge ${selectedRobot.hardwareHealth.batteryHealth.toLowerCase()}`}>
                      {selectedRobot.hardwareHealth.batteryHealth}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operational Command Actions */}
          <div className="robotics-action-bar">
            <h4>Operational Dispatch Controls</h4>
            <div className="robotics-buttons-row">
              <button
                className="button button-primary"
                onClick={() => triggerAction('Initiate Inspection Sweep')}
              >
                <Play size={14} /> Initiate Sweep
              </button>
              <button
                className="button button-secondary"
                onClick={() => triggerAction('Recall to Dock')}
              >
                <RotateCcw size={14} /> Recall to Dock
              </button>
              <button
                className="button button-secondary"
                onClick={() => triggerAction('Run Self-Diagnostics')}
              >
                <Wrench size={14} /> Run Diagnostics
              </button>
              <button
                className="button button-danger-outline"
                onClick={() => triggerAction('Emergency Halt')}
              >
                <ShieldAlert size={14} /> Emergency Stop
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
