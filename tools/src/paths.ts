import path from 'node:path';
import { fileURLToPath } from 'node:url';

// tools/src/paths.ts → tools/src → tools → корень репозитория
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT_DIR = path.join(REPO_ROOT, 'content');
export const DIST_DIR = path.join(REPO_ROOT, 'dist');
