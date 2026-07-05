import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { HashidService } from './hashid.service';

@Injectable()
export class HashidPipe implements PipeTransform {
  constructor (private readonly hashidService: HashidService) {}

  transform(value: string): number {
    const id = this.hashidService.decode(value);
    if (id === null) {
      throw new BadRequestException('Invalid house ID');
    }
    return id;
  }
}
