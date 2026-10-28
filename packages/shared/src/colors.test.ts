import { describe, expect, it } from 'vitest';
import { compareCoverColor, coverColorGroup, hexToHsl } from './colors';

describe('cover colors', () => {
  it('converts hex to HSL', () => {
    expect(hexToHsl('#ff0000')).toMatchObject({ h: 0, s: 1, l: 0.5 });
    expect(hexToHsl('#0000ff')).toMatchObject({ h: 240 });
    expect(hexToHsl('nope')).toBeNull();
  });

  it.each([
    ['#080808', 'black'],
    ['#1a1d22', 'black'],
    ['#f8f8f8', 'white'],
    ['#ece6d6', 'white'],
    ['#808080', 'gray'],
    ['#5a3a22', 'brown'],
    ['#b89a78', 'brown'],
    ['#d64545', 'red'],
    ['#e8125a', 'red'],
    ['#e8833a', 'orange'],
    ['#e9c43b', 'yellow'],
    ['#4c9a52', 'green'],
    ['#2f9e9e', 'teal'],
    ['#386898', 'blue'],
    ['#7f4fc4', 'purple'],
    ['#d65a9e', 'pink'],
  ])('groups %s as %s', (hex, group) => {
    expect(coverColorGroup(hex)).toBe(group);
  });

  it('has no group without a color', () => {
    expect(coverColorGroup(null)).toBeNull();
    expect(coverColorGroup('')).toBeNull();
  });

  it('sorts in rainbow order with uncovered items last', () => {
    const hexes = [null, '#1c1c1c', '#386898', '#f4f1ea', '#e8125a', '#d64545', '#e9c43b', '#7a5233'];
    expect(hexes.sort(compareCoverColor)).toEqual([
      '#e8125a',
      '#d64545',
      '#e9c43b',
      '#386898',
      '#7a5233',
      '#f4f1ea',
      '#1c1c1c',
      null,
    ]);
  });
});
