import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const BRUNO_DIR = join(ROOT, 'bruno');

// ── Types ────────────────────────────────────────────────────────────────────

type Schema = Record<string, unknown>;
type Components = { schemas?: Record<string, Schema> };
type Operation = Record<string, unknown>;

interface SpecPath {
  method: string;
  path: string;
  op: Operation;
}

// ── Schema helpers ────────────────────────────────────────────────────────────

function resolveRef(schema: Schema, components: Components): Schema {
  if (typeof schema.$ref !== 'string') return schema;
  const parts = schema.$ref.replace(/^#\//, '').split('/');
  let node: unknown = { components };
  for (const part of parts) node = (node as Record<string, unknown>)[part];
  return resolveRef(node as Schema, components);
}

const KEY_HINTS: Record<string, unknown> = {
  igdbId: 119133,
  rating: 8,
  hoursPlayed: 12.5,
  email: 'user@example.com',
  password: 'password123',
};

function sampleFrom(raw: Schema, key = '', components: Components = {}): unknown {
  const s = resolveRef(raw, components);

  if (Array.isArray(s.enum)) return s.enum[0];
  if (Array.isArray(s.anyOf)) return sampleFrom((s.anyOf as Schema[])[0], key, components);
  if (Array.isArray(s.oneOf)) return sampleFrom((s.oneOf as Schema[])[0], key, components);

  switch (s.type) {
    case 'object': {
      const props = (s.properties as Record<string, Schema>) ?? {};
      const required = new Set<string>((s.required as string[] | undefined) ?? Object.keys(props));
      return Object.fromEntries(
        Object.entries(props)
          .filter(([k]) => required.has(k))
          .map(([k, v]) => [k, sampleFrom(v, k, components)]),
      );
    }
    case 'array': {
      const items = s.items as Schema | undefined;
      return items ? [sampleFrom(items, key, components)] : [];
    }
    case 'string':
      if (key in KEY_HINTS) return KEY_HINTS[key];
      if (s.format === 'email' || key.includes('email')) return 'user@example.com';
      if (key.includes('password')) return 'password123';
      if (key.includes('url')) return 'https://example.com';
      if (key.includes('note')) return 'Anotação';
      if (key.includes('name')) return 'Example';
      return 'string';
    case 'number':
    case 'integer':
      return key in KEY_HINTS ? KEY_HINTS[key] : 1;
    case 'boolean':
      return true;
    default:
      return null;
  }
}

// ── Bruno file builder ────────────────────────────────────────────────────────

const METHOD_ORDER: Record<string, number> = { get: 1, post: 2, put: 3, patch: 4, delete: 5 };

function toBrunoUrl(path: string): string {
  return `{{baseUrl}}${path.replace(/\{(\w+)\}/g, (_, n) => `{{${n}}}`)}`;
}

function safeName(summary: string): string {
  return summary.replace(/[^\p{L}\p{N}\s-]/gu, '').trim();
}

function buildBruFile(
  method: string,
  path: string,
  op: Operation,
  seq: number,
  components: Components,
): string {
  const summary = (op.summary as string | undefined) ?? `${method.toUpperCase()} ${path}`;
  const url = toBrunoUrl(path);
  const queryParams = ((op.parameters as Array<Record<string, unknown>>) ?? []).filter(
    (p) => p.in === 'query',
  );
  const hasBody = ['post', 'put', 'patch'].includes(method) && op.requestBody;
  const bodyType = hasBody ? 'json' : 'none';

  const lines: string[] = [
    `meta {`,
    `  name: ${summary}`,
    `  type: http`,
    `  seq: ${seq}`,
    `}`,
    ``,
    `${method} {`,
    `  url: ${url}`,
    `  body: ${bodyType}`,
    `  auth: none`,
    `}`,
  ];

  if (queryParams.length > 0) {
    lines.push('', 'params:query {');
    for (const p of queryParams) {
      const schema = (p.schema as Schema | undefined) ?? {};
      const sample = sampleFrom(schema, p.name as string, components);
      lines.push(`  ${p.name}: ${sample}`);
    }
    lines.push('}');
  }

  if (hasBody) {
    const reqBody = op.requestBody as Record<string, unknown>;
    const jsonSchema = (
      (reqBody?.content as Record<string, unknown> | undefined)?.['application/json'] as
        | Record<string, unknown>
        | undefined
    )?.schema as Schema | undefined;

    lines.push('', 'headers {', '  Content-Type: application/json', '}');

    if (jsonSchema) {
      const sample = sampleFrom(jsonSchema, '', components);
      const body = JSON.stringify(sample, null, 2).replace(/\n/g, '\n  ');
      lines.push('', 'body:json {', `  ${body}`, '}');
    }
  }

  return `${lines.join('\n')}\n`;
}

// ── File system helpers ───────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function collectRequestFiles(dir: string): Set<string> {
  const files = new Set<string>();
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'environments') continue;
    const sub = join(dir, entry.name);
    for (const f of readdirSync(sub)) {
      if (f.endsWith('.bru')) files.add(join(sub, f));
    }
  }
  return files;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { buildApp } = await import('../src/app.js');

  let app: Awaited<ReturnType<typeof buildApp>>;
  try {
    app = await buildApp();
    await app.ready();
  } catch (err) {
    console.error(
      'Não foi possível iniciar o app (DB/Redis estão rodando?):',
      (err as Error).message,
    );
    process.exit(1);
  }

  const spec = (app as { swagger(): unknown }).swagger() as {
    paths?: Record<string, Record<string, Operation>>;
    components?: Components;
  };

  await app.close();

  const components: Components = spec.components ?? {};
  const paths = spec.paths ?? {};

  ensureDir(BRUNO_DIR);
  ensureDir(join(BRUNO_DIR, 'environments'));

  // Scaffold static files only on first run
  const collectionFile = join(BRUNO_DIR, 'collection.bru');
  if (!existsSync(collectionFile)) {
    writeFileSync(
      collectionFile,
      'meta {\n  name: detonado-backend\n  type: collection\n  ignore: node_modules, .git\n}\n',
    );
  }

  const envFile = join(BRUNO_DIR, 'environments', 'local.bru');
  if (!existsSync(envFile)) {
    writeFileSync(envFile, 'vars {\n  baseUrl: http://localhost:3000/api\n}\n');
  }

  const existingFiles = collectRequestFiles(BRUNO_DIR);
  const generatedFiles = new Set<string>();

  // Group operations by tag — skip routes with no tags (e.g. /health)
  const byTag: Record<string, SpecPath[]> = {};
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (!op || typeof op !== 'object') continue;
      const tags = op.tags as string[] | undefined;
      if (!tags?.length) continue;
      if (!byTag[tags[0]]) byTag[tags[0]] = [];
      byTag[tags[0]].push({ method, path, op });
    }
  }

  // Write request files
  for (const [tag, ops] of Object.entries(byTag)) {
    const folder = join(BRUNO_DIR, tag);
    ensureDir(folder);

    ops.sort((a, b) => {
      const pathDiff = a.path.localeCompare(b.path);
      return pathDiff !== 0
        ? pathDiff
        : (METHOD_ORDER[a.method] ?? 9) - (METHOD_ORDER[b.method] ?? 9);
    });

    for (let i = 0; i < ops.length; i++) {
      const { method, path, op } = ops[i];
      const summary = (op.summary as string | undefined) ?? `${method.toUpperCase()} ${path}`;
      const filePath = join(folder, `${safeName(summary)}.bru`);
      writeFileSync(filePath, buildBruFile(method, path, op, i + 1, components));
      generatedFiles.add(filePath);
    }
  }

  // Remove stale request files
  let removed = 0;
  for (const f of existingFiles) {
    if (!generatedFiles.has(f)) {
      rmSync(f);
      removed++;
      console.log(`  Removido: ${f}`);
    }
  }

  const created = [...generatedFiles].filter((f) => !existingFiles.has(f)).length;
  const updated = generatedFiles.size - created;
  console.log(
    `Bruno collection sincronizada — ${created} criados, ${updated} atualizados, ${removed} removidos.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
