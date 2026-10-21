import { afterEach, describe, expect, it } from 'vitest';
import { COL_W, CORE_COLS } from '../constants';
import { assembleBuilding, coreAreas } from './building';
import { columnsFor, EAST_SLOT_BASE, isCoreCol, setWestCols, slotAt, slotColumn, slotSide, westColsFor } from './geometry';
import { RECEPTION_ID } from './core';

afterEach(() => setWestCols(0));

describe('prédio em dois blocos', () => {
  const slots = [0, 1, 2, 3, 4, 5, 6, EAST_SLOT_BASE, EAST_SLOT_BASE + 1, EAST_SLOT_BASE + 6];

  it('sem slot leste continua o prédio de um bloco', () => {
    expect(westColsFor([0, 1, 2])).toBe(0);
    expect(slotColumn(0)).toBe(CORE_COLS);
    expect(columnsFor([0, 1, 2])).toBe(CORE_COLS + 2);
  });

  it('bloco oeste antes do núcleo, bloco leste depois', () => {
    const west = westColsFor(slots);
    expect(west).toBe(4);
    setWestCols(west);
    expect(slotColumn(0)).toBe(0);
    expect(slotColumn(6)).toBe(3);
    expect(isCoreCol(4) && isCoreCol(5)).toBe(true);
    expect(slotColumn(EAST_SLOT_BASE)).toBe(6);
    expect(slotSide(EAST_SLOT_BASE)).toBe('north');
    expect(slotSide(EAST_SLOT_BASE + 1)).toBe('south');
    expect(slotColumn(EAST_SLOT_BASE + 6)).toBe(9);
    expect(columnsFor(slots)).toBe(10);
    for (const s of slots) expect(slotAt(slotColumn(s), slotSide(s))).toBe(s);
  });

  it('o núcleo anda junto com o bloco oeste e o prédio monta', () => {
    setWestCols(westColsFor(slots));
    const rec = coreAreas().find((a) => a.id === RECEPTION_ID)!;
    expect(rec.rect.x).toBe(4 * COL_W);
    const b = assembleBuilding(columnsFor(slots), [], 1);
    expect(b.cols).toBe(10);
    expect(b.spots.length).toBeGreaterThan(0);
  });
});
