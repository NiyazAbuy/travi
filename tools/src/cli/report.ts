import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkContent } from '../check';
import { ContentValidationError } from '../errors';
import { CONTENT_DIR, REPO_ROOT } from '../paths';
import { renderReport } from '../report';

const { content, errors } = await checkContent(CONTENT_DIR);
if (errors.length > 0) {
  console.error(new ContentValidationError(errors).message);
  process.exit(1);
}

const reportDir = path.join(REPO_ROOT, 'report');
await mkdir(reportDir, { recursive: true });
const file = path.join(reportDir, 'index.html');
// Относительный путь: так страница работает и из папки с кириллицей в имени
const html = renderReport(content, {
  photoUrl: (herbId, photoFile) => `../content/photos/${herbId}/${photoFile}`,
  generatedAt: new Date(),
});
await writeFile(file, html);
console.log(`Страница проверки: ${pathToFileURL(file).href}`);
