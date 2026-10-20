import { archive, permissions, person, type MemberId, type State } from './domain';
export interface AIStatus { plan: string; viaProxy: boolean; models: { id: string; name: string; isDefault: boolean }[] }
export interface AIReply { text: string; model: string }
export interface ChatAttachment { id: string; name: string; kind: string; size: number }
export interface AIBridge { pickAttachments?(): Promise<ChatAttachment[]>; removeAttachments?(ids: string[]): Promise<void>; clearPersonalDraft?(): Promise<void>; status(): Promise<AIStatus>; personalDraft?(): Promise<Partial<import('./personal').ProfileInput>>; chat(input: { text: string; context: string; model: string; dataMode?: 'personal'; attachmentIds?: string[] }): Promise<AIReply> }
export function aiContext(s: State, owner: MemberId): string {
  if (!permissions.canView(s, owner)) throw new Error('无权读取该成员资料。');
  return JSON.stringify({ dataMode: s.dataMode || 'demo', member: person(owner, s).name, goal: person(owner, s).goal,
    confirmed: archive.list(s, owner).slice(-25).map(r => ({ kind: r.kind, text: r.text, source: r.source, confirmedAt: r.confirmedAt })),
    pending: s.dataMode === 'personal' ? [] : s.pending.filter(p => p.memberId === owner).slice(-10).map(p => ({ status: '尚未确认，不是事实', text: p.text })),
    conversation: s.messages.filter(m => m.memberId === owner).slice(-8).map(m => ({ role: m.role, text: m.text, provider: m.provider || 'mock', attachments: m.attachments?.map(a => ({ name: a.name, note: '附件内容不在本次上下文，请需要时重新添加' })) })),
  }).slice(0, 24000);
}
export function appendAIReply(s: State, owner: MemberId, input: string, reply: AIReply, attachments: ChatAttachment[] = []): State {
  if (!permissions.canView(s, owner)) throw new Error('该成员授权已撤回。');
  const at = new Date().toISOString();
  return { ...s, messages: [...s.messages,
    { id: crypto.randomUUID(), memberId: owner, author: s.actor, role: 'user', text: input.trim(), attachments: attachments.map(({name,kind,size}) => ({name,kind,size})), at, provider: 'codex' },
    { id: crypto.randomUUID(), memberId: owner, author: s.actor, role: 'assistant', text: reply.text, at, provider: 'codex', model: reply.model },
  ] };
}
