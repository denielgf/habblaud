// Página da aba Gestão (HTML único, servido em /gestao). Fala só com /api/gestao/*.
export const GESTAO_PAGE = /* html */ `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gestão · CorteLab</title>
<style>
  :root { --bg:#14111f; --card:#1f1a2e; --line:#352d4d; --tx:#f1ecff; --mut:#a79fc2; --ok:#3ddc84; --no:#ff5c7a; --hi:#ffd23f; --ac:#ff2d95; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--tx); font:15px/1.45 system-ui, sans-serif; }
  header { display:flex; align-items:center; gap:12px; padding:14px 16px; border-bottom:1px solid var(--line); position:sticky; top:0; background:var(--bg); z-index:2; }
  header h1 { font-size:18px; margin:0; } header a { color:var(--mut); margin-left:auto; text-decoration:none; }
  main { max-width:1100px; margin:0 auto; padding:16px; }
  h2 { font-size:16px; margin:26px 0 10px; color:var(--hi); }
  .esteira { display:flex; flex-wrap:wrap; gap:8px; }
  .etapa { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:8px 12px; min-width:120px; }
  .etapa b { font-size:22px; display:block; } .etapa small { color:var(--mut); display:block; }
  .etapa.voce { border-color:var(--ac); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px; margin-bottom:14px; display:grid; grid-template-columns:260px 1fr; gap:16px; }
  @media (max-width:700px) { .card { grid-template-columns:1fr; } }
  video { width:100%; max-height:460px; background:#000; border-radius:8px; }
  .titulo { font-weight:700; margin-bottom:4px; } .mut { color:var(--mut); font-size:13px; }
  pre { white-space:pre-wrap; background:#16121f; border-radius:8px; padding:10px; max-height:300px; overflow:auto; font:13px/1.4 system-ui, sans-serif; }
  button { font:inherit; border:0; border-radius:8px; padding:8px 14px; cursor:pointer; margin:6px 6px 0 0; color:#111; font-weight:700; }
  .b-ok { background:var(--ok); } .b-no { background:var(--no); } .b-ac { background:var(--hi); }
  button:disabled { opacity:.5; cursor:wait; }
  .falas { line-height:2.1; }
  .w { padding:2px 4px; border-radius:5px; cursor:pointer; }
  .w:hover { background:var(--line); }
  .w.duv { background:#5a4a00; color:var(--hi); }
  .w.mud { background:#0f4d2c; color:var(--ok); }
  .w input { font:inherit; width:9em; background:#000; color:var(--tx); border:1px solid var(--hi); border-radius:5px; padding:1px 4px; }
  .vazio { color:var(--mut); }
  #aviso { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:var(--card); border:1px solid var(--ac); padding:10px 16px; border-radius:10px; display:none; }
</style>
</head>
<body>
<header><h1>🎬 Gestão · CorteLab</h1><a href="/">← voltar ao estúdio</a></header>
<main>
  <h2>Esteira</h2><div class="esteira" id="esteira"></div><div class="mut" id="lote"></div>
  <h2>Para você aprovar</h2><div id="aprovar"></div>
  <h2>Conferir legenda</h2>
  <p class="mut">Clique numa palavra para ouvir aquele trecho e corrigir. Amarelo = a transcrição ficou em dúvida. Deixe vazio para apagar.
  Ao salvar, o corte é gerado de novo (leva ~1 min) e volta para a Redação e a Qualidade.</p>
  <div id="conferir"></div>
  <h2>Propostas esperando o seu OK</h2><div id="propostas"></div>
</main>
<div id="aviso"></div>
<script>
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const vid = (p) => p ? '<video controls preload="metadata" src="/api/gestao/video?p=' + encodeURIComponent(p) + '&v=' + Date.now() + '"></video>' : '<div class="vazio">sem vídeo</div>';
function aviso(t, ms = 3500) { const a = $('#aviso'); a.textContent = t; a.style.display = 'block'; clearTimeout(aviso.t); if (ms) aviso.t = setTimeout(() => a.style.display = 'none', ms); }

async function acao(corpo, botoes) {
  botoes.forEach((b) => b.disabled = true);
  try {
    const r = await fetch('/api/gestao/acao', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(corpo) });
    const j = await r.json();
    if (j.erro) { aviso('Erro: ' + j.erro + (j.detalhe ? ' — ' + j.detalhe : ''), 0); return; }
    aviso('Feito ✔'); carregar();
  } catch (e) { aviso('Erro: ' + e, 0); } finally { botoes.forEach((b) => b.disabled = false); }
}

function cardAprovar(c) {
  const el = document.createElement('div'); el.className = 'card';
  el.innerHTML = '<div>' + vid(c.video) + '</div><div><div class="titulo">' + esc(c.campanha) + ' · ' + esc(c.id) + ' · ' + esc(c.duracao) + ' s</div>'
    + '<pre>' + esc(c.legenda || '(sem legenda.md)') + '</pre><div class="mut">' + esc(c.observacao) + '</div>'
    + '<button class="b-ok">✔ Aprovar</button><button class="b-no">✖ Recusar</button></div>';
  const [ok, no] = el.querySelectorAll('button');
  ok.onclick = () => acao({ acao:'aprovar', campanha:c.campanha, id:c.id }, [ok, no]);
  no.onclick = () => { const m = prompt('Por que recusar? (o Cortador lê isso)'); if (m && m.trim()) acao({ acao:'recusar', campanha:c.campanha, id:c.id, motivo:m }, [ok, no]); };
  return el;
}

function cardConferir(c) {
  const el = document.createElement('div'); el.className = 'card';
  el.innerHTML = '<div>' + vid(c.video) + '</div><div><div class="titulo">' + esc(c.campanha) + ' · ' + esc(c.id) + ' · ' + esc(c.status)
    + ' · ' + c.duvidas + ' em dúvida</div><div class="mut">' + esc(c.observacao) + '</div><p class="falas"></p>'
    + '<button class="b-ac" disabled>💾 Salvar e gerar de novo</button></div>';
  const v = el.querySelector('video'), falas = el.querySelector('.falas'), salvar = el.querySelector('button');
  const trocas = new Map();
  for (const w of c.palavras) {
    const s = document.createElement('span'); s.className = 'w' + (w.duvida ? ' duv' : ''); s.textContent = w.texto;
    s.title = w.t.toFixed(1) + ' s';
    s.onclick = () => {
      if (s.querySelector('input')) return;
      if (v) { v.currentTime = Math.max(0, w.t - 1); v.play(); }
      const i = document.createElement('input'); i.value = trocas.get(w.s + ':' + w.p)?.texto ?? w.texto;
      s.textContent = ''; s.append(i); i.focus(); i.select();
      const fim = () => {
        const novo = i.value.trim();
        if (novo !== w.texto) { trocas.set(w.s + ':' + w.p, { s:w.s, p:w.p, texto:novo }); s.classList.add('mud'); }
        else { trocas.delete(w.s + ':' + w.p); s.classList.remove('mud'); }
        s.textContent = novo || '∅'; salvar.disabled = trocas.size === 0;
        salvar.textContent = '💾 Salvar ' + trocas.size + ' e gerar de novo';
      };
      i.onblur = fim; i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); if (e.key === 'Escape') { i.value = w.texto; i.blur(); } };
    };
    falas.append(s, ' ');
  }
  salvar.onclick = () => { aviso('Gerando o corte de novo… (~1 min)', 0); acao({ acao:'corrigir', campanha:c.campanha, id:c.id, trocas:[...trocas.values()] }, [salvar]); };
  return el;
}

async function carregar() {
  let j;
  try { j = await (await fetch('/api/gestao/estado')).json(); } catch (e) { aviso('Não deu para ler a esteira: ' + e, 0); return; }
  if (j.erro) { aviso('Erro: ' + j.erro, 0); return; }
  $('#esteira').innerHTML = j.etapas.map((e) => '<div class="etapa' + (e.dono.startsWith('Daniel') ? ' voce' : '') + '"><b>' + e.n + '</b>'
    + esc(e.status) + '<small>' + esc(e.dono) + '</small></div>').join('');
  $('#lote').textContent = j.lote ? 'Lote mais recente: lote-semana/' + j.lote : '';
  const ap = $('#aprovar'); ap.innerHTML = j.aprovar.length ? '' : '<p class="vazio">Nada esperando você. 🎉</p>'; j.aprovar.forEach((c) => ap.append(cardAprovar(c)));
  const co = $('#conferir'); co.innerHTML = j.conferir.length ? '' : '<p class="vazio">Nenhuma legenda para conferir.</p>'; j.conferir.forEach((c) => co.append(cardConferir(c)));
  $('#propostas').innerHTML = j.propostas.length ? '<ul>' + j.propostas.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul><p class="mut">Detalhes em propostas.md; responda ao Diretor.</p>'
    : '<p class="vazio">Nenhuma.</p>';
}
carregar();
</script>
</body>
</html>`;
