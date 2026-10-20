import { describe, expect, it } from 'vitest';
import type { WallArtAsset, WorldAssets } from '../assets';
import { pickWallArt } from './scene';

const img = {} as HTMLImageElement;
const poster = (id: string, variant?: string, rooms?: string[]): WallArtAsset => ({ id, kind: 'poster', img, w: 12, h: 16, tiles: 1, variant, rooms });
const assets: WorldAssets = {
  wallArt: [poster('code', 'code'), poster('setor-edicao', undefined, ['Edição']), poster('setor-redacao', undefined, ['Redação'])],
};

describe('pickWallArt com arte por sala', () => {
  it('usa o pôster do próprio setor, mesmo com outra variante pedida', () => {
    expect(pickWallArt(assets, 'poster', 1, 'code', 7, 'Edição')?.id).toBe('setor-edicao');
    expect(pickWallArt(assets, 'poster', 1, 'rocket', 3, 'Redação')?.id).toBe('setor-redacao');
  });
  it('não espalha a arte de um setor em outras salas', () => {
    expect(pickWallArt(assets, 'poster', 1, 'code', 1, 'Lounge')?.id).toBe('code');
    expect(pickWallArt(assets, 'poster', 1, 'code', 1)?.id).toBe('code');
    expect(pickWallArt(assets, 'poster', 1, 'rocket', 1, 'Lounge')).toBeNull();
  });
});
