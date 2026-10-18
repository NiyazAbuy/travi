import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { paperTexture } from '../paper-texture';
import { REPO_ROOT } from '../paths';

try {
  const file = path.join(REPO_ROOT, 'app', 'assets', 'images', 'paper.png');
  const png = await paperTexture();
  await writeFile(file, png);
  console.log(`Текстура бумаги записана: app/assets/images/paper.png (${Math.round(png.length / 1024)} КБ)`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
