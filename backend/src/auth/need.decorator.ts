import { SetMetadata } from '@nestjs/common';
import { Right } from './rights';

export const NEED = 'need';

/** Where a request names the record it touches: `<kind>:<path>`, e.g. `unit:body.readings.*.unitId`. */
export type HouseSource = `${'house' | 'unit' | 'tenant' | 'lease' | 'leaseCode' | 'payment' | 'reading'}:${string}`;

/**
 * The right a route needs. With sources, it is checked at the house of every record they name;
 * without, the route lists only the houses where it is held. Routes without @Need are root only.
 * 'self' is any signed-in user, 'admin' is admins and root.
 */
export const Need = (right: Right | 'self' | 'admin' | 'root', ...from: HouseSource[]) =>
  SetMetadata(NEED, { right, from });

export const Public = () => SetMetadata(NEED, { right: 'public', from: [] });
