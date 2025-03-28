import { plainToClass, plainToInstance, ClassTransformOptions } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';

export interface TransformOptions extends ClassTransformOptions {
  validate?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
}

export class TransformError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationError[]
  ) {
    super(message);
    this.name = 'TransformError';
  }
}

export async function transformToClass<T extends object>(
  cls: new () => T,
  plain: any,
  options: TransformOptions = {}
): Promise<T> {
  const {
    validate: shouldValidate = true,
    whitelist = true,
    forbidNonWhitelisted = true,
    ...transformOptions
  } = options;

  const instance = plainToInstance(cls, plain, {
    whitelist,
    forbidNonWhitelisted,
    ...transformOptions
  });

  if (shouldValidate) {
    const errors = await validate(instance);
    if (errors.length > 0) {
      throw new TransformError('Validation failed', errors);
    }
  }

  return instance;
}

export function transformToPlain<T extends object>(
  instance: T,
  options: TransformOptions = {}
): Record<string, any> {
  return plainToClass(Object, instance, {
    excludeExtraneousValues: true,
    ...options
  });
}

export function transformArray<T extends object>(
  cls: new () => T,
  plainArray: any[],
  options: TransformOptions = {}
): T[] {
  return plainArray.map(item => plainToInstance(cls, item, options));
}

export function transformToResponse<T extends object>(
  instance: T,
  options: TransformOptions = {}
): Record<string, any> {
  return transformToPlain(instance, {
    excludeExtraneousValues: true,
    ...options
  });
}

export function transformToEntity<T extends object>(
  cls: new () => T,
  plain: any,
  options: TransformOptions = {}
): T {
  return plainToInstance(cls, plain, {
    excludeExtraneousValues: true,
    ...options
  });
}

export function transformToDTO<T extends object>(
  cls: new () => T,
  plain: any,
  options: TransformOptions = {}
): T {
  return plainToInstance(cls, plain, {
    whitelist: true,
    forbidNonWhitelisted: true,
    ...options
  });
}

export function transformToQuery<T extends object>(
  cls: new () => T,
  query: Record<string, any>,
  options: TransformOptions = {}
): T {
  return plainToInstance(cls, query, {
    whitelist: true,
    forbidNonWhitelisted: false,
    ...options
  });
}

export function transformToUpdate<T extends object>(
  cls: new () => T,
  update: Partial<any>,
  options: TransformOptions = {}
): Partial<T> {
  return plainToInstance(cls, update, {
    whitelist: true,
    forbidNonWhitelisted: false,
    ...options
  });
}

export function transformToCreate<T extends object>(
  cls: new () => T,
  create: any,
  options: TransformOptions = {}
): T {
  return plainToInstance(cls, create, {
    whitelist: true,
    forbidNonWhitelisted: true,
    ...options
  });
} 