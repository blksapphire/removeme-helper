import React, { useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, Globe2, Plus, Search, ShieldAlert } from 'lucide-react';
import { brokerDirectory, directoryNotice } from '../data/brokers.js';

export default function BrokerDirectory({ onAddToChecklist, notify }) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All regions');
  const [category, setCategory] = useState('All types');

  const filtered = useMemo(() => brokerDirectory.filter((broker) => {
    const haystack = [broker.name, broker.category, broker.region, broker.instructions].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase()) &&
      (region === 'All regions' || broker.region.includes(region)) &&
      (category === 'All types' || broker.category === category);
  }), [query, region, category]);

  return (
    <section className="directory-section" id="directory">
      <div className="directory-heading">
        <div>
          <div className="panel-kicker">RESEARCH STARTING POINTS</div>
          <h2>Data-broker directory</h2>
          <p>Open the official route, verify it yourself, then track your request.</p>
        </div>
        <span className="directory-count"><Globe2 size={14} /> {brokerDirectory.length} starter entries</span>
      </div>

      <div className="directory-notice" role="note">
        <ShieldAlert size={18} />
        <p>{directoryNotice} These links have not yet been individually live-tested for this release.</p>
      </div>

      <div className="directory-toolbar">
        <label className="search-box directory-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies" aria-label="Search data-broker directory" /></label>
        <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="Filter by region">
          <option>All regions</option><option>United States</option><option>international</option>
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by type">
          <option>All types</option><option>People-search site</option><option>Shared suppression portal</option><option>Marketing data provider</option>
        </select>
      </div>

      <div className="broker-grid">
        {filtered.map((broker) => (
          <article className="broker-card" key={broker.id}>
            <div className="broker-card-top">
              <span className="broker-letter" aria-hidden="true">{broker.name.charAt(0)}</span>
              <span className="broker-status"><span /> Needs review</span>
            </div>
            <h3>{broker.name}</h3>
            <div className="broker-tags"><span>{broker.category}</span><span>{broker.region}</span></div>
            <p className="broker-instructions">{broker.instructions}</p>
            <div className="broker-info"><strong>Before you start</strong><p>{broker.information}</p></div>
            <div className="broker-actions">
              <a className="button button-outline" href={broker.optOutUrl} target="_blank" rel="noopener noreferrer">{'Open opt-out'} <ExternalLink size={14} /></a>
              <button className="button button-soft" onClick={() => onAddToChecklist(broker)}><Plus size={15} /> Track</button>
            </div>
            <div className="broker-source">{broker.source}</div>
          </article>
        ))}
        {filtered.length === 0 && <div className="empty-state"><Search size={20} /><strong>No companies found</strong><span>Try a different search or filter.</span></div>}
      </div>
      <div className="directory-footnote">Only use a route if it is relevant to you. An opt-out request may not cover every company, affiliate, country, or data type.</div>
    </section>
  );
}
