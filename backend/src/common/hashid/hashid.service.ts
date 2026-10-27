import { Injectable } from '@nestjs/common';
import Hashids from 'hashids';

@Injectable()
export class HashidService {
  private hashids: Hashids;

  constructor() {
    this.hashids = new Hashids(process.env.HASHID_SALT, 10);
  }

  encode(id: number): string {
    return this.hashids.encode(id);
  }

  decode(hash: string): number {
    try {
      const [decoded] = this.hashids.decode(hash);
      return Number(decoded);
    } catch {
      return NaN;
    }
  }
}
