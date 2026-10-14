import { describe, expect, it } from 'vitest';
import { setQuiet } from '../log';
import { NameStore } from './names';
import { Office } from './office';
import { pathFilter } from './rooms';

setQuiet(true);

describe('pathFilter (HABBLAUD_ONLY_DIRS)', () => {
  const allow = pathFilter(['C:\\Users\\Ana\\CorteLab', '/home/ana/outra/']);

  it('aceita a própria pasta e as de dentro, sem diferenciar barra nem maiúsculas', () => {
    expect(allow('C:\\Users\\Ana\\CorteLab')).toBe(true);
    expect(allow('C:\\Users\\Ana\\CorteLab\\cortador')).toBe(true);
    expect(allow('c:/users/ana/cortelab/redator/')).toBe(true);
    expect(allow('/home/ana/outra/sub')).toBe(true);
  });

  it('recusa pastas de fora, inclusive as que só começam com o mesmo nome', () => {
    expect(allow('C:\\Users\\Ana\\Pro nerd')).toBe(false);
    expect(allow('C:\\Users\\Ana\\CorteLab2')).toBe(false);
    expect(allow('C:\\Users\\Ana')).toBe(false);
  });
});

describe('Office com filtro de pastas', () => {
  it('só cria sala para as sessões das pastas escolhidas', () => {
    const office = new Office({
      names: new NameStore(null),
      version: 't',
      startedAt: 0,
      accounts: () => [],
      sources: () => [],
      accountName: () => undefined,
      allowCwd: pathFilter(['/p/cortelab']),
      now: () => 1_000,
    });
    const base = { account: 'acc', role: 'x', startedAt: 0, status: 'working' as const };
    office.addMain({ ...base, id: 'acc:1', sessionId: 's1', cwd: '/p/cortelab/cortador' });
    office.addMain({ ...base, id: 'acc:2', sessionId: 's2', cwd: '/p/pro-nerd' });
    // Chamadas para a sessão barrada são ignoradas sem erro.
    office.setStatus('acc:2', 'waiting', 'responder');
    expect(office.has('acc:1')).toBe(true);
    expect(office.has('acc:2')).toBe(false);
    expect(office.commit().snapshot.rooms.map((r) => r.name)).toEqual(['cortador']);
  });
});
