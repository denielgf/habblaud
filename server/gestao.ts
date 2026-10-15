// Aba Gestão da CorteLab: aprovar/recusar cortes, corrigir palavras da legenda e ver a esteira, sem acordar agente.
// Só liga quando CORTELAB_DIR aponta para a pasta da agência; toda a lógica fica em ferramentas/gestao.py.
import { execFile } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve, sep } from 'node:path';
import { readJson, sendJson } from './http/app';
import { GESTAO_PAGE } from './gestao-page';

type Handler = (req: IncomingMessage, res: ServerResponse, url: URL) => boolean;

export function createGestaoHandler(dir: string | undefined): Handler | undefined {
  if (!dir || !existsSync(join(dir, 'ferramentas', 'gestao.py'))) return undefined;
  const root = resolve(dir);
  const python = join(root, '.venv', 'Scripts', 'python.exe');
  const tool = join(root, 'ferramentas', 'gestao.py');

  function run(args: string[]): Promise<{ status: number; body: unknown }> {
    return new Promise((done) => {
      execFile(python, [tool, ...args], { cwd: join(root, 'ferramentas'), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 15 * 60_000 },
        (err, stdout, stderr) => {
          try {
            const body = JSON.parse(stdout.trim().split('\n').pop() ?? '');
            done({ status: err ? 400 : 200, body });
          } catch {
            done({ status: 500, body: { erro: 'gestao.py não respondeu', detalhe: (stderr || stdout || String(err)).slice(-800) } });
          }
        });
    });
  }

  function video(req: IncomingMessage, res: ServerResponse, rel: string): void {
    const file = resolve(root, rel);
    if (!file.startsWith(root + sep) || !file.toLowerCase().endsWith('.mp4') || !existsSync(file)) {
      sendJson(res, 404, { erro: 'vídeo não encontrado' });
      return;
    }
    const size = statSync(file).size;
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    let start = 0;
    let end = size - 1;
    if (m) {
      if (m[1]) start = Number(m[1]);
      if (m[2]) end = Math.min(Number(m[2]), size - 1);
      if (!m[1] && m[2]) start = Math.max(0, size - Number(m[2]));
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
        return;
      }
    }
    res.writeHead(m ? 206 : 200, {
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Cache-Control': 'no-store',
      ...(m ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
    });
    createReadStream(file, { start, end }).pipe(res);
  }

  return (req, res, url) => {
    const p = url.pathname;
    if (p === '/gestao' || p === '/gestao/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(GESTAO_PAGE);
      return true;
    }
    if (!p.startsWith('/api/gestao/')) return false;
    if (p === '/api/gestao/video' && req.method === 'GET') {
      video(req, res, url.searchParams.get('p') ?? '');
      return true;
    }
    if (p === '/api/gestao/estado' && req.method === 'GET') {
      void run(['estado']).then((r) => sendJson(res, r.status, r.body));
      return true;
    }
    if (p === '/api/gestao/acao' && req.method === 'POST') {
      void readJson(req)
        .then((raw) => {
          const b = (raw ?? {}) as { acao?: string; campanha?: string; id?: string; motivo?: string; trocas?: unknown };
          const camp = String(b.campanha ?? '');
          const id = String(b.id ?? '');
          if (!camp || !id) return { status: 400, body: { erro: 'faltou campanha ou corte' } };
          if (b.acao === 'aprovar') return run(['aprovar', camp, id]);
          if (b.acao === 'recusar') return run(['recusar', camp, id, String(b.motivo ?? '')]);
          if (b.acao === 'corrigir' && Array.isArray(b.trocas) && b.trocas.length) return run(['corrigir', camp, id, JSON.stringify(b.trocas)]);
          return { status: 400, body: { erro: 'ação inválida' } };
        })
        .then((r) => sendJson(res, r.status, r.body))
        .catch(() => sendJson(res, 400, { erro: 'pedido inválido' }));
      return true;
    }
    sendJson(res, 404, { erro: 'rota desconhecida' });
    return true;
  };
}
