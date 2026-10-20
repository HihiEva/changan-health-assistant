import { describe, it, expect, vi, afterEach } from 'vitest';
import { draftProfile, emptyProfile, personalSeed, confirmAllProfile, personalStorage } from './personal';
import { aiContext } from './ai';
import { reports, seed, storage, switchAccount, grant, exportMember } from './domain';
afterEach(() => vi.unstubAllGlobals());
describe('独立个人资料', () => {
  it('空白档案没有样例；未填写用药保留未知，待确认不发送模型', () => {
    const s = draftProfile(personalSeed(), { ...emptyProfile(), age: '41', symptoms: '测试描述，尚未确认' });
    expect(s.records).toHaveLength(0); expect(s.pending.find(p => p.source.endsWith('medications'))?.text).toBe('当前用药 / 保健品：未说明');
    expect(aiContext(s, 'lin')).not.toContain('测试描述'); expect(aiContext(s, 'lin')).not.toContain('体验药');
    const confirmed = confirmAllProfile(s); expect(confirmed.records).toHaveLength(8); expect(aiContext(confirmed, 'lin')).toContain('测试描述');
    expect(exportMember(confirmed, 'lin', 'md')).toContain('个人档案');
  });
  it('样例导入、体验账号切换和家庭授权不能影响个人档案', () => {
    const s = personalSeed(); expect(() => reports.importSample(s, 'lin', '标准')).toThrow('样例');
    expect(() => switchAccount(s, 'zhou')).toThrow('体验'); expect(() => grant(s, 'zhou', '查看')).toThrow('共享');
  });
  it('修改后确认只更新相应字段并保留历史', () => {
    const s = confirmAllProfile(draftProfile(personalSeed(), { ...emptyProfile(), age: '41' }));
    const updated = confirmAllProfile(draftProfile(s, { ...emptyProfile(), age: '42' }));
    expect(updated.records).toHaveLength(8); expect(updated.records.find(r => r.source.endsWith('age'))?.history).toHaveLength(1);
  });
  it('个人与演示分别持久化；演示重置不删除个人资料', () => {
    const data = new Map(); vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key,value) });
    const s = confirmAllProfile(draftProfile(personalSeed(), { ...emptyProfile(), age: '41' }));
    personalStorage.save(s); storage.save(seed()); storage.reset(); expect(personalStorage.load()).toEqual(s);
    personalStorage.reset(); expect(storage.load().records.length).toBeGreaterThan(0);
  });
});
