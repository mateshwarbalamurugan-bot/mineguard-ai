import { useState } from 'react';
import { ArrowUpRight, Box, Cpu, Layers, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Zone } from '../models/types';
import { Mine3DScene } from './Mine3DScene';
import { MineSchematic } from './MineSchematic';
import { RoverCadSimulation } from './RoverCadSimulation';
import { useMineStore } from '../store/useMineStore';

type MineDepthVisualProps = {
  zones: Zone[];
  selectedZoneId?: string | null;
  onSelect: (zoneId: string) => void;
  initialMode?: '3D' | 'ROVER' | '2D';
};

export function MineDepthVisual({
  zones,
  selectedZoneId,
  onSelect,
  initialMode = 'ROVER',
}: MineDepthVisualProps) {
  const [renderMode, setRenderMode] = useState<'3D' | 'ROVER' | '2D'>(initialMode);
  const scenario = useMineStore((state) => state.scenario);

  const uncertainCount = zones.filter((z) => z.state === 'UNCERTAIN' || z.state === 'UNKNOWN').length;
  const alertCount = zones.filter((z) => z.state === 'ALERT').length;

  return (
    <section className="mine-depth-card" aria-label="Underground Spatial & Robotic Digital Twin">
      <div className="mine-depth-card-head">
        <div className="head-left">
          <span className="section-title-badge">
            {renderMode === 'ROVER' ? (
              <>
                <Cpu size={14} className="text-cyan glow-cyan" aria-hidden="true" />
                <strong>ROVER CAD EXPLODED SIMULATION</strong>
              </>
            ) : (
              <>
                <Layers size={13} aria-hidden="true" />
                <strong>UNDERGROUND SPATIAL TWIN</strong>
              </>
            )}
          </span>
          <span className="mine-depth-live">
            <span className="live-dot" />
            {renderMode === 'ROVER' ? 'STARK HOLOGRAPHIC CAD · 9 SUBSYSTEMS' : 'SIMULATED · KESTREL RIDGE'}
          </span>
        </div>

        <div className="head-right">
          <div className="view-mode-toggle" role="tablist" aria-label="Simulation visualizer mode">
            <button
              type="button"
              role="tab"
              aria-selected={renderMode === 'ROVER'}
              className={`mode-btn ${renderMode === 'ROVER' ? 'active' : ''}`}
              onClick={() => setRenderMode('ROVER')}
              title="Autonomous Inspection Rover CAD & Exploded View Simulation"
            >
              <Cpu size={13} aria-hidden="true" />
              <span>Rover CAD</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={renderMode === '3D'}
              className={`mode-btn ${renderMode === '3D' ? 'active' : ''}`}
              onClick={() => setRenderMode('3D')}
              title="3D Underground Mine Network Model"
            >
              <Box size={13} aria-hidden="true" />
              <span>3D Mine Map</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={renderMode === '2D'}
              className={`mode-btn ${renderMode === '2D' ? 'active' : ''}`}
              onClick={() => setRenderMode('2D')}
              title="2D Flow Schematic"
            >
              <Radio size={13} aria-hidden="true" />
              <span>2D Flow</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mine-depth-viewport">
        {renderMode === 'ROVER' ? (
          <RoverCadSimulation height={520} />
        ) : renderMode === '3D' ? (
          <Mine3DScene
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelect={onSelect}
            height={520}
            showControls={true}
          />
        ) : (
          <div className="depth-2d-container">
            <MineSchematic
              zones={zones}
              frozen={scenario === 'sensor-failure'}
              selectedZoneId={selectedZoneId}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>

      <div className="mine-depth-card-foot">
        <div className="foot-status-pills">
          {renderMode === 'ROVER' ? (
            <>
              <span className="foot-pill pill-cyan">
                <span className="pill-dot cyan" />
                LiDAR 360° Laser Turret Active
              </span>
              <span className="foot-caption">
                Drag to orbit · Click components to inspect & isolate · Drag slider to explode assembly
              </span>
            </>
          ) : (
            <>
              {alertCount > 0 && (
                <span className="foot-pill pill-alert">
                  <span className="pill-dot alert" />
                  {alertCount} zone alert active
                </span>
              )}
              {uncertainCount > 0 && (
                <span className="foot-pill pill-uncertain">
                  <span className="pill-dot uncertain" />
                  {uncertainCount} zones need verification
                </span>
              )}
              <span className="foot-caption">
                Click or tap any underground zone to view sensors, inspections and history.
              </span>
            </>
          )}
        </div>

        <Link to="/map" className="foot-expand-link" aria-label="Open comprehensive mine map">
          <span>Full Spatial Map</span>
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
