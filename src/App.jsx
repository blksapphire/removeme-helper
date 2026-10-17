import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowRight, Check, CheckCircle2, ChevronDown, CircleHelp,
  Clipboard, Clock3, ExternalLink, FileText, Fingerprint, Globe2, LockKeyhole,
  Mail, Plus, Search, ShieldCheck, Sparkles, Trash2, UserRound, X
} from 'lucide-react';

const STORAGE_KEY = 'removeme-helper-v1';

const starterTasks = [
  { id: 'search', name: 'Search for your public profiles', category: 'Find listings', description: 'Search your name and location to identify sites displaying your personal information.', priority: 'Start here', status: 'todo', url: 'https://www.google.com/' },
  { id: 'broker', name: 'Identify the listing and its removal route', category: 'Find listings', description: 'Open the result, confirm it is your listing, and look for the site’s official privacy or opt-out instructions.', priority: 'High', status: 'todo', url: '' },
  { id: 'request', name: 'Prepare a removal request', category: 'Send request', description: 'Use a site’s official request channel. Share only the minimum information required.', priority: 'High', status: 'todo', url: '' },
  { id: 'verify', name: 'Check the request outcome', category: 'Follow up', description: 'Record the date you submitted the request and set a reminder to verify the listing later.', priority: 'Later', status: 'todo', url: '' },
];

