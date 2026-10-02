import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { LedgerService } from './ledger.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, LedgerService],
})
export class PaymentModule {}
