import sharp from 'sharp';

/**
 * Отделение рисунка от фона старой бумаги (таблицы ботанических атласов, рисунок иконки).
 *
 * Бумага литографий желтоватая/серая и неровная: светлее в одном углу, темнее в другом, с зерном.
 * Поэтому её цвет оценивается по полосе вдоль краёв изображения — там только бумага — как плоскость
 * `цвет(x, y) = a + b·x + c·y` по каждому каналу (так учитывается плавное потемнение к одному краю).
 * Дальше каждый пиксель получает прозрачность по расстоянию его цвета до цвета бумаги в этой точке:
 * в пределах шума бумаги — полностью прозрачный, дальше — плавный переход до непрозрачного, чтобы
 * бледные карандашные линии и лёгкие заливки сохранились полупрозрачными.
 * Цвет полупрозрачных пикселей «очищается» от бумаги (обратное смешивание): на исходной бумаге
 * результат выглядит точно как оригинал, а на кремовом фоне приложения нет жёлтой каймы.
 */

/** Ширина полосы по краям, по которой оценивается бумага, — доля меньшей стороны. */
const BORDER_SHARE = 0.03;
/** Пиксели полосы дальше этого расстояния от медианы — уже рисунок, а не бумага. */
const PAPER_OUTLIER = 45;
/** Запас над шумом бумаги, ниже которого пиксель полностью прозрачный. */
const NOISE_MARGIN = 6;
/** Длина плавного перехода (по расстоянию цвета) от прозрачного к непрозрачному. */
const RAMP = 80;
/** Пятнышко меньше этой доли площади изображения (но не меньше MIN_SPECK пикселей) — пыль или зерно бумаги. */
const SPECK_SHARE = 4e-5;
const MIN_SPECK = 6;
/** Связная область, ни один пиксель которой не стал заметно непрозрачным, — пятно на бумаге, а не рисунок. */
const STAIN_MAX_ALPHA = 48;
/** Для `keepMainFigure`: пиксели бледнее этого не связывают части рисунка между собой. */
const LINK_ALPHA = 32;

interface Plane {
  /** Цвет бумаги (r, g, b) в точке (x, y). */
  at(x: number, y: number): [number, number, number];
}

interface PaperModel {
  plane: Plane;
  /** Уровень шума бумаги: 95-й процентиль отклонения пикселей полосы от плоскости. */
  noise: number;
}

function distance(r: number, g: number, b: number, p: [number, number, number]): number {
  return Math.hypot(r - p[0], g - p[1], b - p[2]);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

function percentile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))] ?? 0;
}

/** Решает систему 3×3 методом Крамера; при вырожденной матрице — null. */
function solve3(m: number[][], v: number[]): [number, number, number] | null {
  const det = (a: number[][]) =>
    a[0]![0]! * (a[1]![1]! * a[2]![2]! - a[1]![2]! * a[2]![1]!) -
    a[0]![1]! * (a[1]![0]! * a[2]![2]! - a[1]![2]! * a[2]![0]!) +
    a[0]![2]! * (a[1]![0]! * a[2]![1]! - a[1]![1]! * a[2]![0]!);
  const d = det(m);
  if (Math.abs(d) < 1e-9) return null;
  const col = (i: number) => m.map((row, r) => row.map((x, c) => (c === i ? v[r]! : x)));
  return [det(col(0)) / d, det(col(1)) / d, det(col(2)) / d];
}

interface Sample {
  x: number;
  y: number;
  rgb: [number, number, number];
}

/** Плоскость по каждому каналу методом наименьших квадратов; координаты нормированы к [-0.5, 0.5]. */
function fitPlane(samples: Sample[], width: number, height: number): Plane {
  const nx = (x: number) => x / width - 0.5;
  const ny = (y: number) => y / height - 0.5;
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const v = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const s of samples) {
    const basis = [1, nx(s.x), ny(s.y)];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) m[i]![j]! += basis[i]! * basis[j]!;
      for (let c = 0; c < 3; c++) v[c]![i]! += basis[i]! * s.rgb[c]!;
    }
  }
  const coef = [0, 1, 2].map((c) => {
    const solved = solve3(m, v[c]!);
    // вырожденный случай (мало точек) — просто медиана канала
    return solved ?? [median(samples.map((s) => s.rgb[c]!)), 0, 0];
  });
  return {
    at(x, y) {
      const bx = nx(x);
      const by = ny(y);
      return [0, 1, 2].map((c) => coef[c]![0]! + coef[c]![1]! * bx + coef[c]![2]! * by) as [number, number, number];
    },
  };
}

