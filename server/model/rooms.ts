// Salas do escritório: identidade (cwd normalizado), nome exibido e posição (slot) no prédio.

/** cwd normalizado: sem barras repetidas nem barra final. */
/**
 * Filtro de pastas (HABBLAUD_ONLY_DIRS): só entram no escritório as sessões cuja pasta é uma das listadas ou fica
 * dentro de uma delas. Compara sem diferenciar maiúsculas nem o tipo de barra (caminhos do Windows).
 */
export function pathFilter(dirs: readonly string[]): (cwd: string) => boolean {
  const roots = dirs.map(pathKey).filter(Boolean);
  return (cwd) => {
    const c = pathKey(cwd);
    return roots.some((r) => c === r || c.startsWith(`${r}/`));
  };
}

/** Chave para comparar pastas: barras "/", sem barra no fim, minúsculas (o Windows não diferencia). */
export function pathKey(p: string): string {
  return p.trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/\/+$/, '').toLowerCase();
}

/** Sala fixa (HABBLAUD_FIXED_ROOMS): existe sempre, mesmo vazia, com nome próprio. */
export interface FixedRoom {
  path: string;
  name?: string;
  /** Slot fixo, quando HABBLAUD_FIXED_ROOMS divide o prédio em dois blocos com "|". */
  slot?: number;
}

/**
 * Lê HABBLAUD_FIXED_ROOMS: entradas separadas por ";" no formato "Nome=pasta" (ou só "pasta", que usa o nome
 * da pasta). O "=" é procurado só antes do caminho começar, então pastas com "=" no nome continuam válidas.
 */
export function parseFixedRooms(raw: string | undefined): FixedRoom[] {
  const entries = (raw ?? '')
    .split(';')
    .map((e) => e.trim())
    .filter(Boolean);
  // "|" sozinho separa os blocos do prédio: as salas antes dele ficam no bloco oeste (slots 0, 1, 2...)
  // e as depois no bloco leste (EAST_SLOT_BASE, +1...), com a área comum no meio
  const split = entries.indexOf('|');
  let west = 0;
  let east = 0;
  const out: FixedRoom[] = [];
  for (const [i, e] of entries.entries()) {
    if (e === '|') continue;
    const m = /^([^=\\/:]+)=(.+)$/.exec(e);
    const room: FixedRoom = m ? { name: m[1].trim(), path: m[2].trim() } : { path: e };
    if (!room.path) continue;
    if (split >= 0) room.slot = i < split ? west++ : EAST_SLOT_BASE + east++;
    out.push(room);
  }
  return out;
}

/** Primeiro slot do bloco leste do prédio (o cliente usa o mesmo número em layout/geometry.ts). */
export const EAST_SLOT_BASE = 1000;

export function normalizeCwd(cwd: string): string {
  const p = cwd.trim().replace(/\/{2,}/g, '/');
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

function segments(path: string): string[] {
  return path.split(/[\\/]+/).filter(Boolean);
}

/**
 * Nome de cada sala: o basename do caminho; salas com o mesmo basename ganham o(s) diretório(s)
 * pai até ficarem distintas (ex.: "applications/app" e "outro/app").
 */
export function roomDisplayNames(rooms: ReadonlyMap<string, string>): Map<string, string> {
  const segs = new Map([...rooms].map(([id, path]) => [id, segments(path)]));
  const depth = new Map([...rooms.keys()].map((id) => [id, 1]));
  const nameOf = (id: string) => {
    const s = segs.get(id)!;
    return s.length ? s.slice(-depth.get(id)!).join('/') : rooms.get(id) || '/';
  };
  for (let guard = 0; guard < 16; guard++) {
    const groups = new Map<string, string[]>();
    for (const id of rooms.keys()) {
      const n = nameOf(id);
      groups.set(n, [...(groups.get(n) ?? []), id]);
    }
    let grew = false;
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        if (depth.get(id)! < segs.get(id)!.length) {
          depth.set(id, depth.get(id)! + 1);
          grew = true;
        }
      }
    }
    if (!grew) break;
  }
  return new Map([...rooms.keys()].map((id) => [id, nameOf(id)]));
}

/**
 * Distribui slots: a sala nova pega o menor slot livre que não esteja em espera.
 * Um slot liberado só volta a ser usado após `cooldownMs` (tempo da animação de saída).
 */
export class SlotAllocator {
  private slots = new Map<string, number>();
  private freedAt = new Map<number, number>();
  /** Salas com slot reservado (salas fixas de um prédio em dois blocos). */
  private pinned = new Map<string, number>();

  constructor(private readonly cooldownMs = 30_000) {}

  pin(id: string, slot: number): void {
    this.pinned.set(id, slot);
  }

  /** Ajusta as alocações ao conjunto atual de salas. Devolve true se algo mudou. */
  sync(ids: Iterable<string>, now: number, eastOf: (id: string) => boolean = () => false): boolean {
    const live = new Set(ids);
    let changed = false;
    for (const [id, slot] of [...this.slots]) {
      if (live.has(id)) continue;
      this.slots.delete(id);
      this.freedAt.set(slot, now);
      changed = true;
    }
    for (const id of live) {
      if (this.slots.has(id)) continue;
      this.slots.set(id, this.pinned.get(id) ?? this.firstFree(now, eastOf(id)));
      changed = true;
    }
    return changed;
  }

  slotOf(id: string): number | undefined {
    return this.slots.get(id);
  }

  private firstFree(now: number, east = false): number {
    const used = new Set([...this.slots.values(), ...this.pinned.values()]);
    for (let slot = east ? EAST_SLOT_BASE : 0; ; slot++) {
      if (used.has(slot)) continue;
      const freed = this.freedAt.get(slot);
      if (freed !== undefined && now - freed < this.cooldownMs) continue;
      this.freedAt.delete(slot);
      return slot;
    }
  }
}
