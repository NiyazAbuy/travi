import { loadContent } from '../load';
import { CONTENT_DIR } from '../paths';
import { verifySources, type VerifyStatus } from '../verify-sources';

const LABEL: Record<VerifyStatus, string> = {
  ok: '✓ совпадает',
  mismatch: '✗ другое название',
  not_found: '✗ не найден',
  error: '? не удалось проверить',
};

const { content, errors } = await loadContent(CONTENT_DIR);
if (errors.length > 0) {
  console.error('В данных есть ошибки — сначала выполните npm run content:check');
  process.exit(1);
}

const results = await verifySources(content.sources);
for (const r of results) {
  const extra = r.status === 'mismatch' ? ` — найдено: "${r.found}"` : r.detail ? ` — ${r.detail}` : '';
  console.log(`${LABEL[r.status]}  ${r.sourceId}  ${r.kind.toUpperCase()} ${r.value}${extra}`);
}
const problems = results.filter((r) => r.status !== 'ok').length;
console.log(`\nПроверено идентификаторов: ${results.length}, с проблемами: ${problems}`);
if (problems > 0) {
  console.log('Это предупреждение, публикацию оно не блокирует. Исправьте title/doi/pmid или проверьте источник вручную.');
}
