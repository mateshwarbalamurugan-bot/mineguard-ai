import { ArrowRight, CheckCircle2, Compass, FileSearch, Layers3, ShieldAlert, Target, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageTitle } from '../components/Primitives';
import { ProvenanceBadge } from '../components/Badges';
import { sources } from '../data/sources';

const disclaimer = 'MineGuard provides decision-support intelligence. It does not replace statutory inspections, certified mine safety equipment, qualified professional judgement or approved emergency procedures.';

export function AboutPage() {
  return <div className="page-stack">
    <PageTitle eyebrow="PRODUCT CONTEXT & ROADMAP" title="Why MineGuard" detail="A complementary intelligence layer for underground mine safety, inspection planning and better-informed decisions." />
    <section className="about-hero-card">
      <div className="about-hero-mark"><img src="/mineguard-mark.svg" alt=""/></div>
      <div><span className="eyebrow">MINEGUARD AI · INTELLIGENT UNDERGROUND MINE SAFETY SYSTEM</span><h2>Towards Zero Preventable Mining Fatalities.</h2><p>Preventable mining accidents and fatalities occur due to missed hazards, delayed inspections and lack of real-time underground intelligence.</p><span className="about-tagline">See Underground. Understand Risks. Prioritize Safety.</span></div>
    </section>
    <div className="about-three-grid">
      <article><Target size={19}/><strong>Identify information gaps</strong><p>Make missing, stale, conflicting or uncertain mine information visible rather than assuming a silent system is safe.</p></article>
      <article><FileSearch size={19}/><strong>Prioritize verification</strong><p>Use transparent evidence and configurable rules to help qualified teams organize inspection work.</p></article>
      <article><Layers3 size={19}/><strong>Complement existing systems</strong><p>Bring mine maps, sensor records, workforce checkpoints and vendor information into a coherent decision-support view.</p></article>
    </div>
    <section className="panel work-panel"><div className="section-header"><div><h2>How MineGuard works</h2><span className="section-aside">A transparent information-to-action chain</span></div><ProvenanceBadge type="SIMULATED"/></div><div className="about-flow"><div><span>01</span><strong>Connect</strong><small>Existing mine data, files and records</small></div><ArrowRight size={17}/><div><span>02</span><strong>Verify</strong><small>Freshness, coverage and source quality</small></div><ArrowRight size={17}/><div><span>03</span><strong>Prioritize</strong><small>Explainable inspection triage</small></div><ArrowRight size={17}/><div><span>04</span><strong>Respond</strong><small>Qualified human review and site procedures</small></div></div></section>
    <div className="about-roadmap-grid"><section className="panel work-panel"><div className="section-header"><div><h2>Implemented in this prototype</h2><span className="section-aside">Local fictional demo capabilities</span></div><CheckCircle2 size={17}/></div><ul className="about-check-list"><li>Shared simulated mine state and scenario controls</li><li>Sensor freshness and zone confidence rules</li><li>Inspection task queue and local audit events</li><li>Worker checkpoint and exit-accountability demo</li><li>Vendor/source register and technology advisor</li><li>Offline sample mining copilot responses</li><li>CSV report export and local integration settings</li></ul></section><section className="panel work-panel"><div className="section-header"><div><h2>Future roadmap</h2><span className="section-aside">Requires customer validation and engineering work</span></div><Wrench size={17}/></div><ul className="about-roadmap-list"><li>Real vendor and mine-system adapters</li><li>Authorized LiDAR / point-cloud ingestion and repeat-scan processing</li><li>Validated site-specific hazard and inspection workflows</li><li>Approved underground vision and sensor integrations</li><li>Mining-specific copilot backed by licensed, maintained technical sources</li><li>Inspection robotics research and controlled trials</li></ul></section></div>
    <section className="panel work-panel"><div className="section-header"><div><h2>Limitations we disclose</h2><span className="section-aside">What this demo does not claim</span></div><ShieldAlert size={17}/></div><ul className="about-limit-list"><li>No connection to a real operating mine or live sensor network.</li><li>No certified gas detection, structural diagnosis or regulatory approval.</li><li>No guaranteed accident prevention or precise underground GPS location.</li><li>AI scores are transparent demonstration rules, not predictions of collapse or hazard.</li><li>Vendor descriptions are attributed to reviewed sources and are not independent product-performance verification.</li></ul><div className="about-source-link"><Compass size={15}/><span>{sources.length} source records are available in the Source Register.</span><Link to="/sources">Review sources <ArrowRight size={13}/></Link></div></section>
    <div className="disclaimer-card"><ShieldAlert size={16}/><span>{disclaimer}</span></div>
  </div>;
}
