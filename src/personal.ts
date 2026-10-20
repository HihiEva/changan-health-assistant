import { archive, validState, type State } from './domain';
export const PERSONAL_KEY = 'changan-personal-v1';
export const MODE_KEY = 'changan-data-mode';
export const profileFields = [
  ['age', '年龄'], ['sex', '性别'], ['goal', '主要目标'], ['conditions', '自述已确诊情况'],
  ['medications', '当前用药 / 保健品'], ['allergies', '过敏或敏感反应'], ['symptoms', '近期身体情况'], ['checks', '近期检查'],
] as const;
export type ProfileInput = Record<typeof profileFields[number][0], string>;
export const emptyProfile = (): ProfileInput => Object.fromEntries(profileFields.map(([key]) => [key, ''])) as ProfileInput;
export function personalSeed(): State { return { version: 1, dataMode: 'personal', actor: 'lin', selected: 'lin', records: [], pending: [], messages: [], briefs: [], grants: [] }; }
export function profileInput(s: State): ProfileInput {
  const input = emptyProfile();
  for (const [key, label] of profileFields) {
    const source = `本人自述 · ${key}`;
    const row = s.pending.find(p => p.source === source) || s.records.find(r => r.source === source);
    if (row) input[key] = row.text.slice(label.length + 1).trim();
  }
  return input;
}
export function draftProfile(s: State, input: ProfileInput): State {
  if (s.dataMode !== 'personal') throw new Error('请先进入个人档案。');
  if (input.age.trim() && (!/^\d+$/.test(input.age.trim()) || Number(input.age) > 120)) throw new Error('年龄请填写 0–120 之间的整数，或留空。');
  let next = { ...s, pending: s.pending.filter(p => !p.source.startsWith('本人自述 · ')) };
  for (const [key, label] of profileFields) {
    if (input[key].length > 2500) throw new Error(`${label}内容过长。`);
    const source = `本人自述 · ${key}`, old = s.records.find(r => r.source === source);
    const text = `${label}：${input[key].trim() || '未说明'}`;
    if (old?.text === text) continue;
    next = archive.draft(next, { memberId: 'lin', kind: key === 'medications' ? '用药' : key === 'checks' ? '检查' : '日常', text, source, status: '待确认', updateId: old?.id });
  }
  return next;
}
export function confirmAllProfile(s: State): State {
  return s.pending.filter(p => p.source.startsWith('本人自述 · ')).reduce((next, p) => archive.confirm(next, p.id), s);
}
// Separate browser storage; never seed personal records with demonstration data.
export const personalStorage = {
  load(): State {
    const raw = localStorage.getItem(PERSONAL_KEY); if (!raw) return personalSeed();
    const s = JSON.parse(raw) as State;
    if (!validState(s) || s.version !== 1 || s.dataMode !== 'personal' || s.actor !== 'lin' || s.selected !== 'lin' || !['records','pending','messages','briefs','grants'].every(k => Array.isArray((s as unknown as Record<string, unknown>)[k])) || s.grants.length || [...s.records, ...s.pending, ...s.messages, ...s.briefs].some(r => r.memberId !== 'lin')) throw new Error('个人资料无法读取，请先导出备份并检查本地资料。');
    return s;
  },
  save(s: State) { if (s.dataMode !== 'personal') throw new Error('不能混存演示资料。'); localStorage.setItem(PERSONAL_KEY, JSON.stringify(s)); },
  reset() { const s = personalSeed(); this.save(s); return s; },
};
