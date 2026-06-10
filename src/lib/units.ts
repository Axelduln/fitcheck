const CM_PER_INCH = 2.54

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH
}

export function feetInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * 12 + inches)
}
