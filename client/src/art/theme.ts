// Temas de sala (puros): paletas claras e bem distintas. Sementes consecutivas (slots vizinhos)
// recebem temas diferentes; a ordem da lista alterna famílias de cor de propósito.
import type { RoomTheme } from './api';

// Clínica veterinária: consultórios claros (piso de porcelanato frio, paredes verde-água, azul-hospital ou
// pêssego) com acentos que lembram a sinalização de clínica (verde-água, laranja-pata, coral).
const THEMES: readonly RoomTheme[] = [
  { carpet: '#d5e4e1', carpet2: '#c8dbd7', wall: { base: '#eef7f5', trim: '#7fb8ad', pattern: 'tiles' }, accent: '#2f9e8f', deskVariant: 'white', chairVariant: 'green' },
  { carpet: '#dfe3e8', carpet2: '#d3d8df', wall: { base: '#f4f6f8', trim: '#9fb3c8', pattern: 'plain' }, accent: '#f08a3c', deskVariant: 'white', chairVariant: 'gray' },
  { carpet: '#d3dfea', carpet2: '#c6d5e3', wall: { base: '#eef4fa', trim: '#7fa3c8', pattern: 'tiles' }, accent: '#3f7fd8', deskVariant: 'white', chairVariant: 'blue' },
  { carpet: '#e6dcd2', carpet2: '#dccfc3', wall: { base: '#fbf3ec', trim: '#d39b7a', pattern: 'stripes' }, accent: '#e2604f', deskVariant: 'wood', chairVariant: 'red' },
  { carpet: '#cfe2d6', carpet2: '#c1d8c9', wall: { base: '#f0f7f1', trim: '#86b596', pattern: 'wood_panel' }, accent: '#4cae6a', deskVariant: 'wood', chairVariant: 'green' },
  { carpet: '#dde2e2', carpet2: '#d0d6d6', wall: { base: '#f5f7f7', trim: '#8fa5a5', pattern: 'marble' }, accent: '#36b0b0', deskVariant: 'white', chairVariant: 'black' },
  { carpet: '#e4dbe6', carpet2: '#d9cedc', wall: { base: '#f8f3f9', trim: '#b49cc0', pattern: 'plain' }, accent: '#8d66cf', deskVariant: 'white', chairVariant: 'gray' },
  { carpet: '#e9e0cf', carpet2: '#dfd4c0', wall: { base: '#fbf6ec', trim: '#c9a86e', pattern: 'tiles' }, accent: '#e8a33a', deskVariant: 'wood', chairVariant: 'black' },
  { carpet: '#cde3e6', carpet2: '#bfd9dd', wall: { base: '#edf7f8', trim: '#6fb0ba', pattern: 'stripes' }, accent: '#2a8fa0', deskVariant: 'white', chairVariant: 'blue' },
  { carpet: '#e3d6d0', carpet2: '#d8c8c0', wall: { base: '#f9f1ed', trim: '#b98472', pattern: 'wood_panel' }, accent: '#c9713f', deskVariant: 'dark', chairVariant: 'gray' },
];

export const THEME_COUNT = THEMES.length;

export function roomTheme(seed: number): RoomTheme {
  const n = THEMES.length;
  const t = THEMES[((Math.floor(seed) % n) + n) % n];
  return { ...t, wall: { ...t.wall } };
}
