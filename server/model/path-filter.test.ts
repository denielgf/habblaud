import { describe, expect, it } from 'vitest';
import { setQuiet } from '../log';
import { NameStore } from './names';
import { Office } from './office';
import { parseFixedRooms, pathFilter } from './rooms';

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

describe('salas fixas (HABBLAUD_FIXED_ROOMS)', () => {
  it('lê "Nome=pasta" e "pasta", separados por ;', () => {
    expect(parseFixedRooms('Diretoria=C:\\a\\diretor; C:\\a\\cortador ;;Métricas=/p/analista')).toEqual([
      { name: 'Diretoria', path: 'C:\\a\\diretor' },
      { path: 'C:\\a\\cortador' },
      { name: 'Métricas', path: '/p/analista' },
    ]);
    expect(parseFixedRooms(undefined)).toEqual([]);
  });

  it('existem vazias, na ordem dada, com o nome escolhido, e não somem quando o agente sai', () => {
    let clock = 1_000;
    const office = new Office({
      names: new NameStore(null),
      version: 't',
      startedAt: 0,
      accounts: () => [],
      sources: () => [],
      accountName: () => undefined,
      fixedRooms: parseFixedRooms('Diretoria=C:\\Ag\\diretor;Ilha de edição=C:\\Ag\\cortador'),
      now: () => clock,
    });
    let rooms = office.commit().snapshot.rooms;
    expect(rooms.map((r) => r.name)).toEqual(['Diretoria', 'Ilha de edição']);
    expect(rooms.map((r) => r.slot)).toEqual([0, 1]);

    // A sessão chega com o caminho escrito de outro jeito e entra na sala fixa, sem criar outra.
    office.addMain({ id: 'acc:1', account: 'acc', sessionId: 's1', cwd: 'c:/ag/cortador/', role: 'x', startedAt: 0, status: 'working' });
    rooms = office.commit().snapshot.rooms;
    expect(rooms).toHaveLength(2);
    expect(office.get('acc:1')!.roomId).toBe(rooms[1].id);

    // Sai e o período de graça passa: a sala continua.
    office.closeMain('acc:1');
    clock += 24 * 60 * 60 * 1000;
    office.tick();
    expect(office.has('acc:1')).toBe(false);
    expect(office.commit().snapshot.rooms.map((r) => r.name)).toEqual(['Diretoria', 'Ilha de edição']);
  });
});
