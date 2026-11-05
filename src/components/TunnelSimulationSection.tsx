import { useState, useRef } from 'react';
import { Maximize2, Minimize2, Radio } from 'lucide-react';

export function TunnelSimulationSection() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <section id="tunnel-simulation" className="tunnel-sim-section" aria-label="3D Technical Simulation">
      <div className="tunnel-sim-wrapper" ref={containerRef}>
        {/* Top Technical Header Bar */}
        <div className="tunnel-sim-bar">
          <div className="tunnel-sim-bar-left">
            <span className="tunnel-sim-pulse" />
            <span className="tunnel-sim-title">3D TECHNICAL SIMULATION</span>
            <span className="tunnel-sim-sep">|</span>
            <span className="tunnel-sim-sub">AUTONOMOUS HAZARD DETECTION &amp; WATER INGRESS FUSION</span>
          </div>
          <div className="tunnel-sim-bar-right">
            <span className="tunnel-sim-chip">
              <Radio size={12} className="animate-pulse text-[#F2C400]" />
              <span>LIVE INTERACTIVE 3D</span>
            </span>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="tunnel-sim-fs-btn"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {/* Viewport Iframe Container */}
        <div className="tunnel-sim-viewport-frame">
          <iframe
            src="/simulation/tunnel-simulation.html"
            title="MINEGUARD AI — 3D Technical Simulation"
            className="tunnel-sim-iframe"
            loading="eager"
            allow="autoplay; fullscreen"
          />
        </div>
      </div>
    </section>
  );
}
