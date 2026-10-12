import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { LedgerService } from './ledger.service';
import { RatesController } from './rates.controller';
import { RateChangeService } from './rate-change.service';

@Module({
  controllers: [PaymentController, RatesController],
  providers: [PaymentService, LedgerService, RateChangeService],
})
export class PaymentModule {}
