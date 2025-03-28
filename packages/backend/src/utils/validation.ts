import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ValidationError as ValidationErrorType } from '@admin-ai/shared/types/common';

export async function validateDto<T extends object>(
  dto: new () => T,
  data: any
): Promise<{ isValid: boolean; errors: ValidationErrorType[]; data?: T }> {
  const instance = plainToClass(dto, data);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  });

  if (errors.length === 0) {
    return { isValid: true, data: instance };
  }

  const formattedErrors = formatValidationErrors(errors);
  return { isValid: false, errors: formattedErrors };
}

function formatValidationErrors(errors: ValidationError[]): ValidationErrorType[] {
  return errors.map(error => ({
    property: error.property,
    constraints: error.constraints || {},
    value: error.value,
    target: error.target,
    children: error.children ? formatValidationErrors(error.children) : []
  }));
}

export function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isValidDate(date: any): boolean {
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return passwordRegex.test(password);
}

export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim();
}

export function validatePaginationParams(
  page: number,
  limit: number,
  maxLimit: number = 100
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (page < 1) {
    errors.push('Page number must be greater than 0');
  }

  if (limit < 1) {
    errors.push('Limit must be greater than 0');
  }

  if (limit > maxLimit) {
    errors.push(`Limit cannot exceed ${maxLimit}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 