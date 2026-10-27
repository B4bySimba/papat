/** Every right root can grant. House rights are held per house, global ones once per person. */
export const RIGHTS = [
  { key: 'house.view', area: 'House details', label: 'View' },
  { key: 'house.edit', area: 'House details', label: 'Edit' },
  { key: 'units.view', area: 'Units', label: 'View' },
  { key: 'units.add', area: 'Units', label: 'Add' },
  { key: 'units.edit', area: 'Units', label: 'Edit' },
  { key: 'units.delete', area: 'Units', label: 'Delete' },
  { key: 'tenants.view', area: 'Tenants', label: 'View' },
  { key: 'tenants.add', area: 'Tenants', label: 'Add' },
  { key: 'tenants.edit', area: 'Tenants', label: 'Edit' },
  { key: 'tenants.delete', area: 'Tenants', label: 'Delete' },
  { key: 'payments.view', area: 'Payments', label: 'View' },
  { key: 'payments.add', area: 'Payments', label: 'Add' },
  { key: 'payments.edit', area: 'Payments', label: 'Edit' },
  { key: 'payments.delete', area: 'Payments', label: 'Delete' },
  { key: 'readings.view', area: 'Meter readings', label: 'View' },
  { key: 'readings.add', area: 'Meter readings', label: 'Add' },
  { key: 'readings.edit', area: 'Meter readings', label: 'Edit' },
  { key: 'readings.delete', area: 'Meter readings', label: 'Delete' },
  { key: 'tenants.vacate', area: 'Special', label: 'Vacate tenant' },
  { key: 'tenants.move', area: 'Special', label: 'Move tenant to another unit' },
  { key: 'rates.change', area: 'Special', label: 'Rent and charge changes' },
  { key: 'arrears.edit', area: 'Special', label: 'Arrears b/f' },
  { key: 'pastTenants.view', area: 'Special', label: 'See past tenants' },
  { key: 'reports.view', area: 'Special', label: 'Reports and invoices' },
  { key: 'landlord.view', area: 'Special', label: 'See landlord and commission' },
  { key: 'house.delete', area: 'Special', label: 'Delete house' },
  { key: 'property.add', area: 'Global', label: 'Add property', global: true },
  { key: 'landlords.manage', area: 'Global', label: 'Manage landlords', global: true },
] as const;

export type Right = (typeof RIGHTS)[number]['key'];

/** How a right reads to people, e.g. "Payments: Add" or "Vacate tenant". */
export function rightLabel(key: string) {
  const r = RIGHTS.find((x) => x.key === key);
  return !r ? key : r.area === 'Special' || r.area === 'Global' ? r.label : `${r.area}: ${r.label}`;
}

export const isGlobal = (key: string) => RIGHTS.some((r) => r.key === key && 'global' in r);

/** Switched on when a house is ticked for someone. */
export const ON_TICK: Right[] = [
  'house.view', 'units.view', 'tenants.view', 'payments.view', 'readings.view', 'pastTenants.view', 'reports.view',
];

/** What each right can't work without: actions need their area's view, money screens need payments. */
export const NEEDS: Partial<Record<Right, Right[]>> = {
  'house.edit': ['house.view'],
  'units.view': ['house.view'],
  'units.add': ['units.view'],
  'units.edit': ['units.view'],
  'units.delete': ['units.view'],
  'tenants.view': ['units.view'],
  'tenants.add': ['tenants.view'],
  'tenants.edit': ['tenants.view'],
  'tenants.delete': ['tenants.view'],
  'payments.view': ['tenants.view'],
  'payments.add': ['payments.view'],
  'payments.edit': ['payments.view'],
  'payments.delete': ['payments.view'],
  'readings.view': ['units.view'],
  'readings.add': ['readings.view'],
  'readings.edit': ['readings.view'],
  'readings.delete': ['readings.view'],
  'tenants.vacate': ['tenants.view', 'payments.view'],
  'tenants.move': ['tenants.view', 'payments.view'],
  'rates.change': ['tenants.view', 'payments.view'],
  'arrears.edit': ['payments.view'],
  'pastTenants.view': ['tenants.view'],
  'reports.view': ['payments.view'],
  'landlord.view': ['house.view'],
  'house.delete': ['house.view'],
};

/** Known house rights plus everything they need, so a grid can never hold a right it can't use. */
export function withNeeds(rights: string[]): Right[] {
  const out = new Set<Right>();
  const add = (r: Right) => {
    if (out.has(r)) return;
    out.add(r);
    NEEDS[r]?.forEach(add);
  };
  rights.filter((r) => RIGHTS.some((k) => k.key === r) && !isGlobal(r)).forEach((r) => add(r as Right));
  return RIGHTS.map((r) => r.key).filter((k) => out.has(k));
}

export const globalRights = (rights: string[]) => RIGHTS.map((r) => r.key).filter((k) => isGlobal(k) && rights.includes(k));
