import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Usage: pnpm gen:module <lowercase-module-name>');
  process.exit(1);
}

function pluralize(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

const pascal = name
  .split('-')
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join('');
const camel = pascal[0].toLowerCase() + pascal.slice(1);
const plural = pluralize(name);
const directory = join(process.cwd(), 'src', 'modules', name);
if (existsSync(directory)) {
  console.error(`Module already exists: ${directory}`);
  process.exit(1);
}

// The default template is a private, user-owned resource. Add its model and
// domain fields before registering the generated routes.
const files: Record<string, string> = {
  [`${name}.schema.ts`]: `import { z } from 'zod';

export const create${pascal}Schema = z.object({
  // TODO: declare domain fields.
});
export const update${pascal}Schema = create${pascal}Schema.partial()
  .refine((input) => Object.keys(input).length > 0, { message: 'Informe pelo menos um campo' });
export const ${camel}ResponseSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // TODO: declare public response fields. Undeclared fields are omitted.
});
export type Create${pascal}Input = z.infer<typeof create${pascal}Schema>;
export type Update${pascal}Input = z.infer<typeof update${pascal}Schema>;
`,
  [`${name}.repository.ts`]: `import type { PrismaClient } from '@/generated/prisma/client.js';
import type { Create${pascal}Input, Update${pascal}Input } from './${name}.schema.js';

export class ${pascal}Repository {
  constructor(private readonly database: PrismaClient) {}

  findAll(userId: string) {
    return this.database.${camel}.findMany({ where: { userId } });
  }

  findById(id: string, userId: string) {
    return this.database.${camel}.findFirst({ where: { id, userId } });
  }

  create(userId: string, input: Create${pascal}Input) {
    return this.database.${camel}.create({ data: { ...input, userId } });
  }

  async update(id: string, userId: string, input: Update${pascal}Input) {
    const [record] = await this.database.${camel}.updateManyAndReturn({
      where: { id, userId }, data: input,
    });
    return record ?? null;
  }

  async remove(id: string, userId: string) {
    const result = await this.database.${camel}.deleteMany({ where: { id, userId } });
    return result.count;
  }
}
`,
  [`${name}.service.ts`]: `import { NotFoundError } from '@/lib/errors.js';
import type { ${pascal}Repository } from './${name}.repository.js';
import type { Create${pascal}Input, Update${pascal}Input } from './${name}.schema.js';

type ${pascal}Store = Pick<${pascal}Repository, 'findAll' | 'findById' | 'create' | 'update' | 'remove'>;

export class ${pascal}Service {
  constructor(private readonly repository: ${pascal}Store) {}

  list(userId: string) {
    return this.repository.findAll(userId);
  }

  async getById(id: string, userId: string) {
    const record = await this.repository.findById(id, userId);
    if (!record) throw new NotFoundError('${pascal}');
    return record;
  }

  create(userId: string, input: Create${pascal}Input) {
    return this.repository.create(userId, input);
  }

  async update(id: string, userId: string, input: Update${pascal}Input) {
    const record = await this.repository.update(id, userId, input);
    if (!record) throw new NotFoundError('${pascal}');
    return record;
  }

  async remove(id: string, userId: string) {
    const removed = await this.repository.remove(id, userId);
    if (removed === 0) throw new NotFoundError('${pascal}');
  }
}
`,
  [`${name}.routes.ts`]: `import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { ${pascal}Repository } from './${name}.repository.js';
import { ${pascal}Service } from './${name}.service.js';
import { create${pascal}Schema, update${pascal}Schema, ${camel}ResponseSchema } from './${name}.schema.js';

const idParam = z.object({ id: z.string().min(1) });

export async function ${camel}Routes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const service = new ${pascal}Service(new ${pascal}Repository(app.prisma));
  const protectedRoute = {
    preHandler: requireAuth,
    schema: { tags: ['${name}'], security: [{ sessionCookie: [] }] },
  };

  routes.get('/${plural}', {
    ...protectedRoute,
    schema: { ...protectedRoute.schema, response: { 200: z.array(${camel}ResponseSchema) } },
    handler: async (request) => service.list(request.userId),
  });
  routes.get('/${plural}/:id', {
    ...protectedRoute,
    schema: { ...protectedRoute.schema, params: idParam, response: { 200: ${camel}ResponseSchema } },
    handler: async (request) => service.getById(request.params.id, request.userId),
  });
  routes.post('/${plural}', {
    ...protectedRoute,
    schema: { ...protectedRoute.schema, body: create${pascal}Schema, response: { 201: ${camel}ResponseSchema } },
    handler: async (request, reply) => {
      const record = await service.create(request.userId, request.body);
      return reply.code(201).send(record);
    },
  });
  routes.patch('/${plural}/:id', {
    ...protectedRoute,
    schema: { ...protectedRoute.schema, params: idParam, body: update${pascal}Schema,
      response: { 200: ${camel}ResponseSchema } },
    handler: async (request) => service.update(request.params.id, request.userId, request.body),
  });
  routes.delete('/${plural}/:id', {
    ...protectedRoute,
    schema: { ...protectedRoute.schema, params: idParam, response: { 204: z.null() } },
    handler: async (request, reply) => {
      await service.remove(request.params.id, request.userId);
      return reply.code(204).send(null);
    },
  });
}
`,
};

mkdirSync(directory, { recursive: true });
for (const [filename, content] of Object.entries(files)) {
  writeFileSync(join(directory, filename), content, 'utf-8');
}
console.log(`Created ${Object.keys(files).length} files in ${directory}`);
console.log('Add a model with userId, id, createdAt and updatedAt; define domain schemas.');
console.log('Generate Prisma, format the module, and register its routes under /api.');
