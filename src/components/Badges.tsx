import { Check, CircleHelp, CircleX, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ZoneStatus } from '../models/types';

const provenanceHelp: Record<string, string> = {
  SIMULATED: 'Fictional demonstration data. No mine systems are connected.',
  UPLOADED: 'A file supplied within this local demo.',
  CONNECTED: 'A live integration state. No integration is connected in this prototype.',
  'AI-GENERATED ANALYSIS': 'Demo rule-based analysis; not validated safety advice.',
  'VENDOR-PROVIDED': 'Vendor-published description, not independent verification of performance.',
  'INDEPENDENTLY VERIFIED': 'Independent source verification. No vendor field is independently verified in this prototype.',
  'NOT AVAILABLE': 'The reviewed source did not establish this field.',
};

export function ProvenanceBadge({ type = 'SIMULATED', children }: { type?: string; children?: ReactNode }) {
  return <span className={`provenance provenance-${type.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`} title={provenanceHelp[type] ?? 'Data source information'} aria-label={`Data provenance: ${type}`}><span className="provenance-dot" aria-hidden="true" />{children ?? type}</span>;
}

export function StatusBadge({ status }: { status: ZoneStatus }) {
  const config = {
    KNOWN: { Icon: Check, label: 'Known' },
    UNCERTAIN: { Icon: TriangleAlert, label: 'Uncertain' },
    UNKNOWN: { Icon: CircleHelp, label: 'Unknown' },
    ALERT: { Icon: CircleX, label: 'Alert' },
  }[status];
  const { Icon } = config;
  return <span className={`status-badge status-${status.toLowerCase()}`}><Icon size={14} aria-hidden="true" /><span>{config.label}</span></span>;
}
