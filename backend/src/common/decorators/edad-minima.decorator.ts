import { registerDecorator, ValidationOptions } from 'class-validator';

const EDAD_MAXIMA_RAZONABLE = 120;

function calcularEdad(fechaNacimiento: Date, hoy: Date): number {
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const noLlegoElCumpleEsteAno =
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() &&
      hoy.getDate() < fechaNacimiento.getDate());
  if (noLlegoElCumpleEsteAno) edad -= 1;
  return edad;
}

/**
 * Valida una fecha de nacimiento (string 'YYYY-MM-DD' u otro formato que
 * entienda `Date`): no puede ser futura, tiene que corresponder a al menos
 * `minimo` años cumplidos, y no puede pasar de 120 años (evita fechas
 * absurdas como "nací ayer" o "nací en 1800"). El campo sigue siendo
 * OPCIONAL a nivel de DTO — esta validación solo corre si viene un valor.
 */
export function EdadMinima(minimo: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'edadMinima',
      target: object.constructor,
      propertyName,
      options: {
        message: `Tenés que tener al menos ${minimo} años`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null || value === '') return true;
          const fecha = new Date(value as string);
          if (Number.isNaN(fecha.getTime())) return false;

          const hoy = new Date();
          if (fecha.getTime() > hoy.getTime()) return false;

          const edad = calcularEdad(fecha, hoy);
          return edad >= minimo && edad <= EDAD_MAXIMA_RAZONABLE;
        },
      },
    });
  };
}
