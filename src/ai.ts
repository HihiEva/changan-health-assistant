import { archive, permissions, person, type MemberId, type State } from './domain';
export interface AIStatus { plan: string; viaProxy: boolean; models: { id: string; name: string; isDefault: boolean }[] }
export interface AIReply { text: string; model: string }
export interface AIBridge { status(): Promise<AIStatus>; chat(input: { text: string; context: string; model: string }): Promise<AIReply> }
export function aiContext(s: State, owner: MemberId): string {
  if (!permissions.canView(s, owner)) throw new Error('无权读取该成员资料。');
  return JSON.stringify({ member: person(owner).name, goal: person(owner).goal,
    confirmed: archive.list(s, owner).slice(-25).map(r => ({ kind: r.kind, text: r.text, source: r.source, confirmedAt: r.confirmedAt })),
    pending: s.pending.filter(p => p.memberId === owner).slice(-10).map(p => ({ status: '尚未确认，不是事实', text: p.text })),
    conversation: s.messages.filter(m => m.memberId === owner).slice(-8).map(m => ({ role: m.role, text: m.text, provider: m.provider || 'mock' })),
  }).slice(0, 24000);
}
export function appendAIReply(s: State, owner: MemberId, input: string, reply: AIReply): State {
  if (!permissions.canView(s, owner)) throw new Error('该成员授权已撤回。');
  const at = new Date().toISOString();
  return { ...s, messages: [...s.messages,
    { id: crypto.randomUUID(), memberId: owner, author: s.actor, role: 'user', text: input.trim(), at, provider: 'codex' },
    { id: crypto.randomUUID(), memberId: owner, author: s.actor, role: 'assistant', text: reply.text, at, provider: 'codex', model: reply.model },
  ] };
}
