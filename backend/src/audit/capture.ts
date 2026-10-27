import { Prisma } from 'generated/prisma/client';
import { requestContext } from 'src/auth/access';

const WRITES = new Set(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'updateManyAndReturn', 'upsert', 'delete', 'deleteMany']);
const BY_UNIQUE = new Set(['update', 'upsert', 'delete']);
const snapshot = (value: unknown) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value, (key, v) => (key === 'password' ? undefined : v)));

/** Records every write made during a request, with the rows before and after, for the activity log. */
export const captureWrites = Prisma.defineExtension((client) =>
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const store = requestContext.getStore();
          if (!store || model === 'AuditLog' || !WRITES.has(operation)) return query(args);

          const table = (client as any)[model[0].toLowerCase() + model.slice(1)];
          const where = (args as any).where;
          let before: unknown;
          try {
            if (BY_UNIQUE.has(operation)) before = await table.findUnique({ where });
            else if (operation === 'updateMany' || operation === 'deleteMany') before = await table.findMany({ where, take: 50 });
          } catch (e) {
            console.error(`Activity log could not read ${model} before ${operation}:`, e);
          }

          const result = await query(args);
          const after = operation === 'delete' ? null : operation === 'createMany' || operation === 'updateMany' ? (args as any).data : result;
          store.changes.push({ table: model, op: operation, before: snapshot(before), after: snapshot(after) });
          for (const row of [before, after].flat()) {
            const houseId = model === 'House' ? (row as any)?.id : (row as any)?.houseId;
            if (Number.isInteger(houseId) && !store.houseIds.includes(houseId)) store.houseIds.push(houseId);
          }
          return result;
        },
      },
    },
  }),
);

/** Forgets writes captured from here on, for work rolled back on purpose (previews). */
export function forgetWritesAfterThis() {
  const store = requestContext.getStore();
  const kept = store?.changes.length ?? 0;
  return () => {
    if (store) store.changes.length = kept;
  };
}
