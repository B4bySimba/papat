import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { HashidService } from './hashid.service';

@Injectable()
export class HashidPipe implements PipeTransform {
  constructor (private readonly hashidService: HashidService) {}

  transform(value: string): number {
    const id = this.hashidService.decode(value);
    if (!Number.isInteger(id)) {
      throw new BadRequestException('Invalid ID');
    }
    return id;
  }
}
