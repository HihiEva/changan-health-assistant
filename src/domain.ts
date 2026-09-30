export type MemberId = 'lin' | 'zhou';
export type RecordKind = '日常' | '用药' | '检查' | '知识';
export type GrantLevel = '查看' | '协助整理';
export interface Member { id: MemberId; name: string; initials: string; role: string; goal: string }
export interface Grant { owner: MemberId; viewer: MemberId; level: GrantLevel }
export interface Revision { text: string; at: string; actor: MemberId }
export interface Metric { name: string; value: number; unit: string; range: string; date: string; position: string; reportKey: string }
export interface HealthRecord {
  id: string; memberId: MemberId; kind: RecordKind; text: string; source: string;
  confirmedAt: string; history: Revision[]; metric?: Metric;
  medication?: { name: string; dose: string; frequency: string; start: string; end?: string };
}
export interface Pending {
  id: string; memberId: MemberId; author: MemberId; kind: RecordKind; text: string;
  source: string; createdAt: string; updateId?: string; metric?: Metric; medication?: HealthRecord['medication'];
  status: '待确认' | '冲突待核对'; conflictId?: string;
}
export interface Message { id: string; memberId: MemberId; author: MemberId; role: 'user' | 'assistant'; text: string; at: string; provider?: 'mock' | 'codex'; model?: string }
export interface Brief { id: string; memberId: MemberId; type: '每日' | '每周'; createdAt: string; text: string }
export interface State { version: 1; actor: MemberId; selected: MemberId; grants: Grant[]; records: HealthRecord[]; pending: Pending[]; messages: Message[]; briefs: Brief[] }
export const members: Member[] = [
  { id: 'lin', name: '林安', initials: '林', role: '体验账号 A', goal: '逐步建立运动习惯，观察身体恢复' },
  { id: 'zhou', name: '周宁', initials: '周', role: '体验账号 B', goal: '规律作息，整理历次检查与用药' },
];
export const uid = () => crypto.randomUUID();
export const stamp = () => new Date().toISOString();
export const person = (id: MemberId) => members.find(m => m.id === id)!;
export function seed(): State {
  const at = '2026-09-25T00:00:00.000Z';
  return {
    version: 1, actor: 'lin', selected: 'lin', grants: [], pending: [], messages: [], briefs: [],
    records: [
      { id: 'lin-daily', memberId: 'lin', kind: '日常', text: '9月25日做轻松伸展约10分钟，日常走路正常。计划观察运动后的恢复情况。', source: '虚构体验资料 · 本人确认', confirmedAt: at, history: [] },
      { id: 'lin-med-old', memberId: 'lin', kind: '用药', text: '体验药甲：每日1次，每次1片；9月10日结束使用。仅用于演示用药历史。', source: '虚构医嘱 · 示例，不适用于真实用药', confirmedAt: at, history: [], medication: { name: '体验药甲', dose: '1片', frequency: '每日1次', start: '2026-09-01', end: '2026-09-10' } },
      { id: 'lin-med', memberId: 'lin', kind: '用药', text: '体验药乙：每日1次，每次1片，9月11日开始。具体药理未知。', source: '虚构医嘱 · 示例，不适用于真实用药', confirmedAt: at, history: [], medication: { name: '体验药乙', dose: '1片', frequency: '每日1次', start: '2026-09-11' } },
      { id: 'zhou-daily', memberId: 'zhou', kind: '日常', text: '最近准备调整作息，先记录一周的睡眠感受。', source: '虚构体验资料 · 本人确认', confirmedAt: at, history: [] },
      { id: 'zhou-med', memberId: 'zhou', kind: '用药', text: '体验药丙：每日1次，每次1片，9月15日开始。具体药理未知。', source: '虚构医嘱 · 示例，不适用于真实用药', confirmedAt: at, history: [], medication: { name: '体验药丙', dose: '1片', frequency: '每日1次', start: '2026-09-15' } },
      ...members.map(m => ({ id: `${m.id}-baseline`, memberId: m.id, kind: '检查' as const, text: '2026-08-20 空腹血糖 5.0 mmol/L；参考范围 3.9—6.1（样例范围）。', source: '内置虚构历史报告 · 2026-08-20', confirmedAt: at, history: [], metric: { name: '空腹血糖', value: 5.0, unit: 'mmol/L', range: '3.9—6.1（样例范围）', date: '2026-08-20', position: '历史样例第1页 · 第1行', reportKey: `${m.id}-sample-20260820-glucose` } })),
      ...members.map(m => ({ id: `${m.id}-knowledge`, memberId: m.id, kind: '知识' as const, text: '一般知识样例：观察活动后的感受与日常功能变化。此条仅演示来源管理，不是个人医嘱。', source: '内置虚构知识卡 · 一般知识', confirmedAt: at, history: [] })),
    ],
  };
}
export interface PermissionService { level(state: State, owner: MemberId): '本人' | GrantLevel | null; canView(state: State, owner: MemberId): boolean; canDraft(state: State, owner: MemberId): boolean }
export const permissions: PermissionService = {
  level: (s, owner) => s.actor === owner ? '本人' : s.grants.find(g => g.owner === owner && g.viewer === s.actor)?.level ?? null,
  canView: (s, owner) => s.actor === owner || s.grants.some(g => g.owner === owner && g.viewer === s.actor),
  canDraft: (s, owner) => s.actor === owner || s.grants.some(g => g.owner === owner && g.viewer === s.actor && g.level === '协助整理'),
};
const requireView = (s: State, owner: MemberId) => { if (!permissions.canView(s, owner)) throw new Error('未获授权，不能访问该成员资料。'); };
const requireDraft = (s: State, owner: MemberId) => { if (!permissions.canDraft(s, owner)) throw new Error('只有查看权限，不能整理或修改资料。'); };
export interface ArchiveService {
  list(s: State, owner: MemberId): HealthRecord[];
  draft(s: State, item: Omit<Pending, 'id' | 'author' | 'createdAt'>): State;
  confirm(s: State, id: string, conflictResolved?: boolean): State;
  dismiss(s: State, id: string): State;
  edit(s: State, id: string, text: string): State;
}
export const archive: ArchiveService = {
  list(s, owner) { requireView(s, owner); return s.records.filter(r => r.memberId === owner); },
  draft(s, item) {
    requireDraft(s, item.memberId);
    if (item.updateId && !s.records.some(r => r.id === item.updateId && r.memberId === item.memberId)) throw new Error('找不到所属成员的原记录。');
    if (s.pending.some(p => p.memberId === item.memberId && p.text === item.text && p.updateId === item.updateId)) return s;
    return { ...s, pending: [...s.pending, { ...item, id: uid(), author: s.actor, createdAt: stamp() }] };
  },
  confirm(s, id, conflictResolved = false) {
    const p = s.pending.find(p => p.id === id);
    if (!p) throw new Error('待确认条目不存在。');
    if (s.actor !== p.memberId) throw new Error('需要档案本人确认保存。');
    if (p.status === '冲突待核对' && !conflictResolved) throw new Error('请先核对冲突，再选择更正原记录。');
    const updateId = p.updateId ?? (conflictResolved ? p.conflictId : undefined);
    const old = updateId ? s.records.find(r => r.id === updateId && r.memberId === p.memberId) : undefined;
    if (updateId && !old) throw new Error('原记录已不存在，请重新核对。');
    const record: HealthRecord = { id: old?.id ?? uid(), memberId: p.memberId, kind: p.kind, text: p.text, source: p.source,
      confirmedAt: stamp(), history: old ? [...old.history, { text: old.text, at: old.confirmedAt, actor: s.actor }] : [],
      metric: p.metric ?? old?.metric, medication: p.medication ?? old?.medication };
    const duplicate = !old && s.records.some(r => r.memberId === p.memberId && r.text === p.text);
    return { ...s, pending: s.pending.filter(item => item.id !== id), records: duplicate ? s.records : [...s.records.filter(r => r.id !== record.id), record] };
  },
  dismiss(s, id) {
    const p = s.pending.find(p => p.id === id); if (!p) return s;
    requireDraft(s, p.memberId);
    if (s.actor !== p.memberId && s.actor !== p.author) throw new Error('只能撤回自己整理的条目。');
    return { ...s, pending: s.pending.filter(p => p.id !== id) };
  },
  edit(s, id, text) {
    const p = s.pending.find(p => p.id === id); if (!p) throw new Error('找不到待确认条目。');
    requireDraft(s, p.memberId);
    if (s.actor !== p.memberId && s.actor !== p.author) throw new Error('只能修改自己整理的条目。');
    if (!text.trim()) throw new Error('内容不能为空。');
    if (p.metric) throw new Error('指标请使用数值核对入口修改。');
    if (p.medication) throw new Error('用药请使用结构化字段核对入口修改。');
    return { ...s, pending: s.pending.map(item => item.id === id ? { ...item, text: text.trim() } : item) };
  },
};
export function medicationText(m: NonNullable<HealthRecord['medication']>) {
  return `${m.name}：${m.frequency}，每次${m.dose}，${m.start}开始${m.end ? `，${m.end}结束使用` : '，当前使用'}。虚构药物，具体药理未知。`;
}
export function correctMedication(s: State, id: string, medication: NonNullable<HealthRecord['medication']>): State {
  const p = s.pending.find(p => p.id === id);
  if (!p?.medication) throw new Error('找不到用药草稿。');
  requireDraft(s, p.memberId);
  if (s.actor !== p.memberId && s.actor !== p.author) throw new Error('只能修改自己整理的用药草稿。');
  if (!medication.name.trim() || !medication.dose.trim() || !medication.frequency.trim()) throw new Error('请补全药名、剂量与频次。');
  const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  if (!validDate(medication.start) || (medication.end && (!validDate(medication.end) || medication.end < medication.start))) throw new Error('请核对开始与结束日期。');
  return { ...s, pending: s.pending.map(item => item.id === id ? { ...item, medication, text: medicationText(medication) } : item) };
}
export function grant(s: State, viewer: MemberId, level: GrantLevel | null): State {
  if (viewer === s.actor) throw new Error('不能授权给自己。');
  const grants = s.grants.filter(g => !(g.owner === s.actor && g.viewer === viewer));
  if (level) grants.push({ owner: s.actor, viewer, level });
  return { ...s, grants };
}
export function switchAccount(s: State, actor: MemberId): State { return { ...s, actor, selected: actor }; }
export function selectMember(s: State, owner: MemberId): State { requireView(s, owner); return { ...s, selected: owner }; }
export interface ReportService { importSample(s: State, owner: MemberId, variant: '标准' | '冲突'): State; correctMetric(s: State, id: string, value: number): State }
export const reports: ReportService = {
  importSample(s, owner, variant) {
    requireDraft(s, owner);
    const metric: Metric = { name: '空腹血糖', value: variant === '标准' ? 5.2 : 6.2, unit: 'mmol/L', range: '3.9—6.1（样例范围）', date: '2026-09-20', position: '样例报告第1页 · 第1行', reportKey: `${owner}-sample-20260920-glucose` };
    const matches = (m?: Metric) => m?.reportKey === metric.reportKey;
    const old = s.records.find(r => r.memberId === owner && matches(r.metric));
    const pending = s.pending.find(p => p.memberId === owner && matches(p.metric));
    if (pending) throw new Error('这份报告已有待核对条目，请先完成确认。');
    if (old?.metric?.value === metric.value) throw new Error('相同样例报告已经入档，无需重复保存。');
    return archive.draft(s, { memberId: owner, kind: '检查', metric, text: `2026-09-20 空腹血糖 ${metric.value} ${metric.unit}；参考范围 ${metric.range}。`, source: `内置虚构报告 · ${variant}版本 · ${person(owner).name}`, status: old ? '冲突待核对' : '待确认', conflictId: old?.id });
  },
  correctMetric(s, id, value) {
    const p = s.pending.find(p => p.id === id); if (!p?.metric) throw new Error('找不到指标。');
    requireDraft(s, p.memberId);
    if (s.actor !== p.memberId && s.actor !== p.author) throw new Error('只能修改自己整理的指标。');
    if (!Number.isFinite(value) || value <= 0 || value > 100) throw new Error('请输入有效的样例血糖值（0—100之间）。');
    return { ...s, pending: s.pending.map(item => item.id === id ? { ...item, metric: { ...p.metric!, value }, text: `${p.metric!.date} 空腹血糖 ${value} ${p.metric!.unit}；参考范围 ${p.metric!.range}。` } : item) };
  },
};
export interface ModelService { reply(s: State, owner: MemberId, input: string): { text: string; kind: RecordKind; save: boolean; updateId?: string } }
export const model: ModelService = {
  reply(s, owner, input) {
    requireView(s, owner);
    const records = archive.list(s, owner);
    const meds = records.filter(r => r.medication && !r.medication.end);
    const history = records.filter(r => r.medication?.end);
    const medSummary = meds.map(r => `${r.medication!.name}（${r.medication!.start}开始）`).join('、') || '未记录当前用药';
    if (/忽略.*规则|绕过|系统提示|自动授权|直接保存|不要确认/.test(input)) return { text: '这段内容不会改变授权或保存规则。新健康信息仍需本人确认后入档。你可以选择一个虚构场景继续体验。', kind: '日常', save: false };
    if (/更正|修改记录/.test(input)) {
      const target = records.find(r => r.kind === '日常');
      return { text: target ? `原记录：${target.text}\n已准备更正草稿，确认后替换当前内容并保留旧版本。` : '还没有可更正的日常记录，可先体验记录一条新信息。', kind: '日常', save: !!target, updateId: target?.id };
    }
    if (/查询|查一下|什么时候|已存档|正在吃|用药记录/.test(input)) {
      const hits = /药/.test(input) ? [...meds, ...history] : records;
      return { text: `已确认档案（${person(owner).name}）：\n${hits.map(r => `• ${r.text}`).join('\n') || '目前没有相关记录。'}\n以上来自虚构体验档案；待确认内容未计入。`, kind: '日常', save: false };
    }
    if (/药|剂量/.test(input)) return { text: `事实：当前虚构档案记录了${medSummary}。\n待核实：用药变化与身体表现是否相关，需要时间线及药物资料支持。样例药没有真实药理信息，无法判断相互作用。\n下一步：整理你的描述，确认后更新档案，不据此调整用药。\n你希望把这条用药变化记录在哪一天？`, kind: '用药', save: true };
    if (/资料|知识|文章|医生建议/.test(input)) return { text: '已准备知识条目。个人医生建议与一般资料需要分开，长期保存时保留出处；样例内容不能作为个人医嘱。\n这条内容来自一般文章，还是医生对你的个人建议？', kind: '知识', save: true };
    return { text: `事实：你描述了近期身体或生活变化；当前档案用药为${medSummary}。\n可能性：活动负荷、恢复和用药时间值得一起观察，但仅凭这段描述不能确定原因。\n未知：目前缺少日常功能变化和具体药物资料。此为模拟回答，不是医疗评估。\n你更想先记录身体感受，还是日常活动的变化？`, kind: '日常', save: true };
  },
};
export function sendMessage(s: State, owner: MemberId, input: string): State {
  requireView(s, owner);
  if (!input.trim()) return s;
  // Simulation never executes instructions from a conversation as tool calls.
  const result = model.reply(s, owner, input);
  const at = stamp();
  let next = { ...s, messages: [...s.messages,
    { id: uid(), memberId: owner, author: s.actor, role: 'user' as const, text: input.trim(), at },
    { id: uid(), memberId: owner, author: s.actor, role: 'assistant' as const, text: result.text, at }],
  };
  if (result.save && permissions.canDraft(s, owner)) {
    const text = result.updateId ? input.replace(/^.*?(更正|修改记录)[：:，,\s]*/, '').trim() || input : input.trim();
    const knownMedication = result.kind === '用药' ? s.records.find(r => r.memberId === owner && r.medication && input.includes(r.medication.name)) : undefined;
    let medication = knownMedication?.medication ? { ...knownMedication.medication } : undefined;
    if (medication && /停用|结束使用/.test(input)) {
      const match = input.match(/(\d{1,2})月(\d{1,2})日/);
      if (match) medication.end = `2026-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    }
    const source = result.kind === '知识' ? (input.includes('医生') ? '虚构体验 · 个人医生建议样例（尚未核验）' : '虚构体验 · 一般资料样例（尚未核验）') : `虚构体验聊天 · ${person(s.actor).name}整理`;
    next = archive.draft(next, { memberId: owner, kind: result.kind, text: medication ? medicationText(medication) : text, source, status: '待确认', updateId: knownMedication?.id ?? result.updateId, medication });
  }
  return next;
}
export interface NotificationService { generate(s: State, owner: MemberId, type: Brief['type']): State }
export const notifications: NotificationService = {
  generate(s, owner, type) {
    requireView(s, owner);
    if (s.actor !== owner) throw new Error('只能为自己生成问候或周报。');
    const rows = archive.list(s, owner);
    const waiting = s.pending.filter(p => p.memberId === owner);
    const last = rows.filter(r => r.kind === '日常').at(-1);
    const text = type === '每日' ? `早上好，${person(owner).name}。${last ? '上次确认的日常记录是：' + last.text : '目前没有已确认的近况。'}\n今天身体感觉怎么样？` :
      `目的\n${person(owner).goal}\n\n已存档 · ${rows.length}条\n${rows.map(r => '• ' + r.text).join('\n')}\n\n待确认 · ${waiting.length}条\n${waiting.map(p => '• ' + p.text).join('\n') || '暂无待确认内容。'}\n\n规则\n本人确认后入档；一次问一个问题；不自动调整用药；未回复不生成健康状态或服药记录。\n\n开放问题\n${last ? '近期日常活动的感受有没有变化？' : '你希望先从哪一类健康信息开始？'}\n\n待办\n${waiting.length ? '核对待确认内容。' : '按需补充近况，无需固定打卡。'}\n\n本周变化\n本简报为当前档案快照，尚无可靠的上周对照，不推断改善或恶化。`;
    return { ...s, briefs: [...s.briefs, { id: uid(), memberId: owner, type, createdAt: stamp(), text }] };
  },
};
export const STORAGE_KEY = 'changan-demo-v1';
export interface StorageService { load(): State; save(state: State): void; reset(): State }
function validState(value: unknown): value is State {
  if (!value || typeof value !== 'object') return false;
  const s = value as State;
  const validMember = (id: unknown) => members.some(m => m.id === id);
  if (s.version !== 1 || !validMember(s.actor) || !validMember(s.selected) ||
    !['grants', 'records', 'pending', 'messages', 'briefs'].every(key => Array.isArray((s as unknown as Record<string, unknown>)[key]))) return false;
  const validRow = (r: HealthRecord | Pending) => r && validMember(r.memberId) && typeof r.id === 'string' &&
    typeof r.text === 'string' && typeof r.source === 'string' && ['日常', '用药', '检查', '知识'].includes(r.kind) &&
    (!r.metric || (Number.isFinite(r.metric.value) && ['name', 'unit', 'range', 'date', 'position', 'reportKey'].every(k => typeof (r.metric as unknown as Record<string, unknown>)[k] === 'string'))) &&
    (!r.medication || ['name', 'dose', 'frequency', 'start'].every(k => typeof (r.medication as unknown as Record<string, unknown>)[k] === 'string'));
  return s.records.every(r => validRow(r) && Array.isArray(r.history) && r.history.every(h => typeof h.text === 'string' && validMember(h.actor) && !Number.isNaN(Date.parse(h.at))) && !Number.isNaN(Date.parse(r.confirmedAt))) &&
    s.pending.every(p => validRow(p) && validMember(p.author) && ['待确认', '冲突待核对'].includes(p.status) && !Number.isNaN(Date.parse(p.createdAt))) &&
    s.grants.every(g => g && validMember(g.owner) && validMember(g.viewer) && ['查看', '协助整理'].includes(g.level)) &&
    s.messages.every(m => m && validMember(m.memberId) && validMember(m.author) && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string' && !Number.isNaN(Date.parse(m.at))) &&
    s.briefs.every(b => b && validMember(b.memberId) && ['每日', '每周'].includes(b.type) && typeof b.text === 'string' && !Number.isNaN(Date.parse(b.createdAt)));
}
export const storage: StorageService = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return seed();
    let value: unknown; try { value = JSON.parse(raw); } catch { throw new Error('本地体验资料无法读取，请在设置中重置。'); }
    if (!validState(value)) throw new Error('本地体验资料版本不兼容，请在设置中重置。');
    if (!permissions.canView(value, value.selected)) value.selected = value.actor;
    return value;
  },
  save: state => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)),
  reset() { const next = seed(); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return next; },
};
export function exportMember(s: State, owner: MemberId, format: 'json' | 'md'): string {
  requireView(s, owner);
  const data = { prototype: true, member: person(owner), records: archive.list(s, owner), pending: s.pending.filter(p => p.memberId === owner), messages: s.messages.filter(m => m.memberId === owner), briefs: s.briefs.filter(b => b.memberId === owner) };
  if (format === 'json') return JSON.stringify(data, null, 2);
  return `# ${person(owner).name} · 虚构体验档案\n\n仅为原型数据，不是医疗记录。\n\n## 已确认\n\n${data.records.map(r => `### ${r.kind}\n${r.text}\n\n来源：${r.source}\n确认时间：${r.confirmedAt}\n历史：${r.history.map(h => h.text).join('；') || '无'}`).join('\n\n')}\n\n## 待确认（不是档案事实）\n\n${data.pending.map(p => p.text).join('\n\n') || '无'}\n\n## 简报\n\n${data.briefs.map(b => b.text).join('\n\n') || '无'}`;
}
