import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'duration',
})
export class DurationPipe implements PipeTransform {

    /**
     * Transforms a duration in seconds to a string in the format "mm:ss".
     * @param value The duration in seconds.
     * @returns The formatted duration string.
     */
    transform(value: unknown): string {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
            return '';
        }
        const duration = Math.floor(value);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
