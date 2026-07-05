import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HouseModule } from './house/house.module';
import { LandlordModule } from './landlord/landlord.module';
import { UnitModule } from './unit/unit.module';
import { TenantModule } from './tenant/tenant.module';
import { MeterReadingModule } from './meter-reading/meter-reading.module';
import { PaymentModule } from './payment/payment.module';
import { HashidService } from './common/hashid/hashid.service';
import { CommonModule } from './common/common.module';
import { PingController } from './ping/ping.controller';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [HouseModule, LandlordModule, UnitModule, TenantModule, MeterReadingModule, PaymentModule, CommonModule, UserModule, AuthModule],
  controllers: [AppController, PingController],
  providers: [AppService, HashidService],
})
export class AppModule {}
