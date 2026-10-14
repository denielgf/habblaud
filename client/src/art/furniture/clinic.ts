// Móveis da clínica veterinária: mesa de procedimento (inox), armário de medicamentos, balança de chão,
// gaiolas de internação e negatoscópio de raio-x na parede. Mesma escala e luz dos móveis do escritório.
import { floorSheet, wallSheet, type BufFurniture } from '../core/sprite';
import type { PixelBuf } from '../core/pixbuf';
import { M, contact, frontFace, topFace } from './kit';

/** Sombra suave projetada na parede (abaixo/direita do objeto). */
function wallShadow(b: PixelBuf, x: number, y: number, w: number, h: number): void {
  for (let yy = y + 1; yy <= y + h; yy++) b.under(x + w, yy, 'rgba(30,34,52,0.16)');
  for (let xx = x + 1; xx <= x + w; xx++) b.under(xx, y + h, 'rgba(30,34,52,0.16)');
}

const CLINIC_GREEN = '#2f9e8f';

/** 2x1. Mesa de procedimento em inox sobre quatro pés, com toalha verde-água e rolo de papel. */
export function examTable(): BufFurniture {
  const s = floorSheet(2, 1, 12);
  const b = s.buf;
  // Quatro pés de inox (os de trás mais curtos e escuros) e prateleira baixa.
  for (const x of [3, 27]) b.rect(x, 6, 2, 6, M.steelDark.dk);
  for (const x of [1, 29]) {
    b.rect(x, 7, 2, 8, M.steel.base);
    b.vline(x, 7, 14, M.steel.lt);
  }
  b.rect(3, 11, 26, 2, M.steel.dk);
  b.hline(3, 28, 11, M.steel.base);
  // Tampo de inox: superfície grande vista de cima, borda elevada e frente fina.
  topFace(b, 0, -8, 32, 13, M.steel);
  b.rect(2, -6, 28, 9, '#d9dee4');
  b.hline(2, 29, -6, M.steel.dk);
  b.vline(2, -6, 2, M.steel.dk);
  b.hline(3, 29, 2, '#eef1f4');
  frontFace(b, 0, 5, 32, 2, M.steel);
  // Toalha dobrada e um rolo de papel na ponta.
  b.rect(19, -5, 9, 6, '#5bbfb0');
  b.hline(19, 27, -3, '#ffffff');
  b.hline(19, 27, -1, '#ffffff');
  b.hline(19, 27, 0, '#3f9e8f');
  b.rect(4, -4, 3, 5, '#f6f4ee');
  b.vline(6, -4, 0, '#d6d3cb');
  b.outline();
  contact(b, 2, 13, 28, 4, 0.22);
  return { base: s };
}

/** 1x1. Armário alto de medicamentos: vitrine com frascos em cima, portas com cruz verde embaixo. */
export function medCabinet(): BufFurniture {
  const s = floorSheet(1, 1, 22);
  const b = s.buf;
  const m = M.white;
  topFace(b, 1, -21, 14, 3, m);
  frontFace(b, 1, -18, 14, 34, m);
  // Vitrine com prateleiras.
  b.rect(2, -17, 12, 15, '#d8ecf2');
  b.vline(7, -17, -3, '#a9c3cc');
  for (const y of [-12, -7]) b.hline(2, 13, y, '#a9c3cc');
  const bottles: [number, number, number, number, string][] = [
    [3, -16, 2, 4, '#e2604f'], [5, -15, 1, 3, '#f2c14e'], [9, -16, 1, 4, '#4cae6a'], [11, -15, 2, 3, '#3f7fd8'],
    [3, -11, 3, 4, '#f4f6f7'], [9, -11, 2, 4, '#8d66cf'], [12, -10, 1, 3, '#ec8a3c'],
    [4, -6, 2, 3, '#36b0b0'], [9, -6, 3, 3, '#f4f6f7'],
  ];
  for (const [x, y, w, h, c] of bottles) {
    b.rect(x, y, w, h, c);
    b.set(x, y, '#ffffff');
  }
  b.set(3, -17, '#ffffff');
  b.set(2, -16, '#ffffff');
  // Portas de baixo.
  b.hline(1, 14, -1, m.dk);
  b.vline(7, 0, 14, m.dk);
  b.rect(5, 5, 1, 3, '#7d8592');
  b.rect(9, 5, 1, 3, '#7d8592');
  b.rect(11, 3, 2, 6, CLINIC_GREEN);
  b.rect(10, 5, 4, 2, CLINIC_GREEN);
  b.outline();
  contact(b, 0, 13, 16, 4, 0.22);
  return { base: s };
}

