import { Injectable } from '@nestjs/common';
import prisma from 'lib/db';
import { HashidService } from 'src/common/hashid/hashid.service';

type Hit = { id: string; label: string; detail: string; href: string };

const TAKE = 5;

@Injectable()
export class SearchService {
  constructor(private readonly hashid: HashidService) {}

  /** Up to five tenants (current and past), properties, units and payments matching `q`, each with the page it opens. */
  async search(raw?: string): Promise<Record<'tenants' | 'properties' | 'units' | 'payments', Hit[]>> {
    const q = raw?.trim() ?? '';
    if (q.length < 2) return { tenants: [], properties: [], units: [], payments: [] };
    const has = { contains: q, mode: 'insensitive' as const };
    const enc = (id: number) => this.hashid.encode(id);
    const leasePage = (l: { id: number; houseId: number; unitId: number; status: string }) =>
      `/properties/${enc(l.houseId)}/units/${enc(l.unitId)}${l.status === 'ACTIVE' ? '' : `/past/${enc(l.id)}`}`;

    const [leases, houses, units, payments] = await Promise.all([
      prisma.lease.findMany({
        where: {
          movedTo: { is: null },
          OR: [
            { code: { equals: q, mode: 'insensitive' } },
            { tenant: { OR: [{ name: has }, { contact: has }, { nationId: has }] } },
          ],
        },
        orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
        take: TAKE,
        select: {
          id: true,
          houseId: true,
          unitId: true,
          status: true,
          code: true,
          terminationDate: true,
          tenant: { select: { name: true } },
          unit: { select: { number: true } },
          house: { select: { name: true } },
        },
      }),
      prisma.house.findMany({
        where: { OR: [{ name: has }, { address: has }, { lr_number: has }, { landlord: { name: has } }] },
        orderBy: { name: 'asc' },
        take: TAKE,
        select: { id: true, name: true, address: true, landlord: { select: { name: true } } },
      }),
      prisma.unit.findMany({
        where: { number: { startsWith: q, mode: 'insensitive' } },
        orderBy: { number: 'asc' },
        take: TAKE,
        select: {
          id: true,
          number: true,
          houseId: true,
          house: { select: { name: true } },
          lease: { where: { status: 'ACTIVE' }, take: 1, select: { tenant: { select: { name: true } } } },
        },
      }),
      prisma.payment.findMany({
        where: { reference: has, lease: { isNot: null } },
        orderBy: { date: 'desc' },
        take: TAKE,
        select: {
          id: true,
          reference: true,
          amount: true,
          date: true,
          lease: { select: { id: true, houseId: true, unitId: true, status: true, tenant: { select: { name: true } } } },
        },
      }),
    ]);

    return {
      tenants: leases.map((l) => ({
        id: enc(l.id),
        label: l.tenant.name,
        detail: [
          l.house.name,
          l.unit.number,
          l.code,
          l.terminationDate && l.status !== 'ACTIVE' ? `moved out ${l.terminationDate.toLocaleDateString('en-GB')}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        href: leasePage(l),
      })),
      properties: houses.map((h) => ({
        id: enc(h.id),
        label: h.name,
        detail: [h.address, h.landlord?.name].filter(Boolean).join(' · '),
        href: `/properties/${enc(h.id)}`,
      })),
      units: units.map((u) => ({
        id: enc(u.id),
        label: `Unit ${u.number}`,
        detail: `${u.house.name} · ${u.lease[0]?.tenant.name ?? 'Vacant'}`,
        href: `/properties/${enc(u.houseId)}/units/${enc(u.id)}`,
      })),
      payments: payments.map((p) => ({
        id: enc(p.id),
        label: p.reference,
        detail: `Ksh.${p.amount.toLocaleString()} · ${p.date.toLocaleDateString('en-GB')} · ${p.lease!.tenant.name}`,
        href: leasePage(p.lease!),
      })),
    };
  }
}
