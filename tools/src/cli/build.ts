import { buildContent } from '../build';
import { ContentValidationError } from '../errors';
import { CONTENT_DIR, DIST_DIR } from '../paths';

try {
  const r = await buildContent({ contentDir: CONTENT_DIR, distDir: DIST_DIR });
  console.log(
    `База собрана в dist/: версия ${r.manifest.contentVersion}, трав ${r.herbCount}, сборов ${r.recipeCount}, фото ${r.photoCount}`,
  );
} catch (e) {
  if (e instanceof ContentValidationError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
