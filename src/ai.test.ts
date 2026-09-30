import { describe, it, expect } from 'vitest';
import { aiContext, appendAIReply } from './ai';
import { seed, grant, switchAccount } from './domain';

describe('ChatGPT 订阅与成员档案', () => {
  it('仅发送当前成员的上下文', () => {
    const s = seed(); const context = JSON.parse(aiContext(s, 'lin'));
    expect(context.member).toBe('林安');
    expect(context.confirmed.map((r: { text: string }) => r.text)).toEqual(s.records.filter(r => r.memberId === 'lin').map(r => r.text));
    expect(() => aiContext(s, 'zhou')).toThrow('无权');
  });
  it('即使模型声称已保存，也不能改变档案或产生待确认条目', () => {
    const s = seed(); const next = appendAIReply(s, 'lin', '虚构：散步20分钟', { text: '已保存用药记录。', model: 'test-model' });
    expect(next.records).toEqual(s.records); expect(next.pending).toEqual(s.pending);
    expect(next.messages.slice(-2).every(m => m.memberId === 'lin' && m.provider === 'codex')).toBe(true);
  });
  it('撤回共享后拒绝读取上下文和保存回答', () => {
    let s = switchAccount(seed(), 'zhou'); s = grant(s, 'lin', '查看'); s = switchAccount(s, 'lin');
    expect(JSON.parse(aiContext(s, 'zhou')).member).toBe('周宁');
    s = switchAccount(s, 'zhou'); s = grant(s, 'lin', null); s = switchAccount(s, 'lin');
    expect(() => appendAIReply(s, 'zhou', '查询', { text: '回答', model: 'test' })).toThrow('撤回');
  });
});
