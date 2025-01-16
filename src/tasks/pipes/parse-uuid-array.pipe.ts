import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class ParseUUIDArrayPipe implements PipeTransform {
  transform(value: string[]) {
    if (!Array.isArray(value)) {
      throw new BadRequestException('Value must be an array');
    }

    return value.map((id) => {
      if (!isUUID(id)) {
        throw new BadRequestException(`${id} is not a valid UUID`);
      }
      return id;
    });
  }
}
