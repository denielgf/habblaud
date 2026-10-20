// Selos da CorteLab: quantos cortes esperam cada setor (sala) e quantos esperam o Daniel (botão Gestão).
// Lê /api/gestao/estado (servidor com CORTELAB_DIR) a cada minuto; sem a aba Gestão no servidor, fica tudo vazio.

export interface FilaCorteLab {
  /** Cortes esperando cada setor, pelo nome da sala ("Redação": 3). */
  fila: Record<string, number>;
  /** Cortes para o Daniel aprovar ou conferir. */
  daniel: number;
}

let estado: FilaCorteLab = { fila: {}, daniel: 0 };
const ouvintes = new Set<() => void>();
let ligado = false;

async function ler(): Promise<void> {
  try {
    const r = await fetch('/api/gestao/estado', { cache: 'no-store' });
    if (!r.ok) return;
    const j = (await r.json()) as Partial<FilaCorteLab>;
    estado = { fila: j.fila ?? {}, daniel: typeof j.daniel === 'number' ? j.daniel : 0 };
    for (const f of ouvintes) f();
  } catch {
    /* servidor sem a aba Gestão ou fora do ar: mantém o último valor */
  }
}

/** Assina as mudanças (e liga a leitura periódica na primeira assinatura). */
export function onFila(cb: () => void): () => void {
  ouvintes.add(cb);
  if (!ligado) {
    ligado = true;
    void ler();
    setInterval(() => {
      if (!document.hidden) void ler();
    }, 60_000);
  }
  return () => ouvintes.delete(cb);
}

export function filaDaSala(nome: string): number {
  return estado.fila[nome] ?? 0;
}

export function filaDoDaniel(): number {
  return estado.daniel;
}
