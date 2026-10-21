// Geometria do prédio: mapeamento de slots, colunas e retângulos. Puro e testável.
import { BUILDING_H, COL_W, CORE_COLS, CORRIDOR_H, CORRIDOR_Y, NORTH_Y, ROOM_H, SOUTH_Y, TILE } from '../constants';
import type { TileRect } from './types';

export type Side = 'north' | 'south';

/**
 * Prédio em dois blocos: slots a partir daqui são do bloco leste (o servidor os marca assim quando
 * HABBLAUD_FIXED_ROOMS tem um "|" separando os blocos). Sem slot leste, o prédio é o de sempre:
 * núcleo a oeste e todas as salas depois dele.
 */
export const EAST_SLOT_BASE = 1000;
export const isEastSlot = (slot: number): boolean => slot >= EAST_SLOT_BASE;

/** Colunas do bloco oeste (antes do núcleo). 0 = prédio de um bloco só. */
let westCols = 0;
export function setWestCols(n: number): void {
  westCols = Math.max(0, Math.floor(n));
}
export function getWestCols(): number {
  return westCols;
}
/** Primeira coluna do núcleo (recepção/banheiros e copa/lounge). */
export function coreStart(): number {
  return westCols;
}
export function isCoreCol(col: number): boolean {
  return col >= westCols && col < westCols + CORE_COLS;
}
/** Colunas do bloco oeste para um conjunto de slots: 0 se não há bloco leste. */
export function westColsFor(slots: Iterable<number>): number {
  let east = false;
  let maxWest = -1;
  for (const s of slots) {
    if (isEastSlot(s)) east = true;
    else maxWest = Math.max(maxWest, Math.floor(Math.max(0, s) / 2));
  }
  return east ? Math.max(1, maxWest + 1) : 0;
}

/** Coluna do prédio ocupada por um slot de sala de projeto. */
export function slotColumn(slot: number): number {
  if (isEastSlot(slot)) return westCols + CORE_COLS + Math.floor((slot - EAST_SLOT_BASE) / 2);
  return (westCols ? 0 : CORE_COLS) + Math.floor(Math.max(0, slot) / 2);
}

/** Slot par = norte do corredor; ímpar = sul (contando a partir do começo do bloco). */
export function slotSide(slot: number): Side {
  const k = isEastSlot(slot) ? slot - EAST_SLOT_BASE : Math.max(0, slot);
  return k % 2 === 0 ? 'north' : 'south';
}

/** Retângulo (tiles) de uma sala em uma coluna/lado. */
export function cellRect(col: number, side: Side): TileRect {
  return { x: col * COL_W, y: side === 'north' ? NORTH_Y : SOUTH_Y, w: COL_W, h: ROOM_H };
}

export function slotRect(slot: number): TileRect {
  return cellRect(slotColumn(slot), slotSide(slot));
}

/** Slot correspondente a uma coluna/lado de projeto (inverso de slotColumn/slotSide). */
export function slotAt(col: number, side: Side): number {
  const s = side === 'north' ? 0 : 1;
  if (!westCols) return (col - CORE_COLS) * 2 + s;
  if (col < westCols) return col * 2 + s;
  return EAST_SLOT_BASE + (col - westCols - CORE_COLS) * 2 + s;
}

/** Total de colunas do prédio para um conjunto de slots em uso (mínimo: 1 coluna de projeto por bloco). */
export function columnsFor(slots: Iterable<number>): number {
  const list = [...slots];
  const west = westColsFor(list);
  let maxCol = 0;
  for (const s of list) {
    if (west && !isEastSlot(s)) continue;
    maxCol = Math.max(maxCol, Math.floor((isEastSlot(s) ? s - EAST_SLOT_BASE : Math.max(0, s)) / 2));
  }
  return west + CORE_COLS + maxCol + 1;
}

export function corridorRect(cols: number): TileRect {
  return { x: 0, y: CORRIDOR_Y, w: cols * COL_W, h: CORRIDOR_H };
}

export function buildingRect(cols: number): TileRect {
  return { x: 0, y: 0, w: cols * COL_W, h: BUILDING_H };
}

export function rectPx(r: TileRect): { x: number; y: number; w: number; h: number } {
  return { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE };
}

export function inRect(r: TileRect, tx: number, ty: number): boolean {
  return tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h;
}
