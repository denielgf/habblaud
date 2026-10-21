// Montagem do prédio: núcleo + corredor + salas de projeto -> grade de caminhabilidade e spots.
import { FURNITURE } from '../../art/api';
import { BUILDING_H, COL_W, TILE } from '../constants';
import { BLOCKED, FREE, SEAT, WalkGrid } from '../path/grid';
import { furnitureBlocks, furnitureIsSeat } from './builder';
import { layoutCafe, layoutLounge, layoutReception, layoutRestroom } from './core';
import { layoutCorridor } from './corridor';
import { buildingRect, getWestCols } from './geometry';
import type { AreaLayout, SpotDef, TileRect } from './types';

export interface BuildingLayout {
  cols: number;
  rect: TileRect;
  core: AreaLayout[];
  corridor: AreaLayout;
  rooms: AreaLayout[];
  grid: WalkGrid;
  spots: SpotDef[];
}

let coreCache: { west: number; areas: AreaLayout[] } | null = null;

/** Áreas fixas do núcleo, deslocadas para depois do bloco oeste (recalculadas só quando ele muda). */
export function coreAreas(): AreaLayout[] {
  const west = getWestCols();
  if (coreCache?.west !== west) {
    const base = [layoutReception(), layoutRestroom(), layoutCafe(), layoutLounge()];
    coreCache = { west, areas: west ? base.map((a) => shiftArea(a, west * COL_W)) : base };
  }
  return coreCache.areas;
}

/** Cópia de uma área deslocada `dx` tiles para leste (o núcleo é desenhado a partir da coluna 0). */
function shiftArea(a: AreaLayout, dx: number): AreaLayout {
  const px = dx * TILE;
  const r = (t: TileRect): TileRect => ({ ...t, x: t.x + dx });
  return {
    ...a,
    rect: r(a.rect),
    floors: a.floors.map((f) => ({ ...f, x: f.x + px })),
    rugs: a.rugs.map((f) => ({ ...f, x: f.x + px })),
    walls: a.walls.map((w) => (w.kind === 'cap' ? { ...w, x: w.x + px } : { ...w, x: w.x + px, doorways: w.doorways?.map((d) => ({ ...d, x: d.x + px })) })),
    wallItems: a.wallItems.map((w) => ({ ...w, cx: w.cx + px })),
    furniture: a.furniture.map((f) => ({ ...f, tx: f.tx + dx })),
    spots: a.spots.map((s) => ({ ...s, tx: s.tx + dx, x: s.x + px })),
    walkable: a.walkable.map(r),
    blocked: a.blocked?.map(r),
    door: a.door && r(a.door),
    shade: a.shade && { ...a.shade, x: a.shade.x + px },
  };
}

/** Marca na grade as células caminháveis de uma área, os bloqueios e os assentos. */
export function paintArea(grid: WalkGrid, area: AreaLayout): void {
  for (const r of area.walkable) grid.fill(r.x, r.y, r.w, r.h, FREE);
  for (const r of area.blocked ?? []) grid.fill(r.x, r.y, r.w, r.h, BLOCKED);
  for (const f of area.furniture) {
    const def = FURNITURE[f.kind];
    if (def.mount !== 'floor') continue;
    const { w, h } = def.footprint;
    if (furnitureBlocks(f.kind)) grid.fill(f.tx, f.ty, w, h, BLOCKED);
    else if (furnitureIsSeat(f.kind)) {
      for (let y = f.ty; y < f.ty + h; y++) for (let x = f.tx; x < f.tx + w; x++) if (grid.get(x, y) === FREE) grid.set(x, y, SEAT);
    }
  }
}

export function buildWalkGrid(cols: number, areas: readonly AreaLayout[], version = 0): WalkGrid {
  const grid = new WalkGrid(cols * COL_W, BUILDING_H, version);
  for (const a of areas) paintArea(grid, a);
  return grid;
}

export function assembleBuilding(cols: number, rooms: readonly AreaLayout[], version = 0): BuildingLayout {
  const core = coreAreas();
  const corridor = layoutCorridor(cols);
  const all = [...core, corridor, ...rooms];
  const grid = buildWalkGrid(cols, all, version);
  const spots: SpotDef[] = [];
  for (const a of all) spots.push(...a.spots);
  return { cols, rect: buildingRect(cols), core, corridor, rooms: [...rooms], grid, spots };
}
