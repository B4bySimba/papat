import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { LedgerService } from 'src/payment/ledger.service';

@Module({
  controllers: [TenantController],
  providers: [TenantService, LedgerService],
})
export class TenantModule {}
