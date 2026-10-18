import path from 'node:path';
import { syncAppContent } from '../app-content';
import { DIST_DIR, REPO_ROOT } from '../paths';

try {
  const r = await syncAppContent({ distDir: DIST_DIR, appDir: path.join(REPO_ROOT, 'app') });
  console.log(`База ${r.contentVersion} и ${r.photoCount} фото скопированы в app/assets/content`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