const emptyProfile = { fullName: '', email: '', country: '', variants: '', notes: '' };

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function App() {
  const initial = useMemo(loadState, []);
  const [profile, setProfile] = useState(initial?.profile || emptyProfile);
  const [tasks, setTasks] = useState(initial?.tasks || starterTasks);
  const [consented, setConsented] = useState(Boolean(initial?.consented));
  const [showSetup, setShowSetup] = useState(!initial?.profile?.fullName);
  const [activeFilter, setActiveFilter] = useState('All tasks');
  const [search, setSearch] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [toast, setToast] = useState('');
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  useEffect(() => {
    if (!consented) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, tasks, consented }));
  }, [profile, tasks, consented]);

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const visibleTasks = tasks.filter((task) => {
    const matchesFilter = activeFilter === 'All tasks' ||
      (activeFilter === 'To do' && task.status !== 'done') ||
      (activeFilter === 'Completed' && task.status === 'done');
    const matchesSearch = (task.name + ' ' + task.description + ' ' + task.category).toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function saveProfile(event) {
    event.preventDefault();
    if (!profile.fullName.trim() || !profile.country) return;
    setConsented(true);
    setShowSetup(false);
    notify('Your workspace is saved on this device.');
  }

  function toggleTask(id) {
    setTasks((current) => current.map((task) => task.id === id
      ? { ...task, status: task.status === 'done' ? 'todo' : 'done', completedAt: task.status === 'done' ? null : new Date().toISOString() }
      : task));
  }

  function addTask(event) {
    event.preventDefault();
    if (!newTaskName.trim()) return;
    setTasks((current) => [{ id: crypto.randomUUID(), name: newTaskName.trim(), category: 'My checklist', description: 'Add the listing URL and removal instructions in your notes.', priority: 'Personal', status: 'todo', url: '' }, ...current]);
    setNewTaskName('');
    setNewTaskOpen(false);
    notify('Checklist item added.');
  }

  function clearWorkspace() {
    if (!window.confirm('Delete your saved profile and checklist from this browser? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    setProfile(emptyProfile);
    setTasks(starterTasks);
    setConsented(false);
    setShowSetup(true);
    notify('Local workspace cleared.');
  }

  const template = `Subject: Request to remove personal information

Hello Privacy Team,

I am requesting the removal of a listing that appears to contain my personal information.

Name shown on listing: ${profile.fullName || '[Name shown on listing]'}
Listing URL: [Paste the exact listing URL]
Country / region: ${profile.country || '[Your country or region]'}

Please let me know if additional information is strictly necessary to locate and remove this listing. I would prefer not to send identity documents or sensitive information unless legally required and after verifying your official process.

Please confirm receipt of this request and let me know when the listing has been removed.

Thank you.`;

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(template);
      notify('Template copied. Review it before sending.');
    } catch {
      setShowTemplate(true);
      notify('Select and copy the template manually.');
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="RemoveMe Helper home">
          <span className="brand-mark"><Fingerprint size={22} strokeWidth={2.2} /></span>
          <span>removeme<span className="brand-light">.</span><small>HELPER</small></span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><span className="nav-icon"><ShieldCheck size={18} /></span>Overview</a>
          <a className="nav-item" href="#checklist"><span className="nav-icon"><Clipboard size={18} /></span>Removal checklist <span className="nav-count">{tasks.length}</span></a>
          <button className="nav-item" onClick={() => setShowTemplate(true)}><span className="nav-icon"><Mail size={18} /></span>Request templates</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span className="privacy-icon"><LockKeyhole size={17} /></span>
            <strong>Your data stays yours.</strong>
            <p>Your profile and checklist stay in this browser. Nothing is submitted automatically.</p>
            <span className="privacy-status"><span /> LOCAL-FIRST STORAGE</span>
          </div>
          <button className="settings-link" onClick={clearWorkspace}><Trash2 size={16} /> Clear local workspace</button>
          <div className="sidebar-version">EARLY ACCESS <span>·</span> MVP</div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <b>Overview</b></div>
          <div className="topbar-right"><span className="secure-label"><LockKeyhole size={14} /> Private workspace</span><span className="avatar">{profile.fullName ? profile.fullName.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() : 'RM'}</span></div>
        </header>

        <section className="welcome-section">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> YOUR PRIVACY, IN YOUR HANDS</div>
            <h1>Take back your <em>privacy.</em></h1>
            <p className="welcome-copy">A calmer way to find personal-data listings, prepare opt-out requests, and keep track of what happens next.</p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-shield"><ShieldCheck size={47} strokeWidth={1.4} /></div>
            <span className="art-dot dot-one" /><span className="art-dot dot-two" /><span className="art-dot dot-three" />
          </div>
        </section>

        <section className="stats-grid" aria-label="Progress summary">
          <div className="stat-card"><div className="stat-top"><span>Checklist progress</span><span className="stat-icon mint"><CheckCircle2 size={17} /></span></div><div className="stat-number">{progress}<small>%</small></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="stat-foot">{doneCount} of {tasks.length} tasks completed</div></div>
          <div className="stat-card"><div className="stat-top"><span>To-do items</span><span className="stat-icon peach"><Clock3 size={17} /></span></div><div className="stat-number">{tasks.length - doneCount}<small> left</small></div><div className="stat-foot"><span className="inline-dot" /> Your next step is ready</div></div>
          <div className="stat-card"><div className="stat-top"><span>Requests sent</span><span className="stat-icon lilac"><Mail size={17} /></span></div><div className="stat-number">{tasks.filter(t => t.category === 'Send request' && t.status === 'done').length}<small> tracked</small></div><div className="stat-foot">Mark tasks complete as you go</div></div>
        </section>

        {!consented && (
          <section className="setup-banner">
            <div className="setup-symbol"><UserRound size={20} /></div>
            <div><strong>Make this workspace yours</strong><p>Add a few details to personalize your request templates. You choose whether to save them on this device.</p></div>
            <button className="button button-dark" onClick={() => setShowSetup(true)}>Set up profile <ArrowRight size={16} /></button>
          </section>
        )}

        <section className="content-grid" id="checklist">
          <div className="panel checklist-panel">
            <div className="panel-header">
              <div><div className="panel-kicker">YOUR PLAN</div><h2>Removal checklist</h2><p>Small, practical steps. You stay in control.</p></div>
              <button className="button button-outline" onClick={() => setNewTaskOpen(true)}><Plus size={16} /> Add task</button>
            </div>
            <div className="task-toolbar">
              <div className="filter-tabs">{['All tasks', 'To do', 'Completed'].map(filter => <button key={filter} className={activeFilter === filter ? 'filter-tab selected' : 'filter-tab'} onClick={() => setActiveFilter(filter)}>{filter}{filter === 'Completed' ? ` ${doneCount}` : ''}</button>)}</div>
              <label className="search-box"><Search size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a task" /></label>
            </div>
            <div className="task-list">
              {visibleTasks.map((task, index) => <article className={task.status === 'done' ? 'task-row completed' : 'task-row'} key={task.id}>
                <button className="task-check" onClick={() => toggleTask(task.id)} aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}>{task.status === 'done' && <Check size={15} />}</button>
                <div className="task-body"><div className="task-title-line"><h3>{task.name}</h3>{task.priority === 'Start here' && <span className="priority-pill">START HERE</span>}</div><p>{task.description}</p><div className="task-meta"><span>{task.category}</span>{task.status === 'done' && <span className="completed-label"><CheckCircle2 size={12} /> Completed</span>}</div></div>
                {task.url ? <a className="task-action" href={task.url} target="_blank" rel="noreferrer" aria-label={`Open resource for ${task.name}`}><ExternalLink size={16} /></a> : <button className="task-action" onClick={() => { setShowTemplate(true); }} aria-label="Open request template"><ArrowDownRight size={17} /></button>}
              </article>)}
              {visibleTasks.length === 0 && <div className="empty-state"><Search size={20} /><strong>No tasks found</strong><span>Try another search or filter.</span></div>}
            </div>
            <div className="panel-footer"><span><CircleHelp size={14} /> We never send requests for you automatically.</span><span>{doneCount}/{tasks.length} done</span></div>
          </div>

          <div className="right-column">
            <section className="panel profile-panel">
              <div className="side-panel-heading"><div><div className="panel-kicker">YOUR DETAILS</div><h2>Request profile</h2></div><button className="icon-button" onClick={() => setShowSetup(true)} aria-label="Edit profile"><ChevronDown size={17} /></button></div>
              <div className="profile-person"><span className="profile-avatar"><UserRound size={20} /></span><div><strong>{profile.fullName || 'Your name here'}</strong><span>{profile.country || 'Country not set'}</span></div></div>
              <div className="detail-row"><span>Email address</span><strong>{profile.email || 'Not added'}</strong></div>
              <div className="detail-row"><span>Name variants</span><strong>{profile.variants ? profile.variants.split(',').length : '0 saved'}</strong></div>
              <button className="button button-soft full-button" onClick={() => setShowSetup(true)}>{profile.fullName ? 'Edit profile' : 'Add your details'} <ArrowRight size={15} /></button>
              <p className="micro-note"><LockKeyhole size={12} /> Saved locally only after you opt in.</p>
            </section>

            <section className="template-card">
              <div className="template-card-top"><span className="template-icon"><FileText size={19} /></span><span className="template-badge">READY TO PERSONALIZE</span></div>
              <h2>Start with a clear request.</h2><p>Use a polite, editable template to ask a site to remove a listing. Always verify the official contact route first.</p>
              <button className="button button-light" onClick={() => setShowTemplate(true)}>View request template <ArrowRight size={15} /></button>
              <div className="template-decoration" aria-hidden="true">R</div>
            </section>

            <section className="tip-card"><span className="tip-icon"><Globe2 size={17} /></span><div><strong>Quick privacy tip</strong><p>Before sending documents, verify the website and read its privacy policy. Avoid sharing government IDs unless the official process truly requires it.</p></div></section>
          </div>
        </section>
        <footer className="footer"><span>RemoveMe Helper <span className="footer-dot">·</span> A privacy-first organizer</span><span>Manual-first by design <span className="footer-dot">·</span> You choose what to share</span></footer>
      </main>

      {showSetup && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowSetup(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="setup-title">
        <div className="modal-heading"><div><div className="panel-kicker">PERSONALIZE YOUR WORKSPACE</div><h2 id="setup-title">A little about you</h2><p>These details help prefill templates. You can leave anything optional blank.</p></div><button className="icon-button" onClick={() => setShowSetup(false)} aria-label="Close"><X size={18} /></button></div>
        <form onSubmit={saveProfile} className="form-stack">
          <label>Full name <span className="required">*</span><input required value={profile.fullName} onChange={e => setProfile({...profile, fullName:e.target.value})} placeholder="Name you use publicly" /></label>
          <label>Email for request drafts <span className="optional">OPTIONAL</span><input type="email" value={profile.email} onChange={e => setProfile({...profile, email:e.target.value})} placeholder="you@example.com" /></label>
          <label>Country or region <span className="required">*</span><select required value={profile.country} onChange={e => setProfile({...profile, country:e.target.value})}><option value="">Choose your country / region</option><option>Nigeria</option><option>United States</option><option>United Kingdom</option><option>Canada</option><option>Australia</option><option>European Union</option><option>Other</option></select></label>
          <label>Name variants <span className="optional">OPTIONAL</span><input value={profile.variants} onChange={e => setProfile({...profile, variants:e.target.value})} placeholder="Other spellings, maiden name, aliases" /><small>Separate variants with commas. Only include names you want to use for your search.</small></label>
          <div className="consent-box"><LockKeyhole size={17} /><div><strong>Choose local saving</strong><p>Nothing is saved between visits unless you check this box. Data is stored in this browser’s local storage, not sent to our server.</p><label className="checkbox-line"><input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} /> Save my profile and checklist on this device</label></div></div>
          <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setShowSetup(false)}>Cancel</button><button className="button button-dark" type="submit">Save profile <ArrowRight size={15} /></button></div>
        </form>
      </section></div>}

      {showTemplate && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowTemplate(false); }}><section className="modal template-modal" role="dialog" aria-modal="true" aria-labelledby="template-title">
        <div className="modal-heading"><div><div className="panel-kicker">EDIT BEFORE YOU SEND</div><h2 id="template-title">Personal-data removal request</h2><p>A starting point only. Adapt it to the website’s official process.</p></div><button className="icon-button" onClick={() => setShowTemplate(false)} aria-label="Close"><X size={18} /></button></div>
        <div className="template-warning"><ShieldCheck size={17} /><span>We do not contact data brokers or submit forms automatically. Verify the recipient before sharing personal details.</span></div>
        <textarea className="template-textarea" readOnly value={template} onFocus={e => e.target.select()} />
        <div className="modal-actions"><button className="button button-outline" onClick={() => setShowTemplate(false)}>Close</button><button className="button button-dark" onClick={copyTemplate}><Clipboard size={15} /> Copy template</button></div>
      </section></div>}

      {newTaskOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setNewTaskOpen(false); }}><section className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="task-title"><div className="modal-heading"><div><div className="panel-kicker">PERSONAL CHECKLIST</div><h2 id="task-title">Add a task</h2><p>Track a listing or follow-up you want to remember.</p></div><button className="icon-button" onClick={() => setNewTaskOpen(false)} aria-label="Close"><X size={18} /></button></div><form className="form-stack" onSubmit={addTask}><label>Task name<input autoFocus required value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="e.g. Follow up with example.com" /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setNewTaskOpen(false)}>Cancel</button><button type="submit" className="button button-dark"><Plus size={15} /> Add task</button></div></form></section></div>}

      {toast && <div className="toast"><CheckCircle2 size={16} /> {toast}</div>}
    </div>
  );
}

export default App;
