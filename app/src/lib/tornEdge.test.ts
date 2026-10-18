import { describe, expect, it } from 'vitest';
import { tornEdgePath } from './tornEdge';

/** Точки пути «M x yL x y…Z». */
function points(d: string): [number, number][] {
  return d
    .slice(1, -1)
    .split('L')
    .map((p) => p.split(' ').map(Number) as [number, number]);
}

describe('tornEdgePath', () => {
  const opts = { depth: 3, radius: 6 };

  it('детерминирован: тот же ключ и размер — тот же путь', () => {
    expect(tornEdgePath('chamomile', 320, 140, opts)).toBe(tornEdgePath('chamomile', 320, 140, opts));
    // дробный размер округляется: субпиксельная перекладка не меняет край
    expect(tornEdgePath('chamomile', 320.3, 139.8, opts)).toBe(tornEdgePath('chamomile', 320, 140, opts));
  });

  it('разный ключ или размер — разный край', () => {
    const base = tornEdgePath('chamomile', 320, 140, opts);
    expect(tornEdgePath('mint', 320, 140, opts)).not.toBe(base);
    expect(tornEdgePath('chamomile', 320, 141, opts)).not.toBe(base);
  });

  it('край не выходит наружу и не глубже depth от прямоугольника', () => {
    for (const [w, h, r] of [
      [320, 140, 6],
      [80, 28, 12],
      [40, 20, 1],
      [12, 12, 0],
    ] as const) {
      const offset = 8;
      const pts = points(tornEdgePath('k', w, h, { depth: 3, radius: r, offset }));
      expect(pts.length).toBeGreaterThan(4);
      const depth = Math.min(3, w / 4, h / 4);
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(offset);
        expect(x).toBeLessThanOrEqual(offset + w);
        expect(y).toBeGreaterThanOrEqual(offset);
        expect(y).toBeLessThanOrEqual(offset + h);
        // на прямых участках точка не дальше depth от ближайшей стороны (углы скруглены — у них запас r)
        const toSide = Math.min(x - offset, offset + w - x, y - offset, offset + h - y);
        expect(toSide).toBeLessThanOrEqual(depth + r + 0.1);
      }
    }
  });

  it('путь замкнут и разумной длины', () => {
    const d = tornEdgePath('k', 340, 120, opts);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    // периметр ~900 px при шаге 2,5…5,5 px — порядка двух сотен точек, не тысячи
    const n = points(d).length;
    expect(n).toBeGreaterThan(150);
    expect(n).toBeLessThan(400);
  });
});
