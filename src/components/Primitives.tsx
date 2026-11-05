import { ArrowUpRight, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProvenanceBadge } from './Badges';
import type { ReactNode } from 'react';

export function PageTitle({ eyebrow, title, detail, children }: { eyebrow?: string; title: string; detail?: string; children?: ReactNode }) {
  return <div className="page-title-row"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{detail && <p>{detail}</p>}</div>{children && <div className="page-title-actions">{children}</div>}</div>;
}

export function MetricCard({ label, value, note, icon, tone = 'neutral', provenance = 'SIMULATED' }: { label: string; value: string | number; note?: string; icon?: ReactNode; tone?: string; provenance?: string }) {
  return <article className={`metric-card metric-${tone}`}><div className="metric-top"><span>{label}</span>{icon && <span className="metric-icon">{icon}</span>}</div><div className="metric-value">{value}</div>{note && <div className="metric-note">{note}</div>}<ProvenanceBadge type={provenance} /></article>;
}

export function SourceLink({ id, children = 'Source' }: { id: string; children?: ReactNode }) {
  return <Link className="source-link" to={`/sources#${id}`} aria-label={`Open Source Register entry: ${id}`}>{children}<ArrowUpRight size={13} aria-hidden="true" /></Link>;
}

export function SectionHeader({ title, action, aside }: { title: string; action?: ReactNode; aside?: string }) {
  return <div className="section-header"><div><h2>{title}</h2>{aside && <span className="section-aside"><Info size={13} aria-hidden="true" />{aside}</span>}</div>{action}</div>;
}
