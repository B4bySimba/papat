import { Global, Module } from '@nestjs/common';
import { HashidService } from './hashid/hashid.service';
import { HashidPipe } from './hashid/hashid.pipe';

@Global()
@Module({
  providers: [HashidService, HashidPipe],
  exports: [HashidService, HashidPipe],
})
export class CommonModule {}
