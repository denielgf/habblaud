// Móveis da agência de marketing: ring light, câmera no tripé, fundo infinito de estúdio e tela de métricas
// na parede. Mesma escala e luz dos móveis do escritório.
import { floorSheet, wallSheet, type BufFurniture } from '../core/sprite';
import type { PixelBuf } from '../core/pixbuf';
import { M, contact } from './kit';

/** Sombra suave projetada na parede (abaixo/direita do objeto). */
function wallShadow(b: PixelBuf, x: number, y: number, w: number, h: number): void {
  for (let yy = y + 1; yy <= y + h; yy++) b.under(x + w, yy, 'rgba(30,34,52,0.16)');
  for (let xx = x + 1; xx <= x + w; xx++) b.under(xx, y + h, 'rgba(30,34,52,0.16)');
}

/** Tripé de três pernas abertas, com a coluna central até `top`. */
function tripod(b: PixelBuf, cx: number, top: number): void {
  const leg = M.graphite;
  b.vline(cx, top, 8, leg.base);
  b.vline(cx + 1, top, 8, leg.dk);
  b.line(cx, 8, cx - 5, 14, leg.base);
  b.line(cx + 1, 8, cx + 6, 14, leg.dk);
  b.vline(cx, 8, 12, leg.lt);
}

/** 1x1. Ring light em tripé, com o celular preso no meio do anel. */
export function ringLight(): BufFurniture {
  const s = floorSheet(1, 1, 26);
  const b = s.buf;
  tripod(b, 7, -12);
  // Anel de luz (contorno de um círculo de raio ~6) e o celular no centro.
  const cx = 8;
  const cy = -18;
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(t) * 6);
    const y = Math.round(cy + Math.sin(t) * 6);
    b.set(x, y, '#fff6d6');
    b.set(x - (x > cx ? 1 : 0), y, '#fff6d6');
  }
  b.rect(cx - 2, cy - 3, 3, 6, '#2b2440');
  b.rect(cx - 1, cy - 2, 1, 4, '#5bc0de');
  b.outline();
  contact(b, 1, 13, 14, 3, 0.16);
  return { base: s };
}

/** 1x1. Câmera profissional no tripé, virada para a esquerda (para o fundo do estúdio). */
export function cameraTripod(): BufFurniture {
  const s = floorSheet(1, 1, 18);
  const b = s.buf;
  tripod(b, 8, -6);
  // Corpo da câmera, lente e luz vermelha de gravação.
  b.rect(4, -12, 9, 6, '#2b2f3a');
  b.hline(4, 12, -12, '#4a5060');
  b.rect(1, -11, 3, 4, '#3a404d');
  b.set(1, -10, '#7fc8e8');
  b.rect(9, -14, 3, 2, '#2b2f3a');
  b.set(11, -11, '#e2447e');
  b.outline();
  contact(b, 1, 13, 14, 3, 0.16);
  return { base: s };
}

/** 2x1. Fundo infinito de estúdio: rolo de papel colorido preso na barra, descendo até o chão. */
export function backdrop(): BufFurniture {
  const s = floorSheet(2, 1, 40);
  const b = s.buf;
  // Postes laterais e barra com o rolo.
  for (const x of [0, 30]) {
    b.rect(x, -28, 2, 42, M.graphite.base);
    b.vline(x, -28, 13, M.graphite.lt);
  }
  b.rect(1, -29, 30, 3, '#5a4f7a');
  b.hline(1, 30, -29, '#7a6c9e');
  // Papel: parede (vertical) e curva até o chão.
  b.rect(2, -26, 28, 30, '#8d66cf');
  for (let y = -26; y < 4; y += 6) b.hline(2, 29, y, '#9b78d8');
  b.rect(2, 4, 28, 9, '#a283e0');
  b.hline(2, 29, 4, '#b39aea');
  b.hline(2, 29, 12, '#7a56bd');
  // Luz "ON AIR" acesa no alto da barra.
  onAirLamp(b, 5, -38, false);
  b.outline();
  contact(b, 0, 13, 32, 3, 0.18);
  return { base: s };
}

/** Parede, 1 tile. Tela de métricas: gráfico de barras subindo e um contador de views. */
export function analyticsScreen(): BufFurniture {
  const s = wallSheet(1);
  const b = s.buf;
  const x = 1;
  const y = -27;
  b.rect(x, y, 14, 12, '#2b2f3a');
  b.rect(x + 1, y + 1, 12, 10, '#1d2233');
  // Barras crescentes e linha de tendência.
  const bars = [2, 3, 3, 5, 6, 8];
  bars.forEach((h, i) => b.rect(x + 2 + i * 2, y + 10 - h, 1, h, i === bars.length - 1 ? '#e2447e' : '#2fb3c6'));
  b.set(x + 12, y + 2, '#f2c14e');
  b.set(x + 11, y + 3, '#f2c14e');
  b.rect(x + 2, y + 2, 4, 1, '#f4f1ea');
  // Suporte na parede.
  b.rect(x + 6, y + 12, 2, 2, '#4a5060');
  b.outline();
  wallShadow(b, x - 1, y - 1, 16, 15);
  return { base: s };
}

/** Fonte 3x5 só com as letras de "ON AIR". */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  O: ['###', '#.#', '#.#', '#.#', '###'],
  N: ['#.#', '###', '###', '#.#', '#.#'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  I: ['#', '#', '#', '#', '#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
};

function word(b: PixelBuf, x: number, y: number, text: string, c: string): void {
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) {
      x += 2;
      continue;
    }
    g.forEach((row, gy) => [...row].forEach((bit, gx) => bit === '#' && b.set(x + gx, y + gy, c)));
    x += g[0].length + 1;
  }
}

/**
 * Caixa vermelha acesa escrita ON AIR, com (x, y) no canto superior esquerdo: numa linha (23x9) ou
 * empilhada, "ON" sobre "AIR" (13x14), para caber em 1 tile.
 */
function onAirLamp(b: PixelBuf, x: number, y: number, stacked: boolean): void {
  const w = stacked ? 13 : 23;
  const h = stacked ? 14 : 9;
  b.rect(x, y, w, h, '#7a1020');
  b.rect(x + 1, y + 1, w - 2, h - 2, '#e2203f');
  b.hline(x + 1, x + w - 2, y + 1, '#ff5a72');
  const ink = '#fff1d6';
  if (stacked) {
    word(b, x + 3, y + 2, 'ON', ink);
    word(b, x + 2, y + 8, 'AIR', ink);
  } else word(b, x + 2, y + 2, 'ON AIR', ink);
}

/** Parede, 1 tile. Placa luminosa ON AIR sobre um suporte. */
export function onAirSign(): BufFurniture {
  const s = wallSheet(1);
  const b = s.buf;
  b.rect(7, -28, 2, 2, '#4a5060');
  onAirLamp(b, 1, -26, true);
  b.outline();
  wallShadow(b, 0, -27, 15, 15);
  return { base: s };
}
