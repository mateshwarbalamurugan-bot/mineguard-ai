# MineGuard AI – Intelligent Underground Mine Safety System

A research-informed, offline-first React/Vite prototype for a fictional underground mine. The application demonstrates how mine telemetry, information-confidence checks, inspection workflows, workforce checkpoint records, vendor research and mining knowledge can be presented in one decision-support workspace.

## Product identity

**Problem statement**

Preventable mining accidents and fatalities occur due to missed hazards, delayed inspections and lack of real-time underground intelligence.

**Vision**

Towards Zero Preventable Mining Fatalities.

**Tagline**

See Underground. Understand Risks. Prioritize Safety.

## Run locally

Requirements: Node.js 20+ and npm or pnpm.

```bash
npm install
npm run dev
```

Or, using the package manager recorded in `package.json`:

```bash
corepack pnpm install
corepack pnpm dev
```

Vite serves the application on port `3000` by default. The development server binds to `0.0.0.0`.

## Included workspaces

- Command Centre
- Live Mine Monitoring and scenario controls
- 2D mine schematic and illustrative 3D view
- Sample scan history and comparison slider
- Knowledge Confidence Engine
- Inspection Priority queue and task status workflow
- Worker Accountability and Emergency Accountability Drill
- Mining Copilot with clearly labelled offline sample responses
- Vendor Directory and side-by-side comparison
- Technology Advisor wizard
- Future Mining Technology Radar
- Reports and CSV export / print-to-PDF
- Settings, integration readiness, CSV preview and local audit history
- Source Register and About / Roadmap

## Demonstration behaviour

The fictional seed mine is **Demo Mine – Kestrel Ridge (Coal, fictional)**. Sample workers, sensor records, readings, zones, alerts, scans and vendors are demonstration data. Scenario changes are stored in the shared Zustand store and persist locally in the browser. Use **Reset Demo** in the Command Centre to restore the seed state.

The Tunnel B sensor-failure scenario demonstrates the data chain: sensor communication status → reading freshness → zone classification → alert → inspection priority → dashboard state.

## Important limitations

- No real mine, sensor, worker-location or vendor API is connected.
- All mine measurements, worker records, scan geometry and scenario values are simulated unless explicitly marked as uploaded.
- The map is a fictional schematic; the 3D representation and scan comparisons are illustrative sample views, not genuine LiDAR processing.
- The Copilot uses offline sample responses. It is not connected to an LLM or a live mining knowledge base.
- Vendor descriptions are attributed to the Source Register and are not independent performance verification.
- The prototype does not certify mine safety, detect hazards with certified instruments, make regulatory determinations, predict mine collapse or dispatch rescue teams.

**Disclaimer:** MineGuard provides decision-support intelligence. It does not replace statutory inspections, certified mine safety equipment, qualified professional judgement or approved emergency procedures.
