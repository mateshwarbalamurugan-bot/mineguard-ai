import { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpenCheck, Search, ShieldAlert } from 'lucide-react';
import { sources } from '../data/sources';
import { PageTitle } from '../components/Primitives';

export function SourceRegisterPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All sources');
  const entries = useMemo(() => sources.filter((source) => {
    const text = [source.title, source.platform, source.jurisdiction, ...source.supports, ...source.limitations].join(' ').toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === 'All sources' || source.status === filter);
  }), [query, filter]);

  return <div className="page-stack">
    <PageTitle eyebrow="EVIDENCE & ATTRIBUTION" title="Source Register" detail="Official references used in this fictional prototype. Vendor statements are attributed, not independently verified." />
    <div className="source-summary-bar"><div className="source-summary-icon"><BookOpenCheck size={20} /></div><div><strong>13 official sources reviewed · 04 Nov 2026</strong><p>Source pages support only the claims shown here. MineGuard has not been validated, connected, certified or audited.</p></div><span className="source-reviewed-label">SOURCE REGISTER</span></div>
    <div className="source-controls"><label className="search-field"><Search size={16} /><span className="sr-only">Search sources</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, topic, limitation…" /></label><select aria-label="Filter source status" value={filter} onChange={(event) => setFilter(event.target.value)}><option>All sources</option><option>Verified</option><option>Partially verified</option></select><span className="result-count">{entries.length} of {sources.length} sources</span></div>
    <div className="source-list">{entries.map((source) => <article className="source-card" key={source.id} id={source.id}>
      <div className="source-card-head"><div className="source-number">{String(sources.indexOf(source) + 1).padStart(2, '0')}</div><div className="source-heading"><div className="source-title-line"><h2>{source.title}</h2><span className={`source-status ${source.status === 'Verified' ? 'source-verified' : 'source-partial'}`}>{source.status}</span></div><div className="source-meta">{source.platform}{source.jurisdiction && <><span>·</span>{source.jurisdiction}</>}<span>·</span>Retrieved {source.retrieved}</div></div><a className="source-external" href={source.url} target="_blank" rel="noreferrer" aria-label={`Open official source: ${source.title}`}>Official source <ArrowUpRight size={14}/></a></div>
      <div className="source-claim"><div className="source-field-label">WHAT THE PAGE SUPPORTS</div><ul>{source.supports.map((claim) => <li key={claim}>{claim}</li>)}</ul></div>
      <div className="source-detail-grid"><div><div className="source-field-label">DOCUMENTED PATTERNS</div><ul>{source.interfacePatterns.map((item) => <li key={item}>{item}</li>)}</ul></div><div><div className="source-field-label">MINEGUARD LEARNS</div><ul>{source.learn.map((item) => <li key={item}>{item}</li>)}</ul></div><div><div className="source-field-label">WHAT WE DO DIFFERENTLY</div><ul>{source.different.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
      <details className="source-limitations"><summary><ShieldAlert size={14} />Limitations and unknowns</summary><ul>{source.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
      {source.relatedUrls?.length ? <div className="source-related"><span>Related official pages:</span>{source.relatedUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}<ArrowUpRight size={12} /></a>)}</div> : null}
    </article>)}{entries.length === 0 && <div className="empty-state"><Search size={22}/><strong>No matching sources</strong><p>Try a different search term or filter.</p></div>}</div>
  </div>;
}
