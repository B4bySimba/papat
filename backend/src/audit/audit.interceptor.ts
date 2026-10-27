import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mergeMap } from 'rxjs';
import prisma from 'lib/db';
import { requestContext } from 'src/auth/access';
import { NEED } from 'src/auth/need.decorator';

/** Names the action of the current request in the activity log (otherwise its route's right), and who or what it was done to. */
export function logAs(action: string, subject?: string) {
  const store = requestContext.getStore();
  if (store) Object.assign(store, { action, subject });
}

/** After a request succeeds, writes what it changed to the activity log as one entry. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const right: string | undefined = this.reflector.get(NEED, ctx.getHandler())?.right;
    return next.handle().pipe(
      mergeMap(async (body) => {
        const store = requestContext.getStore();
        if (store?.actor && (store.changes.length || store.action)) {
          try {
            await prisma.auditLog.create({
              data: {
                userId: store.actor.id,
                username: store.actor.username,
                action: store.action ?? right ?? 'root',
                subject: store.subject,
                houseIds: store.houseIds,
                changes: store.changes.length ? (store.changes as any) : undefined,
                ip: store.ip,
              },
            });
          } catch (e) {
            console.error('Activity log write failed:', e, store.action ?? right, store.changes);
          }
        }
        return body;
      }),
    );
  }
}
