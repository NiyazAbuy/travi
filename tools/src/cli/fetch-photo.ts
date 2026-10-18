import path from 'node:path';
import { fetchPhoto, parseCrop, type Crop } from '../fetch-photo';
import { CONTENT_DIR, REPO_ROOT } from '../paths';

const USAGE =
  'Использование: npm run photo:fetch -- <id-травы> "<File:Название.jpg>" <имя.webp> [--crop x,y,w,h]\n' +
  '               [--illustration [--keep-main] [--erase x,y,w,h]...]\n' +
  'Пример (фото):    npm run photo:fetch -- plantago-major "File:Plantago major.jpg" plant.webp\n' +
  'Пример (рисунок): npm run photo:fetch -- plantago-major "File:Illustration Plantago major0 clean.jpg" illustration.webp --illustration --keep-main\n' +
  '  --crop x,y,w,h   сначала вырезать фрагмент — в пикселях скачанного изображения (Commons отдаёт копию шириной\n' +
  '                   около 1600–1920 px или оригинал, если он меньше); так убираются подписи и номер таблицы\n' +
  '  --illustration   старая таблица атласа: фон бумаги становится прозрачным, прозрачные поля обрезаются\n' +
  '  --keep-main      (с --illustration) оставить только растение: убрать отдельные фигуры, буквы и номера таблицы\n' +
  '  --erase x,y,w,h  (с --illustration, можно несколько раз) стереть прямоугольник — букву, касающуюся растения;\n' +
  '                   координаты те же, что у --crop';

const positional: string[] = [];
let crop: Crop | undefined;
let illustration = false;
let keepMain = false;
const erase: Crop[] = [];
try {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--illustration') illustration = true;
    else if (arg === '--keep-main') keepMain = true;
    else if (arg === '--crop') crop = parseCrop(args[++i] ?? '');
    else if (arg.startsWith('--crop=')) crop = parseCrop(arg.slice('--crop='.length));
    else if (arg === '--erase') erase.push(parseCrop(args[++i] ?? ''));
    else if (arg.startsWith('--erase=')) erase.push(parseCrop(arg.slice('--erase='.length)));
    else if (arg.startsWith('--')) throw new Error(`Неизвестный флаг ${arg}`);
    else positional.push(arg);
  }
} catch (e) {
  console.error(`${(e as Error).message}\n${USAGE}`);
  process.exit(1);
}

const [herbId, fileTitle, outName] = positional;
if (!herbId || !fileTitle || !outName || positional.length > 3 || ((keepMain || erase.length > 0) && !illustration)) {
  console.error(USAGE);
  process.exit(1);
}

try {
  const r = await fetchPhoto({ contentDir: CONTENT_DIR, herbId, fileTitle, outName, crop, illustration, keepMain, erase });
  console.log(
    `Сохранено: ${path.relative(REPO_ROOT, r.file)} (${Math.round(r.bytes / 1024)} КБ), автор: ${r.author}, лицензия: ${r.license}`,
  );
  const field = illustration ? 'illustration:' : 'photos:\n  -';
  console.log(`Добавьте в content/herbs/${herbId}.yaml:\n${field} { file: ${outName}, kind: plant }`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
