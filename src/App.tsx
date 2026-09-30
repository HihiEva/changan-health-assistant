import { useRef, useState, useEffect, type ReactNode } from 'react';
import { Heart, MessageCircle, FolderHeart, CalendarDays, Settings, ChevronRight, ArrowUp, Plus, FileText, Check, Clock3, ShieldCheck, Users, ArrowDownToLine, X, Leaf, Activity, CircleHelp, ArrowLeftRight, Search, RefreshCw, Sun, Sparkles, Pencil, ChevronDown, Bell, LogOut } from 'lucide-react';
import { archive, correctMedication, exportMember, grant, members, notifications, permissions, person, reports, seed, selectMember, sendMessage, storage, switchAccount, type MemberId, type Pending, type RecordKind, type State, type HealthRecord } from './domain';

import { aiContext, appendAIReply, type AIStatus } from './ai';

type Page = 'chat' | 'archive' | 'briefs' | 'settings';
const tabs = [{ id: 'chat' as Page, name: '聊一聊', icon: MessageCircle }, { id: 'archive' as Page, name: '健康档案', icon: FolderHeart }, { id: 'briefs' as Page, name: '今日与本周', icon: CalendarDays }];
const examples = ['今天大腿前侧有些疲劳，泡澡后舒服一些。', '我想记录用药变化：体验药乙从9月11日开始使用。', '查询我的用药记录', '更正：9月25日伸展约8分钟，走路正常。'];
const kinds: (RecordKind | '全部')[] = ['全部', '日常', '用药', '检查', '知识'];
const date = (at: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(at));
function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = ref.current; const previous = document.activeElement as HTMLElement | null; element?.showModal(); return () => { element?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className="modal" onCancel={close}><div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="关闭弹窗" onClick={close}><X size={22}/></button></div>{children}</dialog>;
}
function MetricTrend({ rows }: { rows: HealthRecord[] }) {
  const values = rows.filter(r => r.metric?.name === '空腹血糖').map(r => r.metric!).sort((a, b) => a.date.localeCompare(b.date));
  if (!values.length) return null;
  const points = values.map((m, i) => ({ ...m, x: values.length === 1 ? 260 : 45 + i * 430 / (values.length - 1), y: 130 - m.value * 100 / Math.max(8, ...values.map(value => value.value)) }));
  return <section className="record-card trend-card"><div className="card-top"><h3>检查指标时间线</h3><span className="tag">虚构数值 · mmol/L</span></div><svg viewBox="0 0 520 160" role="img" aria-label={`空腹血糖历史数值：${values.map(m => m.date + '，' + m.value).join('；')}`}><line x1="30" x2="490" y1="130" y2="130" stroke="#dfe7d7"/><polyline points={points.map(m => `${m.x},${Math.max(28, Math.min(125, m.y))}`).join(' ')} fill="none" stroke="#7b9c68" strokeWidth="2"/>{points.map(m => <g key={m.reportKey}><circle cx={m.x} cy={Math.max(28, Math.min(125, m.y))} r="4" fill="#557d58"/><text x={m.x} y={Math.max(20, Math.min(117, m.y - 13))} textAnchor="middle" fill="#557d58" fontSize="13">{m.value}</text><text x={m.x} y="152" textAnchor="middle" fill="#95a386" fontSize="11">{m.date.slice(5)}</text></g>)}</svg><p className="small">按检查日期展示已确认数值；仅作样例趋势展示，不据此判断健康改善或恶化。</p></section>;
}
export default function App() {
  const [initial] = useState(() => { try { return { state: storage.load(), error: '' }; } catch (error) { return { state: seed(), error: String((error as Error).message) }; } });
  const [state, setState] = useState<State>(initial.state);
  const [page, setPage] = useState<Page>('chat');
  const [input, setInput] = useState('');
  const [toast, setToast] = useState('');
  const [saveError, setSaveError] = useState(initial.error);
  const [reportOpen, setReportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editing, setEditing] = useState<Pending | null>(null);
  const [editText, setEditText] = useState('');
  const [editMedication, setEditMedication] = useState<HealthRecord['medication']>();
  const [filter, setFilter] = useState<RecordKind | '全部'>('全部');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const stateRef = useRef(state); stateRef.current = state;
  const [aiEnabled, setAIEnabled] = useState(false);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [aiModel, setAIModel] = useState('');
  const [aiError, setAIError] = useState('');
  const [checkingAI, setCheckingAI] = useState(false);
  async function checkAI() {
    if (!window.changanAI || checkingAI) return;
    setCheckingAI(true); setAIError('');
    try { const info = await window.changanAI.status(); setAIStatus(info); setAIModel(previous => info.models.some(m => m.id === previous) ? previous : (info.models.find(m => m.isDefault) || info.models[0]).id); }
    catch (e) { setAIStatus(null); setAIEnabled(false); setAIError((e as Error).message); }
    finally { setCheckingAI(false); }
  }
  const endRef = useRef<HTMLDivElement>(null);
  const canView = permissions.canView(state, state.selected);
  const current = person(canView ? state.selected : state.actor);
  const isOwner = current.id === state.actor;
  const canDraft = permissions.canDraft(state, current.id);
  const level = permissions.level(state, current.id);
  const rows = canView ? archive.list(state, current.id) : [];
  const pending = state.pending.filter(p => p.memberId === current.id);
  const messages = state.messages.filter(m => m.memberId === current.id);
  const briefs = state.briefs.filter(b => b.memberId === current.id);
  const [briefType, setBriefType] = useState<'每日' | '每周'>('每周');
  const [sampleVersion, setSampleVersion] = useState<'标准' | '冲突'>('标准');
  const [fileNotice, setFileNotice] = useState('');
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(''), 4500); return () => clearTimeout(timeout); }, [toast]);
  useEffect(() => { if (messages.length && page === 'chat') endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages.length, page]);
  useEffect(() => {
    function refresh(event: StorageEvent) {
      if (event.key !== 'changan-demo-v1') return;
      try { const next = storage.load(); stateRef.current = next; setState(next); setInput(''); setEditing(null); setReportOpen(false); setToast('体验状态已从另一窗口更新'); } catch (e) { setSaveError((e as Error).message); }
    }
    window.addEventListener('storage', refresh); return () => window.removeEventListener('storage', refresh);
  }, []);
  function commit(action: (s: State) => State, notice?: string) {
    try {
      const next = action(stateRef.current);
      stateRef.current = next;
      try { storage.save(next); setSaveError(''); } catch { setSaveError('浏览器未能保存体验状态；当前操作仅在本次页面有效。请检查存储空间或浏览器设置。'); }
      setState(next); if (notice) setToast(notice); return true;
    } catch (error) { setToast((error as Error).message); return false; }
  }
  async function send(text = input) {
    if (!text.trim() || busyRef.current) return;
    busyRef.current = true; setBusy(true); setAIError('');
    const snapshot = stateRef.current, owner = current.id;
    try {
      if (aiEnabled) {
        if (!window.changanAI || !aiStatus) throw new Error('请在设置中检查 ChatGPT 订阅连接。');
        const context = aiContext(snapshot, owner);
        const reply = await window.changanAI.chat({ text: text.trim(), context, model: aiModel });
        if (stateRef.current !== snapshot) throw new Error('等待期间账号、授权或资料已变化，本次回答未保存。请在当前成员下重新发送。');
        if (commit(s => appendAIReply(s, owner, text, reply))) setInput('');
      } else if (commit(s => sendMessage(s, owner, text))) setInput('');
    } catch (e) { setAIError((e as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function account(id: MemberId) { commit(s => switchAccount(s, id), `已切换为${person(id).name}的虚构账号`); setInput(''); setSearch(''); setEditing(null); setReportOpen(false); }
  function member(id: MemberId) { commit(s => selectMember(s, id)); setInput(''); setSearch(''); setEditing(null); setReportOpen(false); }
  function download(format: 'json' | 'md') {
    try {
      const body = exportMember(state, current.id, format);
      const url = URL.createObjectURL(new Blob([body], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = `${current.name}-虚构体验档案.${format}`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast('已导出当前成员的虚构体验资料');
    } catch (error) { setToast((error as Error).message); }
  }
  function startEdit(p: Pending) { setEditing(p); setEditMedication(p.medication ? { ...p.medication } : undefined); setEditText(p.metric ? String(p.metric.value) : p.text); }
  function PendingCard({ item }: { item: Pending }) {
    const conflict = item.status === '冲突待核对';
    const old = rows.find(r => r.id === item.conflictId);
    const editable = canDraft && (isOwner || item.author === state.actor);
    return <article className={`pending-card ${conflict ? 'conflict' : ''}`}>
      <div className="card-top"><span className="eyebrow"><Clock3 size={15}/> {conflict ? '数值冲突 · 请先核对' : '准备记入档案'}</span><span className="tag">{current.name} · {item.kind}</span></div>
      <p>{item.text}</p>
      {conflict && <div className="conflict-compare"><span>原记录：<strong>{old?.metric?.value} {old?.metric?.unit}</strong></span><span>新样例：<strong>{item.metric?.value} {item.metric?.unit}</strong></span></div>}
      <div className="meta">来源：{item.source}{item.metric ? ` · ${item.metric.position}` : ''}</div>
      {item.updateId && <p className="small">此次更正将保留原记录历史。</p>}
      {!isOwner && <p className="small owner-notice">需由{current.name}本人确认。可以切换体验账号演示本人确认。</p>}
      <div className="button-row">
        {isOwner && <button className="primary small-button" onClick={() => commit(s => archive.confirm(s, item.id, conflict), conflict ? '已更正原指标，并保留历史' : '已确认保存到当前成员档案')}><Check size={16}/>{conflict ? '已核对，更正原记录' : '确认保存'}</button>}
        {editable && <><button className="outline small-button" onClick={() => startEdit(item)}><Pencil size={15}/>{item.metric ? '核对数值' : '修改'}</button><button className="text-button" onClick={() => commit(s => archive.dismiss(s, item.id), '已撤回待保存条目，未写入档案')}>{conflict ? '保留原记录' : '暂不保存'}</button></>}
        {!editable && !isOwner && <span className="small">当前为只读访问</span>}
      </div>
    </article>;
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('chat'); }}><div className="brand-mark"><Heart size={26} strokeWidth={1.8}/></div><div><strong>常安</strong><span>家庭健康助手</span></div></a>
      <div className="sidebar-label">照顾好自己，也关心家人</div>
      <nav aria-label="主要导航">{tabs.map(tab => <button key={tab.id} className={`nav-item ${page === tab.id ? 'active' : ''}`} onClick={() => setPage(tab.id)}><tab.icon size={21}/><span>{tab.name}</span>{tab.id === 'archive' && pending.length > 0 && <span className="count">{pending.length}</span>}</button>)}</nav>
      <div className="family-block"><div className="section-label">当前可查看的档案</div>{members.filter(m => permissions.canView(state, m.id)).map(m => <button key={m.id} className={`member-button ${current.id === m.id ? 'selected' : ''}`} onClick={() => member(m.id)}><span className={`avatar ${m.id}`}>{m.initials}</span><span>{m.name}<small>{m.id === state.actor ? '我的档案' : permissions.level(state, m.id)}</small></span>{current.id === m.id && <span className="member-dot"/>}</button>)}<button className="family-link" onClick={() => setPage('settings')}><Users size={16}/> 家人授权与账号 <ChevronRight size={16}/></button></div>
      <div className="sidebar-note"><Leaf size={22}/><p>健康的变化，<br/>值得慢慢看见。</p><span>少一点繁琐，多一点陪伴。</span></div>
      <div className="sidebar-bottom"><button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}><Settings size={20}/>设置与使用说明</button><div className="account-label"><span className={`avatar tiny ${state.actor}`}>{person(state.actor).initials}</span><span>{person(state.actor).name}<small>虚构体验账号</small></span><button className="icon-button" aria-label="切换体验账号" onClick={() => setPage('settings')}><ArrowLeftRight size={17}/></button></div></div>
    </aside>
    <main>
      <header className="topbar"><div className="mobile-brand"><Heart size={22}/><strong>常安</strong></div><div className="breadcrumb">我的健康空间 <span>/</span> {page === 'settings' ? '设置' : tabs.find(t => t.id === page)?.name}</div><div className="topbar-right"><span className="demo-pill"><span/> 体验原型</span><button className="icon-button" aria-label="使用帮助" onClick={() => setHelpOpen(true)}><CircleHelp size={20}/></button><span className={`avatar tiny ${state.actor}`}>{person(state.actor).initials}</span></div></header>
      <div className="prototype-banner"><ShieldCheck size={17}/><span>{aiEnabled ? '仅使用虚构资料 · 聊天使用 ChatGPT 订阅 · 报告与简报为模拟 · 通知未启用' : '仅使用虚构资料 · AI 回复与报告解析为模拟 · 通知未启用'}</span><button onClick={() => setHelpOpen(true)}>了解原型 <ChevronRight size={14}/></button></div>
      {saveError && <div className="error-banner" role="alert">{saveError} <button onClick={() => setPage('settings')}>前往设置</button></div>}
      <div className="mobile-member"><label>当前档案 <select value={current.id} onChange={e => member(e.target.value as MemberId)}>{members.filter(m => permissions.canView(state, m.id)).map(m => <option key={m.id} value={m.id}>{m.name}{m.id === state.actor ? '（本人）' : `（${permissions.level(state, m.id)}）`}</option>)}</select></label><button className="icon-button" aria-label="打开设置" onClick={() => setPage('settings')}><Settings size={19}/></button></div>
      {!isOwner && <div className="shared-banner"><Users size={17}/> 正在查看 {current.name} 的档案 · {level}权限，保存需由本人确认。</div>}
      <div className={`workspace ${page === 'chat' ? 'with-aside' : ''}`}>
        <section className="main-column">
          {page === 'chat' && <>
            <div className="page-heading"><div><div className="eyebrow">YOUR EVERYDAY COMPANION</div><h1>聊聊今天的你<span>。</span></h1><p>身体的小变化、生活的新习惯，都可以从这里开始。</p></div><span className="heading-icon"><Leaf size={34}/></span></div>
            {messages.length === 0 && <>
              <section className="welcome-card"><div className="assistant-symbol"><Sparkles size={25}/></div><div><div className="assistant-name">常安 <span>{aiEnabled ? 'ChatGPT 订阅已启用' : '模拟健康助手'}</span></div><h2>{current.name}，很高兴见到你</h2><p>不需要填表，也不用一次说完。<br/>我们可以先聊一件你今天关心的事。</p><div className="welcome-footer"><ShieldCheck size={15}/> 想长期记录的内容，会先请本人确认。</div></div><div className="welcome-decoration"><div/><Leaf size={62} strokeWidth={1}/></div></section>
              <div className="section-head"><h3>从一件小事开始</h3><span>点击体验虚构场景</span></div>
              <div className="scenario-grid"><button onClick={() => send(examples[0])}><span className="scenario-icon peach"><Activity size={23}/></span><strong>说说身体感受</strong><span>大腿疲劳、运动后的恢复</span><ChevronRight size={17}/></button><button onClick={() => send(examples[1])}><span className="scenario-icon lavender"><Heart size={23}/></span><strong>整理用药变化</strong><span>让用药与日常感受联系起来</span><ChevronRight size={17}/></button><button disabled={!canDraft} onClick={() => { setFileNotice(''); setReportOpen(true); }}><span className="scenario-icon sage"><FileText size={23}/></span><strong>看看检查报告</strong><span>样例报告 · 自动整理后确认</span><ChevronRight size={17}/></button><button onClick={() => send(examples[2])}><span className="scenario-icon sand"><Search size={23}/></span><strong>问问已有记录</strong><span>查询档案，不用重复介绍</span><ChevronRight size={17}/></button></div>
              <div className="gentle-note"><Leaf size={17}/><p>不用每天打卡。重要的事，我们一起慢慢整理。</p></div>
            </>}
            {messages.length > 0 && <div className="conversation" aria-label={`${current.name}的体验对话`}>{messages.map(message => <article key={message.id} className={`message ${message.role}`}><div className="message-avatar">{message.role === 'assistant' ? <Sparkles size={19}/> : person(message.author).initials}</div><div className="message-body"><div className="message-label">{message.role === 'assistant' ? (message.provider === 'codex' ? `常安 · ChatGPT 订阅 · ${message.model}` : '常安 · 模拟回复') : `${person(message.author).name} · 虚构描述`}<span>{date(message.at)}</span></div><p>{message.text}</p>{message.role === 'user' && message.provider === 'codex' && canDraft && <button className="context-link" disabled={busy} onClick={() => commit(s => archive.draft(s, { memberId: current.id, kind: '日常', text: message.text, source: '虚构用户描述 · ChatGPT 订阅对话（待本人核对）', status: '待确认' }), '原始描述已加入待确认，本人确认后入档')}>将这段描述加入待确认</button>}</div></article>)}<div ref={endRef}/></div>}
            {pending.length > 0 && <section className="pending-section"><div className="section-head"><h3>待确认内容 <span className="inline-count">{pending.length}</span></h3><span>尚未成为档案事实</span></div>{pending.map(p => <PendingCard key={p.id} item={p}/>)}</section>}
            {aiError && <div className="error-banner" role="alert">{aiError}</div>}{busy && <p role="status" className="small">{aiEnabled ? 'ChatGPT 订阅正在回答…' : '正在整理…'}</p>}
            <form className="composer" onSubmit={e => { e.preventDefault(); send(); }}><label className="sr-only" htmlFor="chat-input">输入虚构体验描述</label><textarea id="chat-input" disabled={busy} value={input} onChange={e => setInput(e.target.value)} placeholder={isOwner ? '输入虚构描述，或点上方场景体验…' : canDraft ? `为${current.name}整理虚构近况…` : `查询${current.name}的已确认记录（只读）…`} rows={2} maxLength={3000}/><div className="composer-bottom"><button type="button" className="attachment-button" disabled={!canDraft} onClick={() => { setFileNotice(''); setReportOpen(true); }}><Plus size={20}/><span>样例报告</span></button><span>仅输入虚构信息 · 不接收真实健康资料</span><button className="send-button" type="submit" aria-label="发送虚构描述" disabled={!input.trim() || busy}><ArrowUp size={23}/></button></div></form><div className="composer-note">{aiEnabled ? '当前成员的必要虚构上下文会发送给 OpenAI，使用本机 ChatGPT 订阅额度。回答不会自动入档。' : '当前为模拟回答，可在设置中连接本机 ChatGPT 订阅。'} 档案仅保存在本机，尚未跨设备同步。</div>
          </>}
          {page === 'archive' && <>
            <div className="page-heading"><div><div className="eyebrow">A LITTLE MORE UNDERSTANDING</div><h1>{current.name}的健康档案<span>。</span></h1><p>已确认的信息在这里，身体的变化也有迹可循。</p></div><FolderHeart size={34}/></div>
            <div className="stat-grid"><div><span>已确认记录</span><strong>{rows.length}<small> 条</small></strong></div><div><span>待本人确认</span><strong>{pending.length}<small> 条</small></strong></div><div><span>当前用药样例</span><strong>{rows.filter(r => r.medication && !r.medication.end).length}<small> 项</small></strong></div></div>
            <section className="goal-card"><Leaf size={23}/><div><strong>当前健康目标</strong><p>{current.goal}</p></div><span className="tag">虚构样例</span></section>
            {pending.length > 0 && <section className="pending-section"><div className="section-head"><h3>待确认 · 与正式档案分开</h3></div>{pending.map(p => <PendingCard key={p.id} item={p}/>)}</section>}
            <div className="archive-tools"><div className="filter-tabs">{kinds.map(k => <button key={k} className={filter === k ? 'selected' : ''} onClick={() => setFilter(k)}>{k}</button>)}</div><label className="search-input"><Search size={17}/><input aria-label="搜索当前成员档案" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索记录"/></label></div>
            {(filter === '全部' || filter === '检查') && <MetricTrend rows={rows}/>}
            <div className="record-list">{rows.filter(r => (filter === '全部' || r.kind === filter) && r.text.includes(search)).map(r => <article className="record-card" key={r.id}><div className="card-top"><span className={`kind-tag kind-${r.kind}`}>{r.kind}</span><span className="meta"><Check size={14}/> 已确认 · {date(r.confirmedAt)}</span></div>{r.medication && <h3>{r.medication.name} <span className="tag">{r.medication.end ? '历史用药' : '当前用药'}</span></h3>}<p>{r.text}</p>{r.metric && <div className="metric-detail"><div><span>{r.metric.name}</span><strong>{r.metric.value} <small>{r.metric.unit}</small></strong></div><div><span>参考范围</span><p>{r.metric.range}</p></div><div><span>检查日期</span><p>{r.metric.date}</p></div><div><span>原报告位置</span><p>{r.metric.position}</p></div></div>}<div className="record-source">来源：{r.source}</div>{r.history.length > 0 && <details><summary>查看更正历史（{r.history.length}次）</summary>{r.history.map((h, i) => <p className="small" key={i}>{date(h.at)} · {h.text}</p>)}</details>}{canDraft && !r.metric && <button className="text-button record-edit" onClick={() => { if (commit(s => archive.draft(s, { memberId: current.id, kind: r.kind, text: r.text, source: '虚构体验 · 更正原记录', status: '待确认', updateId: r.id, medication: r.medication }), '已生成更正草稿，请在待确认区修改')) { setFilter('全部'); } }}><Pencil size={14}/> 准备更正</button>}</article>)}{rows.filter(r => (filter === '全部' || r.kind === filter) && r.text.includes(search)).length === 0 && <div className="empty-state"><FolderHeart size={32}/><h3>这里还没有匹配的记录</h3><p>试试其他分类或搜索词。</p></div>}</div>
            <div className="button-row export-row"><button className="outline" onClick={() => download('md')}><ArrowDownToLine size={17}/>导出 Markdown</button><button className="outline" onClick={() => download('json')}>导出 JSON</button>{canDraft && <button className="primary" onClick={() => { setFileNotice(''); setReportOpen(true); }}><Plus size={17}/>导入样例报告</button>}</div>
          </>}
          {page === 'briefs' && <>
            <div className="page-heading"><div><div className="eyebrow">SMALL STEPS, OVER TIME</div><h1>把关心留给每天<span>。</span></h1><p>{current.name}的问候与简报 · 轻轻跟进，不催促打卡。</p></div><Sun size={36}/></div>
            <div className="schedule-grid"><article><Sun size={25}/><div><h3>每天的一声问候</h3><p>每天 06:30 · 北京时间</p></div><span className="tag">未启用</span></article><article><CalendarDays size={25}/><div><h3>一周的健康回顾</h3><p>每周一 06:30 · 合并当天问候</p></div><span className="tag">未启用</span></article></div>
            <div className="notice-card"><Bell size={19}/><p>原型只演示内容生成，不会在后台运行，也不会发送手机通知。共享档案不会订阅家人的提醒。</p></div>
            <div className="section-head"><h3>体验一次主动跟进</h3><span>生成当前虚构档案快照</span></div><div className="button-row"><button className="outline" disabled={!isOwner} onClick={() => { commit(s => notifications.generate(s, current.id, '每日'), '已生成模拟问候'); setBriefType('每日'); }}><Sun size={18}/>模拟今日问候</button><button className="primary" disabled={!isOwner} onClick={() => { commit(s => notifications.generate(s, current.id, '每周'), '已生成模拟周报'); setBriefType('每周'); }}><CalendarDays size={18}/>模拟本周简报</button></div>{!isOwner && <p className="small">请切换为{current.name}的体验账号生成本人简报。</p>}
            <div className="brief-tabs"><button className={briefType === '每周' ? 'selected' : ''} onClick={() => setBriefType('每周')}>每周简报</button><button className={briefType === '每日' ? 'selected' : ''} onClick={() => setBriefType('每日')}>每日问候</button></div>
            {briefs.filter(b => b.type === briefType).length === 0 ? <div className="empty-state"><CalendarDays size={35}/><h3>先体验第一份{briefType === '每日' ? '问候' : '简报'}</h3><p>点击上方按钮，看看助手如何整理已确认内容与待办。</p></div> : [...briefs].reverse().filter(b => b.type === briefType).map(b => <article className="brief-card" key={b.id}><div className="card-top"><span className="eyebrow">{current.name} · 模拟{b.type === '每日' ? '问候' : '周报'}</span><span className="meta">{date(b.createdAt)}</span></div><p>{b.text}</p><div className="brief-footer"><ShieldCheck size={15}/>此次生成没有修改健康档案或服药状态。</div></article>)}
          </>}
          {page === 'settings' && <>
            <div className="page-heading"><div><div className="eyebrow">YOUR SPACE, YOUR CHOICE</div><h1>按你的习惯来<span>。</span></h1><p>管理体验账号、家人权限与本地资料。</p></div><Settings size={33}/></div>
            <section className="settings-card"><h2><Sparkles size={21}/>ChatGPT 订阅连接</h2><p>通过本机官方 Codex 使用你已登录的 ChatGPT 订阅，与 Codex 共用额度。仅发送当前成员的必要虚构上下文。</p>{window.changanAI ? <><button className="primary" disabled={checkingAI || busy} onClick={checkAI}>{checkingAI ? '正在检查…' : '检查订阅连接'}</button>{aiStatus && <><p role="status">已识别 ChatGPT {aiStatus.plan} · {aiStatus.viaProxy ? '使用电脑已有代理' : '使用默认网络'}（模型列表可用；发送消息后验证回答）</p><label className="field">聊天模型<select value={aiModel} disabled={busy} onChange={e => setAIModel(e.target.value)}>{aiStatus.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="field">聊天模式<select value={aiEnabled ? 'codex' : 'mock'} disabled={busy} onChange={e => setAIEnabled(e.target.value === 'codex')}><option value="mock">模拟体验</option><option value="codex">ChatGPT 订阅（真实回复，仅用虚构资料）</option></select></label>{aiEnabled && <button className="context-link" onClick={() => setPage('chat')}>进入聊天，发送虚构消息 <ChevronRight size={17}/></button>}</>}{aiError && <p role="alert">{aiError}</p>}</> : <p>请使用新版 Mac / Windows 桌面 App。普通浏览器无法直接调用电脑上的 Codex。</p>}<p className="small">失败会显示原因，不自动切换其他付费接口。报告、问候和周报仍为模拟；通知未启用。首次登录请在官方 Codex 使用 ChatGPT 登录。</p></section>
            <section className="settings-card"><h2><ArrowLeftRight size={21}/>切换体验账号</h2><p>以下为虚构角色切换，没有真实登录或身份认证。用于演示家人本人授权与确认。</p><div className="account-grid">{members.map(m => <button key={m.id} className={`account-card ${state.actor === m.id ? 'selected' : ''}`} onClick={() => account(m.id)}><span className={`avatar ${m.id}`}>{m.initials}</span><span><strong>{m.name}</strong><small>{m.role}</small></span>{state.actor === m.id ? <Check size={19}/> : <LogOut size={18}/>}</button>)}</div></section>
            <section className="settings-card"><h2><Users size={21}/>谁可以查看我的档案</h2><p>现在以 <strong>{person(state.actor).name}</strong> 的身份设置。默认不共享；撤回后，对方停止访问。</p>{members.filter(m => m.id !== state.actor).map(m => <div className="permission-row" key={m.id}><span className={`avatar ${m.id}`}>{m.initials}</span><div><strong>{m.name}</strong><span>家人体验账号</span></div><label><span className="sr-only">授予{m.name}的权限</span><select aria-label={`授予${m.name}的权限`} value={state.grants.find(g => g.owner === state.actor && g.viewer === m.id)?.level ?? '不共享'} onChange={e => commit(s => grant(s, m.id, e.target.value === '不共享' ? null : e.target.value as '查看' | '协助整理'), e.target.value === '不共享' ? '授权已撤回' : '本人已授予档案访问权限')}><option>不共享</option><option>查看</option><option>协助整理</option></select></label></div>)}<div className="notice-card"><ShieldCheck size={17}/><p>“协助整理”可以产生草稿，只有档案本人能确认保存。正式版需要服务端身份认证与权限隔离，本地原型不是安全账户系统。</p></div></section>
            <section className="settings-card"><h2><Bell size={21}/>问候与通知</h2><div className="settings-line"><span>每日问候</span><strong>06:30 · 北京时间</strong></div><div className="settings-line"><span>每周简报</span><strong>周一 06:30 · 合并当天问候</strong></div><p>当前均未启用实际通知。正式版需分别验证服务器定时生成与设备收到通知。</p><button className="outline" onClick={() => setPage('briefs')}>体验问候与周报 <ChevronRight size={16}/></button></section>
            <section className="settings-card"><h2><FolderHeart size={21}/>体验资料</h2><p>仅保存在当前设备的体验环境；其他设备不会同步。聊天也会保留在本地，但未确认内容不成为档案事实。请勿输入真实健康信息。</p><div className="button-row"><button className="outline" onClick={() => download('md')}><ArrowDownToLine size={16}/>导出当前档案</button><button className="outline" onClick={() => download('json')}>导出 JSON</button><button className="danger-button" onClick={() => setResetOpen(true)}><RefreshCw size={16}/>重置体验资料</button></div></section>
            <section className="settings-card"><h2><CircleHelp size={21}/>添加到手机桌面</h2><p><strong>苹果手机：</strong>用 Safari 打开正式 HTTPS 体验地址，在分享菜单选择“添加到主屏幕”。</p><p><strong>安卓手机：</strong>用支持安装的浏览器打开正式 HTTPS 地址，在菜单选择“安装应用”或“添加到主屏幕”。具体名称随浏览器变化。</p><p className="small">本地 localhost 只供当前电脑体验。手机访问需同一网络的开发地址；完整 PWA 安装及离线验证需要 HTTPS。当前没有公开部署地址。</p></section>
          </>}
        </section>
        {page === 'chat' && <aside className="context-column"><section className="context-profile"><div className="card-top"><h3>我的健康概览</h3><span className="tag">虚构资料</span></div><div className="profile-line"><span className={`avatar large ${current.id}`}>{current.initials}</span><div><strong>{current.name}</strong><span>{isOwner ? '我的档案' : `家人档案 · ${level}`}</span></div></div><div className="context-stats"><div><strong>{rows.length}</strong><span>已确认记录</span></div><div><strong>{pending.length}</strong><span>待确认</span></div></div><button className="context-link" onClick={() => setPage('archive')}>查看完整档案 <ChevronRight size={16}/></button></section><section className="context-goal"><span className="eyebrow"><Leaf size={16}/>正在关注</span><h3>{current.goal}</h3><p>已记录的近况帮助我们理解变化，<br/>不以单次感受判断长期趋势。</p><div className="progress-dots"><span/><span/><span/><span/><span/></div><small>慢慢来，每一步都算数。</small></section><section className="context-week"><div className="card-top"><h3>本周简报</h3><CalendarDays size={19}/></div><p>把已存档、待确认和下一步，<br/>整理成一份清楚的回顾。</p><span className="meta">周一 06:30 · 计划时间</span><button className="context-link" onClick={() => setPage('briefs')}>预览简报 <ChevronRight size={16}/></button></section><div className="privacy-note"><ShieldCheck size={18}/><p>你来决定哪些内容长期保存。<br/>原型数据仅保存在此浏览器。</p></div></aside>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="手机导航">{[...tabs, { id: 'settings' as Page, name: '设置', icon: Settings }].map(tab => <button key={tab.id} className={page === tab.id ? 'active' : ''} onClick={() => setPage(tab.id)}><tab.icon size={22}/><span>{tab.name}</span></button>)}</nav>
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}<button className="icon-button" aria-label="关闭提示" onClick={() => setToast('')}><X size={16}/></button></div>}
    {editing && <Modal title={editing.metric ? '核对样例指标' : '修改待确认内容'} close={() => setEditing(null)}><p className="small">{person(editing.memberId).name} · 保存前仍需本人确认。</p>{editing.metric ? <><div className="sample-report"><strong>虚构报告原文</strong><p>空腹血糖 {editing.source.includes('冲突') ? '6.2' : '5.2'} mmol/L</p><p>样例原始结果以导入版本为准。请核对后输入需要保存的数值。</p></div><label className="field">空腹血糖（mmol/L）<input type="number" min="0.1" max="100" step="0.1" value={editText} onChange={e => setEditText(e.target.value)}/></label></> : editing.medication && editMedication ? <><p className="small">这些均为虚构药物字段，不适用于真实用药。</p>{(['name', 'dose', 'frequency', 'start', 'end'] as const).map(key => <label className="field" key={key}>{({ name: '样例药名', dose: '每次剂量', frequency: '使用频次', start: '开始日期', end: '结束日期（留空表示当前使用）' })[key]}<input type={key === 'start' || key === 'end' ? 'date' : 'text'} value={editMedication[key] ?? ''} onChange={e => setEditMedication({ ...editMedication, [key]: e.target.value || (key === 'end' ? undefined : '') })}/></label>)}</> : <label className="field">待保存内容<textarea rows={5} value={editText} onChange={e => setEditText(e.target.value)}/></label>}<div className="button-row"><button className="primary" onClick={() => { const id = editing.id; if (commit(s => editing.metric ? reports.correctMetric(s, id, Number(editText)) : editing.medication && editMedication ? correctMedication(s, id, editMedication) : archive.edit(s, id, editText), '草稿已修改，尚未入档')) setEditing(null); }}>完成修改</button><button className="outline" onClick={() => setEditing(null)}>取消</button></div></Modal>}
    {reportOpen && <Modal title="体验报告整理" close={() => setReportOpen(false)}><p>为 <strong>{current.name}</strong> 整理一份内置虚构报告。解析结果先核对，再确认入档。</p><div className="file-picker"><FileText size={32}/><strong>照片 / PDF 上传入口</strong><p>原型不会读取或上传文件，统一使用内置样例。请勿选择真实报告。</p><label className="outline file-label">选择虚构文件<input type="file" accept="image/*,application/pdf" aria-label="选择虚构报告文件" onChange={e => { setFileNotice(e.target.files?.length ? '已选择文件，但未读取、上传或解析。下方仍使用内置虚构报告。' : ''); e.target.value = ''; }}/></label>{fileNotice && <p role="status">{fileNotice}</p>}</div><label className="field">选择样例版本<select value={sampleVersion} onChange={e => setSampleVersion(e.target.value as '标准' | '冲突')}><option>标准</option><option>冲突</option></select></label><div className="sample-report"><div className="card-top"><strong>体检报告 · 内置虚构样例</strong><span className="tag">模拟解析</span></div><p>姓名：{current.name}　日期：2026-09-20</p><table><thead><tr><th>项目</th><th>结果</th><th>单位</th></tr></thead><tbody><tr><td>空腹血糖</td><td>{sampleVersion === '标准' ? '5.2' : '6.2'}</td><td>mmol/L</td></tr></tbody></table><p className="small">样例参考范围：3.9—6.1 · 第1页第1行</p></div><p className="small">先保存标准版，再导入冲突版，可体验数值核对与历史保留。</p><button className="primary full" disabled={!canDraft} onClick={() => { if (commit(s => reports.importSample(s, current.id, sampleVersion), '样例已整理，请在待确认区核对')) { setReportOpen(false); setPage('archive'); } }}>整理样例，生成待确认条目 <ChevronRight size={17}/></button></Modal>}
    {resetOpen && <Modal title="重置虚构体验资料？" close={() => setResetOpen(false)}><p>将移除此浏览器里的体验对话、草稿、更正、授权和简报，恢复初始样例。可先导出再重置。</p><div className="button-row"><button className="danger-button" onClick={() => { try { setState(storage.reset()); setSaveError(''); setInput(''); setSearch(''); setFilter('全部'); setPage('chat'); setResetOpen(false); setToast('已恢复初始虚构资料'); } catch { setToast('重置失败，浏览器存储不可用'); } }}>重置体验资料</button><button className="outline" onClick={() => setResetOpen(false)}>保留现有体验</button></div></Modal>}
    {helpOpen && <Modal title="欢迎体验常安" close={() => setHelpOpen(false)}><ol className="help-list"><li>在“聊一聊”点一个虚构场景，体验回答与待保存卡片。</li><li>修改卡片后确认，去“健康档案”查询、更正或导出。</li><li>在设置切换为周宁，授权林安查看或协助整理，再切回林安体验。</li><li>去“今日与本周”模拟问候与周报，未回复不会生成健康状态。</li></ol><div className="notice-card"><ShieldCheck size={18}/><p>所有人物、药物和报告均为虚构。桌面版可在设置中选择 ChatGPT 订阅真实回复；报告与简报仍为模拟。没有后台任务、医疗服务、账户安全隔离或跨设备同步。请仅使用虚构信息。</p></div><button className="primary full" onClick={() => setHelpOpen(false)}>开始体验</button></Modal>}
  </div>;
}
