import path from 'node:path';
import { fetchPhoto } from '../fetch-photo';
import { CONTENT_DIR, REPO_ROOT } from '../paths';

const [herbId, fileTitle, outName] = process.argv.slice(2);
if (!herbId || !fileTitle || !outName) {
  console.error(
    'Использование: npm run photo:fetch -- <id-травы> "<File:Название.jpg>" <имя.webp>\n' +
      'Пример: npm run photo:fetch -- plantago-major "File:Plantago major.jpg" plant.webp',
  );
  process.exit(1);
}

try {
  const r = await fetchPhoto({ contentDir: CONTENT_DIR, herbId, fileTitle, outName });
  console.log(
    `Сохранено: ${path.relative(REPO_ROOT, r.file)} (${Math.round(r.bytes / 1024)} КБ), автор: ${r.author}, лицензия: ${r.license}`,
  );
  console.log(`Добавьте в content/herbs/${herbId}.yaml:\nphotos:\n  - file: ${outName}\n    kind: plant`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
