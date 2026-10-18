import { Pipe, PipeTransform } from '@angular/core';
import { formatPlatoId } from '../utils/plato';

@Pipe({ name: 'platoId' })
export class PlatoIdPipe implements PipeTransform {
  transform(value: unknown): string {
    return formatPlatoId(value);
  }
}