/** 1x1. Balança de chão para cães, com coluna e visor digital. */
export function petScale(): BufFurniture {
  const s = floorSheet(1, 1, 16);
  const b = s.buf;
  // Plataforma com tapete de borracha.
  topFace(b, 0, 4, 16, 9, M.steel);
  b.rect(2, 6, 12, 5, '#4a525e');
  for (const x of [4, 7, 10]) b.vline(x, 6, 10, '#5d6670');
  frontFace(b, 0, 13, 16, 3, M.steel);
  // Coluna e visor.
  b.rect(1, -10, 2, 15, M.steelDark.base);
  b.vline(1, -10, 4, M.steelDark.lt);
  b.rect(-1, -15, 8, 6, '#2b2f3a');
  b.rect(0, -14, 6, 3, '#7be0a8');
  for (const x of [1, 3, 4]) b.vline(x, -14, -12, '#1d5e3e');
  b.set(6, -10, '#e2604f');
  b.outline();
  contact(b, 0, 14, 16, 3, 0.18);
  return { base: s };
}

/** 1x1. Duas gaiolas de internação empilhadas, em inox, com grade e mantinha. */
export function kennel(): BufFurniture {
  const s = floorSheet(1, 1, 22);
  const b = s.buf;
  const m = M.steel;
  topFace(b, 0, -21, 16, 3, m);
  frontFace(b, 0, -18, 16, 34, m);
  const cage = (y: number, blanket: string) => {
    // Interior claro de inox, mantinha, potinho e grade com poucas barras.
    b.rect(2, y, 12, 13, '#cfd6dd');
    b.rect(2, y, 12, 3, '#b3bcc6');
    b.rect(3, y + 8, 9, 4, blanket);
    b.hline(3, 11, y + 8, '#ffffff');
    b.rect(11, y + 10, 2, 2, '#e2604f');
    for (const x of [2, 5, 8, 11, 13]) b.vline(x, y, y + 12, '#6d7583');
    b.hline(2, 13, y, m.hi);
    b.hline(2, 13, y + 12, m.dk);
    b.rect(12, y + 5, 2, 2, '#f2c14e');
  };
  cage(-17, '#5bc0de');
  cage(1, '#e47aa8');
  // Ficha de identificação na gaiola de cima.
  b.rect(10, -20, 4, 2, '#f6f4ee');
  b.outline();
  contact(b, 0, 13, 16, 4, 0.22);
  return { base: s };
}

/** Parede, 1 tile. Negatoscópio aceso com o raio-x de um cão. */
export function xrayViewer(): BufFurniture {
  const s = wallSheet(1);
  const b = s.buf;
  const x = 1;
  const y = -27;
  b.rect(x, y, 14, 15, '#d9dde3');
  b.rect(x + 1, y + 1, 12, 12, '#d6eef8');
  // Filme: esqueleto de cachorro de lado.
  b.rect(x + 2, y + 2, 10, 10, '#1f2a38');
  const bone = '#dbe7ef';
  b.rect(x + 3, y + 4, 2, 2, bone);
  b.hline(x + 5, x + 10, y + 6, bone);
  for (const rx of [6, 7, 8]) b.vline(x + rx, y + 7, y + 8, '#9fb3c4');
  b.vline(x + 6, y + 7, y + 10, bone);
  b.vline(x + 10, y + 7, y + 10, bone);
  b.set(x + 11, y + 5, bone);
  b.set(x + 4, y + 4, '#9fb3c4');
  // Interruptor da luz.
  b.set(x + 12, y + 13, '#5fd07a');
  b.outline();
  wallShadow(b, x - 1, y - 1, 16, 17);
  return { base: s };
}
