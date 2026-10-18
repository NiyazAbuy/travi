import { buildContent } from '../build';
import { pickContentVersion, readGitState } from '../content-version';
import { ContentValidationError } from '../errors';
import { CONTENT_DIR, DIST_DIR } from '../paths';

try {
  const now = new Date();
  const git = readGitState(CONTENT_DIR);
  const contentVersion = pickContentVersion(git, now);
  const fromCommit = git !== null && !git.dirty && git.lastCommitSeconds !== null;
  const r = await buildContent({ contentDir: CONTENT_DIR, distDir: DIST_DIR, now, contentVersion });
  console.log(
    `База собрана в dist/: версия ${r.manifest.contentVersion} (${fromCommit ? 'из коммита' : 'текущее время'}), трав ${r.herbCount}, сборов ${r.recipeCount}, фото ${r.photoCount}`,
  );
} catch (e) {
  if (e instanceof ContentValidationError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