function estimatePaper(data: Buffer, width: number, height: number): PaperModel {
  const band = Math.max(2, Math.round(Math.min(width, height) * BORDER_SHARE));
  const samples: Sample[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= band && x < width - band && y >= band && y < height - band) continue;
      const i = (y * width + x) * 3;
      samples.push({ x, y, rgb: [data[i]!, data[i + 1]!, data[i + 2]!] });
    }
  }
  const mid: [number, number, number] = [0, 1, 2].map((c) => median(samples.map((s) => s.rgb[c]!))) as [
    number,
    number,
    number,
  ];
  let paper = samples.filter((s) => distance(...s.rgb, mid) < PAPER_OUTLIER);
  if (paper.length < samples.length / 4) paper = samples;
  let plane = fitPlane(paper, width, height);
  // второй проход: отбрасываем точки, сильно отклонившиеся от первой плоскости (пятна, край рисунка)
  const residuals = paper.map((s) => distance(...s.rgb, plane.at(s.x, s.y)));
  const cut = Math.max(10, 3 * percentile(residuals, 0.5));
  const inliers = paper.filter((_, k) => residuals[k]! <= cut);
  if (inliers.length >= paper.length / 2) {
    plane = fitPlane(inliers, width, height);
    paper = inliers;
  }
  const noise = percentile(
    paper.map((s) => distance(...s.rgb, plane.at(s.x, s.y))),
    0.95,
  );
  return { plane, noise };
}

/**
 * Связные области маски (соседство по 8 направлениям): для каждого пикселя — номер его области
 * (наименьший индекс пикселя в ней), для пустого пикселя — −1.
 */
function labelComponents(mask: Uint8Array, width: number, height: number): Int32Array {
  const parent = new Int32Array(width * height).fill(-1);
  const find = (i: number): number => {
    let r = i;
    while (parent[r]! !== r) r = parent[r]!;
    // сжатие путей
    while (parent[i]! !== r) {
      const next = parent[i]!;
      parent[i] = r;
      i = next;
    }
    return r;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      parent[i] = i;
      // уже обработанные соседи: слева, сверху-слева, сверху, сверху-справа
      if (x > 0 && parent[i - 1]! >= 0) union(i, i - 1);
      if (y > 0) {
        const up = i - width;
        if (parent[up]! >= 0) union(i, up);
        if (x > 0 && parent[up - 1]! >= 0) union(i, up - 1);
        if (x < width - 1 && parent[up + 1]! >= 0) union(i, up + 1);
      }
    }
  }
  for (let i = 0; i < parent.length; i++) if (parent[i]! >= 0) parent[i] = find(i);
  return parent;
}

/** Маска «непрозрачность пикселя больше `threshold`» для RGBA-буфера. */
function opaqueMask(rgba: Buffer, threshold = 0): Uint8Array {
  const mask = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4 + 3]! > threshold ? 1 : 0;
  return mask;
}

/**
 * Убирает мусор: связные области ненулевой прозрачности, которые слишком малы (пыль, зерно бумаги)
 * или нигде не становятся заметно непрозрачными (бледные пятна). Меняет `out` на месте.
 */
function removeSpecks(out: Buffer, width: number, height: number): void {
  const n = width * height;
  const label = labelComponents(opaqueMask(out), width, height);
  const area = new Int32Array(n);
  const maxAlpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = label[i]!;
    if (r < 0) continue;
    area[r]!++;
    maxAlpha[r] = Math.max(maxAlpha[r]!, out[i * 4 + 3]!);
  }
  const minArea = Math.max(MIN_SPECK, Math.round(n * SPECK_SHARE));
  for (let i = 0; i < n; i++) {
    const r = label[i]!;
    if (r >= 0 && (area[r]! < minArea || maxAlpha[r]! < STAIN_MAX_ALPHA)) out[i * 4 + 3] = 0;
  }
}

