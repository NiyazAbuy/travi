/**
 * Рваный край бумаги: SVG-путь вдоль скруглённого прямоугольника, точки которого сдвинуты внутрь
 * на случайную глубину. Случайность детерминированная — от `seed` и размера: одна и та же карточка
 * при перерисовке получает тот же край, а карточки разного размера или с разным ключом — разный.
 *
 * Чистая функция без React Native — проверяется тестами (`tornEdge.test.ts`).
 */

export interface TornEdgeOptions {
  /** Наибольшая глубина зубцов внутрь от прямоугольника, px. Наружу край не выходит никогда. */
  depth: number;
  /** Радиус скругления углов, px (урезается до половины меньшей стороны). */
  radius: number;
  /** Сдвиг всех точек вправо-вниз — место под тень вокруг фигуры в общем SVG. */
  offset?: number;
}

/** FNV-1a: строка → 32-битное число. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — маленький быстрый генератор с воспроизводимой последовательностью. */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Frame {
  x: number;
  y: number;
  /** Нормаль внутрь фигуры. */
  nx: number;
  ny: number;
}

/** Точка контура скруглённого прямоугольника на расстоянии `s` от начала (верхняя сторона, после левого угла). */
function contour(w: number, h: number, r: number, s: number): Frame {
  const sx = w - 2 * r;
  const sy = h - 2 * r;
  const arc = (Math.PI / 2) * r;
  // стороны и углы по часовой стрелке: верх, правый верхний угол, право, правый нижний, низ, левый нижний, лево, левый верхний
  const parts: { len: number; at: (t: number) => Frame }[] = [
    { len: sx, at: (t) => ({ x: r + t, y: 0, nx: 0, ny: 1 }) },
    { len: arc, at: (t) => corner(w - r, r, -Math.PI / 2 + t / Math.max(r, 1e-6), r) },
    { len: sy, at: (t) => ({ x: w, y: r + t, nx: -1, ny: 0 }) },
    { len: arc, at: (t) => corner(w - r, h - r, t / Math.max(r, 1e-6), r) },
    { len: sx, at: (t) => ({ x: w - r - t, y: h, nx: 0, ny: -1 }) },
    { len: arc, at: (t) => corner(r, h - r, Math.PI / 2 + t / Math.max(r, 1e-6), r) },
    { len: sy, at: (t) => ({ x: 0, y: h - r - t, nx: 1, ny: 0 }) },
    { len: arc, at: (t) => corner(r, r, Math.PI + t / Math.max(r, 1e-6), r) },
  ];
  let rest = s;
  for (const p of parts) {
    if (rest <= p.len) return p.at(rest);
    rest -= p.len;
  }
  return parts[0]!.at(0);
}

function corner(cx: number, cy: number, angle: number, r: number): Frame {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: cx + r * cos, y: cy + r * sin, nx: -cos, ny: -sin };
}

/** Длина контура скруглённого прямоугольника. */
function perimeter(w: number, h: number, r: number): number {
  return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
}

/** Шаг между точками края, px: мельче — край «пушистее», но длиннее путь. */
const STEP_MIN = 2.5;
const STEP_MAX = 5.5;
/** Расстояние между узлами плавной волны края, px. */
const WAVE = 26;

/** Воспроизводимый генератор чисел [0, 1) от строкового ключа — для других «неровных» рисунков (печать). */
export function seededRandom(seed: string): () => number {
  return random(hash(seed));
}

/**
 * Путь рваного края для фигуры `width × height` (размер округляется до целых px).
 * Все точки лежат внутри прямоугольника [offset, offset + width] × [offset, offset + height]
 * и не глубже `depth` от его контура.
 */
export function tornEdgePath(seed: string, width: number, height: number, options: TornEdgeOptions): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const depth = Math.max(0, Math.min(options.depth, w / 4, h / 4));
  const r = Math.max(0, Math.min(options.radius, w / 2, h / 2));
  const offset = options.offset ?? 0;
  const rnd = random(hash(`${seed}|${w}x${h}`));

  const total = perimeter(w, h, r);
  // Плавная волна вдоль всего контура: значения в узлах, замкнутые по кругу, чтобы край сошёлся без шва.
  const knots = Math.max(3, Math.round(total / WAVE));
  const wave = Array.from({ length: knots }, () => rnd() * 2 - 1);
  const waveAt = (s: number) => {
    const u = (s / total) * knots;
    const i = Math.floor(u) % knots;
    const t = u - Math.floor(u);
    const k = (1 - Math.cos(t * Math.PI)) / 2; // косинусная интерполяция
    return wave[i]! * (1 - k) + wave[(i + 1) % knots]! * k;
  };

  const points: string[] = [];
  for (let s = 0; s < total; s += STEP_MIN + rnd() * (STEP_MAX - STEP_MIN)) {
    const f = contour(w, h, r, s);
    // глубина: средняя + плавная волна + мелкая дрожь; изредка — более глубокий надрыв
    let k = 0.45 + 0.3 * waveAt(s) + 0.25 * (rnd() * 2 - 1);
    if (rnd() < 0.05) k = 0.85 + 0.15 * rnd();
    const d = depth * Math.min(1, Math.max(0, k));
    // у очень малого радиуса угла сдвиг к центру мог бы проскочить за сторону — держим точку в прямоугольнике
    const x = Math.min(w, Math.max(0, f.x + f.nx * d)) + offset;
    const y = Math.min(h, Math.max(0, f.y + f.ny * d)) + offset;
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M${points.join('L')}Z`;
}
