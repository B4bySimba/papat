import { BadRequestException } from '@nestjs/common';

/** The body, refused unless it holds plain values of `fields` only, so no nested write can ride along. */
export function only<K extends string>(body: unknown, fields: readonly K[]): Partial<Record<K, any>> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Send the fields to change.');
  const extra = Object.keys(body).filter((k) => !fields.includes(k as K));
  if (extra.length) throw new BadRequestException(`These can't be changed here: ${extra.join(', ')}.`);
  for (const [key, value] of Object.entries(body)) {
    if (value !== null && typeof value === 'object') throw new BadRequestException(`${key} must be a plain value.`);
  }
  return body;
}