/**
 * Делает фон бумаги прозрачным. На входе — любое изображение (JPEG/PNG/WebP), на выходе — PNG с альфа-каналом
 * того же размера: бумага прозрачна, рисунок сохраняет свой цвет.
 */
export async function paperToAlpha(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .rotate()
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const { plane, noise } = estimatePaper(data, width, height);
  const lo = noise + NOISE_MARGIN;
  const hi = lo + RAMP;

  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const o = (y * width + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const p = plane.at(x, y);
      const t = Math.min(1, Math.max(0, (distance(r, g, b, p) - lo) / (hi - lo)));
      const alpha = t * t * (3 - 2 * t); // плавный переход (smoothstep)
      if (alpha <= 0) {
        // полностью прозрачный пиксель: цвет бумаги, чтобы при уменьшении не появлялась тёмная кайма
        out[o] = Math.round(p[0]);
        out[o + 1] = Math.round(p[1]);
        out[o + 2] = Math.round(p[2]);
        out[o + 3] = 0;
        continue;
      }
      // обратное смешивание: пиксель = alpha·рисунок + (1 − alpha)·бумага → рисунок
      const unmix = (v: number, pv: number) => Math.min(255, Math.max(0, Math.round(pv + (v - pv) / alpha)));
      out[o] = unmix(r, p[0]);
      out[o + 1] = unmix(g, p[1]);
      out[o + 2] = unmix(b, p[2]);
      out[o + 3] = Math.round(alpha * 255);
    }
  }
  removeSpecks(out, width, height);
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/** Квадратное расширение маски на `radius` пикселей (два прохода скользящим окном). */
function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const pass = (src: Uint8Array, len: number, lines: number, at: (line: number, k: number) => number) => {
    const dst = new Uint8Array(src.length);
    for (let line = 0; line < lines; line++) {
      let count = 0;
      for (let k = 0; k < Math.min(radius, len); k++) count += src[at(line, k)]!;
      for (let k = 0; k < len; k++) {
        if (k + radius < len) count += src[at(line, k + radius)]!;
        if (k - radius - 1 >= 0) count -= src[at(line, k - radius - 1)]!;
        dst[at(line, k)] = count > 0 ? 1 : 0;
      }
    }
    return dst;
  };
  const horizontal = pass(mask, width, height, (y, x) => y * width + x);
  return pass(horizontal, height, width, (x, y) => y * width + x);
}

/**
 * Оставляет только главный рисунок таблицы — растение — и убирает отдельные фигуры (разрезы цветка, плоды),
 * буквы и номера. Главный рисунок — связная область с наибольшей суммарной непрозрачностью; части, отделённые
 * от неё щелью не больше `gap` пикселей (цветок на тонкой бледной ножке), считаются его частью.
 * По умолчанию `gap` — 0,5 % длинной стороны, не меньше 6 px. На входе и выходе — PNG с альфа-каналом.
 */
export async function keepMainFigure(input: Buffer, gap?: number): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const maxGap = gap ?? Math.max(6, Math.round(Math.max(width, height) * 0.005));
  // связность считается по заметно непрозрачным пикселям: бледная дымка бумаги не должна «склеивать»
  // растение с соседними фигурами; сама дымка рядом с растением остаётся (она внутри расширенной области)
  const mask = dilate(opaqueMask(data, LINK_ALPHA), width, height, Math.ceil(maxGap / 2));
  const label = labelComponents(mask, width, height);
  const weight = new Float64Array(width * height);
  let main = -1;
  for (let i = 0; i < weight.length; i++) {
    const r = label[i]!;
    if (r < 0) continue;
    weight[r]! += data[i * 4 + 3]!;
    if (main < 0 || weight[r]! > weight[main]!) main = r;
  }
  for (let i = 0; i < weight.length; i++) if (label[i] !== main) data[i * 4 + 3] = 0;
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/** Обрезает прозрачные поля вокруг рисунка и оставляет прозрачный запас `pad` пикселей с каждой стороны. */
export async function trimTransparent(input: Buffer, pad: number): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error('Рисунок пуст: после отделения от бумаги не осталось ни одного пикселя');
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const trimmed = await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer();
  return sharp(trimmed)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: transparent })
    .png()
    .toBuffer();
}
