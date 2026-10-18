import path from 'node:path';
import { writeAppIcons } from '../app-icons';
import { REPO_ROOT } from '../paths';

try {
  const outDir = path.join(REPO_ROOT, 'app', 'assets', 'images');
  const names = await writeAppIcons(outDir);
  console.log(`Иконки записаны в app/assets/images: ${names.join(', ')}`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
