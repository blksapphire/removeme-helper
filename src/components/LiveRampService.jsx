import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Copy, ExternalLink, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';

const SESSION_KEY = 'removeme-liveramp-case-v1';
const STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],
  ['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],
  ['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],
  ['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
  ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],
  ['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],
  ['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],
  ['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],
  ['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],
  ['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']
];

const statusLabels = {
  submitted: 'Submitted to LiveRamp',
  processing: 'Processing',
  completed: 'Provider reports completion',
  failed: 'Provider reported a failure',
  submission_unknown: 'Submission not confirmed',
  submitting: 'Submitting request'
};

function loadSavedCase() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function ServiceStatus({ value }) {
  const label = statusLabels[value] || value || 'Awaiting status';
  const Icon = value === 'completed' ? CheckCircle2 : value === 'failed' || value === 'submission_unknown' ? AlertCircle : Clock3;
  return <span className={`service-status service-status--${value || 'unknown'}`}><Icon size={13} />{label}</span>;
}

export default function LiveRampService({ profile, notify }) {
  const [availability, setAvailability] = useState({ loading: true, configured: false, online: false });
  const [form, setForm] = useState({
    fullName: profile?.fullName || '',
    email: profile?.email || '',
    country: profile?.country || '',
    state: '',
    requestType: 'OPT_OUT',
    signature: '',
    consent: false
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedCase, setSavedCase] = useState(loadSavedCase);
  const [caseInfo, setCaseInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setForm(current => ({
      ...current,
      fullName: current.fullName || profile?.fullName || '',
      email: current.email || profile?.email || '',
      country: current.country || profile?.country || ''
    }));
  }, [profile?.fullName, profile?.email, profile?.country]);

  const loadAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/service-status', { cache: 'no-store' });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Service API is not connected.');
      const data = await response.json();
      setAvailability({ loading: false, online: true, configured: Boolean(data?.integrations?.liveramp?.enabled), message: data?.integrations?.liveramp?.message || '' });
    } catch {
      setAvailability({ loading: false, online: false, configured: false, message: 'The RemoveMe service backend is not connected to this deployment yet.' });
    }
  }, []);

  const refreshCase = useCallback(async (record = savedCase) => {
    if (!record?.caseId || !record?.accessToken) return;
    setRefreshing(true);
    setError('');
    try {
      const response = await fetch(`/api/removal-cases/${encodeURIComponent(record.caseId)}`, {
        headers: { Authorization: `Bearer ${record.accessToken}` },
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not refresh this request.');
      setCaseInfo(data);
    } catch (err) {
      setError(err.message || 'Could not refresh this request.');
    } finally {
      setRefreshing(false);
    }
  }, [savedCase]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);
  useEffect(() => { if (savedCase?.caseId) refreshCase(savedCase); }, [savedCase, availability.configured, refreshCase]);

  async function submitRequest(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/liveramp/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName, email: form.email, country: form.country, state: form.state,
          requestType: form.requestType, signature: form.signature, consent: form.consent
        })
      });
      const data = await response.json().catch(() => ({}));
      // A recorded case can have a failed/uncertain provider submission; preserve its access key.
      if (data.caseId && data.accessToken) {
        const record = { caseId: data.caseId, accessToken: data.accessToken };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
        setSavedCase(record);
        setCaseInfo(data);
      }
      if (!response.ok) throw new Error(data.message || 'The request was not submitted.');
      setForm(current => ({ ...current, signature: '', consent: false }));
      notify(data.status === 'failed' || data.status === 'submission_unknown' ? 'The request needs attention; review its status.' : 'Your LiveRamp request was sent.');
    } catch (err) {
      setError(err.message || 'The request could not be submitted.');
    } finally {
      setBusy(false);
    }
  }

  async function copyRecoveryCode() {
    if (!savedCase?.accessToken) return;
    try {
      await navigator.clipboard.writeText(`${savedCase.caseId}\n${savedCase.accessToken}`);
      notify('Case ID and access key copied. Keep them private.');
    } catch {
      setError('Clipboard access is unavailable. Keep this tab open to retain access to the case.');
    }
  }

  async function deleteCase() {
    if (!savedCase?.caseId || !savedCase?.accessToken) return;
    if (!window.confirm('Delete this case and its stored authorization receipt from RemoveMe Helper? This cannot cancel a request already sent to LiveRamp.')) return;
    setError('');
    try {
      const response = await fetch(`/api/removal-cases/${encodeURIComponent(savedCase.caseId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${savedCase.accessToken}` },
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not delete this case.');
      sessionStorage.removeItem(SESSION_KEY);
      setSavedCase(null);
      setCaseInfo(null);
      notify('The local case and stored authorization receipt were deleted.');
    } catch (err) {
      setError(err.message || 'Could not delete this case.');
    }
  }

  const deletionNeedsState = form.requestType === 'DELETION';
  const eligibleByForm = form.country === 'United States' && (!deletionNeedsState || STATES.some(([code]) => code === form.state));
  const canSubmit = availability.configured && eligibleByForm && form.fullName.trim().split(/\s+/).length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.signature.trim().toLocaleLowerCase() === form.fullName.trim().toLocaleLowerCase() &&
    form.consent && !busy;

  return (
    <section className="service-panel" id="removal-service">
      <div className="service-panel__header">
        <div className="service-heading-icon"><ShieldCheck size={19} /></div>
        <div className="service-panel__title">
          <div className="panel-kicker">OUR FIRST DIRECT INTEGRATION</div>
          <h2>LiveRamp privacy request</h2>
          <p>Submit through our server-side connector and track the provider's response here.</p>
        </div>
        <span className={`integration-pill ${availability.configured ? 'is-ready' : 'is-setup'}`}>
          <span />{availability.loading ? 'CHECKING' : availability.configured ? 'API READY' : 'SETUP REQUIRED'}
        </span>
      </div>

      {!availability.configured && (
        <div className="service-setup-notice">
          <LockKeyhole size={17} />
          <div>
            <strong>{availability.online ? 'The connector is not enabled yet' : 'Connect the RemoveMe service backend'}</strong>
            <p>{availability.message || 'The server must be configured with LiveRamp API access and approved authorized-agent use before it can send requests. No request is sent while setup is incomplete.'}</p>
          </div>
        </div>
      )}

      <div className="service-provider-note">
        <span className="service-provider-brand">LR</span>
        <div><strong>LiveRamp</strong><p>Its official API supports opt-out and deletion requests. This API is available only to approved U.S. LiveRamp customers. Consumer rights and deletion eligibility depend on applicable law.</p></div>
        <a href="https://developers.liveramp.com/privacy-api/reference/create-privacyrequests-1" target="_blank" rel="noreferrer">API docs <ExternalLink size={12} /></a>
      </div>

      <form className="service-form" onSubmit={submitRequest}>
        <div className="service-form-grid">
          <label>Full legal name
            <input required minLength={3} autoComplete="name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="First and last name" />
          </label>
          <label>Email address
            <input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </label>
          <label>Country of residence
            <select required value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
              <option value="">Choose country</option><option>Nigeria</option><option>United States</option><option>United Kingdom</option><option>Canada</option><option>Australia</option><option>European Union</option><option>Other</option>
            </select>
          </label>
          <label>Request type
            <select value={form.requestType} onChange={e => setForm({ ...form, requestType: e.target.value, state: e.target.value === 'DELETION' ? form.state : '' })}>
              <option value="OPT_OUT">Opt out of sale / sharing</option>
              <option value="DELETION">Request data deletion</option>
            </select>
          </label>
          {deletionNeedsState && (
            <label>US state of residence
              <select required value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
                <option value="">Choose state</option>
                {STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
              <small>The state is included in the provider request; choosing one does not establish legal eligibility.</small>
            </label>
          )}
          <label>Type your full name to sign
            <input required autoComplete="off" value={form.signature} onChange={e => setForm({ ...form, signature: e.target.value })} placeholder="Must match your full legal name" />
          </label>
        </div>

        <div className="service-consent">
          <LockKeyhole size={17} />
          <div>
            <strong>Authorize this request</strong>
            <p>I confirm that this request concerns my own personal information (or information I am legally authorized to manage). I authorize RemoveMe Helper to submit this request to LiveRamp as my agent. I understand my name and email will be sent to LiveRamp and that it may contact me to verify the request.</p>
            <label><input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} /> I have read and agree to this authorization.</label>
          </div>
        </div>
        {error && <div className="service-error" role="alert"><AlertCircle size={16} />{error}</div>}

        <div className="service-form-actions">
          <span className="service-privacy-note"><LockKeyhole size={13} /> Name and email are not stored in our case database.</span>
          <button className="button button-dark" type="submit" disabled={!canSubmit}>{busy ? 'Submitting…' : 'Authorize & submit request'} <ExternalLink size={14} /></button>
        </div>
        {!eligibleByForm && <p className="service-eligibility-note">This LiveRamp connector currently accepts U.S.-resident requests only. A state is required for deletion requests, but choosing one does not guarantee legal eligibility or removal.</p>}
      </form>

      {caseInfo && savedCase && (
        <div className="service-case">
          <div className="service-case__top">
            <div><div className="panel-kicker">YOUR REQUEST</div><h3>Case {caseInfo.caseId || savedCase.caseId}</h3></div>
            <ServiceStatus value={caseInfo.status} />
          </div>
          <p>{caseInfo.message || 'Current status returned by the RemoveMe service.'}</p>
          {caseInfo.providerRequestId && <div className="service-reference"><span>LiveRamp reference</span><strong>{caseInfo.providerRequestId}</strong></div>}
          <div className="service-form-actions">
            <button type="button" className="button button-outline" onClick={() => refreshCase()} disabled={refreshing}><RefreshCw size={14} /> {refreshing ? 'Refreshing…' : 'Refresh status'}</button>
            <button type="button" className="button button-outline" onClick={copyRecoveryCode}><Copy size={14} /> Copy case access key</button>
            <button type="button" className="button button-outline" onClick={deleteCase}><Trash2 size={14} /> Delete case</button>
          </div>
          {caseInfo.events?.length > 0 && <div className="service-event-list"><strong>Activity</strong>{caseInfo.events.slice(-4).reverse().map(event => <div className="service-event" key={event.id}><span className="service-event__dot" /><div><span>{event.label}</span><time>{new Date(event.createdAt).toLocaleString()}</time></div></div>)}</div>}
          <small className="service-privacy-note">Your case access key stays in this browser tab's session unless you copy it. “Submitted” is not proof that information has been removed; confirm the final provider status and recheck listings separately.</small>
        </div>
      )}
    </section>
  );
}
