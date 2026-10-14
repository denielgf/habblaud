// Temas de sala (puros): paletas claras e bem distintas. Sementes consecutivas (slots vizinhos)
// recebem temas diferentes; a ordem da lista alterna famílias de cor de propósito.
import type { RoomTheme } from './api';

// Agência de marketing: cada sala inspirada nas cores de uma rede social. Paredes e pisos ficam claros
// (para os personagens continuarem legíveis); a identidade vem do rodapé, do tapete e do acento.
const THEMES: readonly RoomTheme[] = [
  // Instagram: rosa e laranja
  { carpet: '#f3d3dc', carpet2: '#ecc3cf', wall: { base: '#fdf1f4', trim: '#e1306c', pattern: 'stripes' }, accent: '#f77737', deskVariant: 'white', chairVariant: 'red' },
  // TikTok: grafite com ciano e rosa
  { carpet: '#c4c7ce', carpet2: '#b6bac3', wall: { base: '#e3e5ea', trim: '#25f4ee', pattern: 'brick' }, accent: '#fe2c55', deskVariant: 'dark', chairVariant: 'black' },
  // YouTube: branco e vermelho
  { carpet: '#e9dcdc', carpet2: '#e0cfcf', wall: { base: '#fbf6f6', trim: '#ff0000', pattern: 'plain' }, accent: '#cc0000', deskVariant: 'white', chairVariant: 'red' },
  // LinkedIn: azul corporativo
  { carpet: '#d2e0ee', carpet2: '#c3d5e8', wall: { base: '#f0f5fa', trim: '#0a66c2', pattern: 'wood_panel' }, accent: '#0a66c2', deskVariant: 'wood', chairVariant: 'blue' },
  // WhatsApp: verde
  { carpet: '#d3ead8', carpet2: '#c4e2cb', wall: { base: '#f0f8f2', trim: '#25d366', pattern: 'tiles' }, accent: '#128c7e', deskVariant: 'white', chairVariant: 'green' },
  // Twitch: roxo
  { carpet: '#ddd3f0', carpet2: '#d0c3ea', wall: { base: '#f5f1fc', trim: '#9146ff', pattern: 'stripes' }, accent: '#9146ff', deskVariant: 'dark', chairVariant: 'gray' },
  // Snapchat: amarelo
  { carpet: '#f3ebc4', carpet2: '#ece1ad', wall: { base: '#fffbe6', trim: '#e6c800', pattern: 'plain' }, accent: '#fffc00', deskVariant: 'wood', chairVariant: 'black' },
  // X: preto e branco
  { carpet: '#d6d7da', carpet2: '#cacbcf', wall: { base: '#f2f2f3', trim: '#14171a', pattern: 'brick' }, accent: '#1d9bf0', deskVariant: 'dark', chairVariant: 'black' },
  // Kwai: laranja
  { carpet: '#f3dcc8', carpet2: '#ecceb4', wall: { base: '#fdf4ec', trim: '#ff7e00', pattern: 'wood_panel' }, accent: '#ff5000', deskVariant: 'wood', chairVariant: 'gray' },
  // Pinterest: vermelho escuro
  { carpet: '#ecd6d8', carpet2: '#e4c6c9', wall: { base: '#fcf3f4', trim: '#bd081c', pattern: 'tiles' }, accent: '#e60023', deskVariant: 'white', chairVariant: 'red' },
];

export const THEME_COUNT = THEMES.length;

export function roomTheme(seed: number): RoomTheme {
  const n = THEMES.length;
  const t = THEMES[((Math.floor(seed) % n) + n) % n];
  return { ...t, wall: { ...t.wall } };
}
