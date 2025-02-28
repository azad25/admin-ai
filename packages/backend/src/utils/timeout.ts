import { AppError } from '../errors/AppError';

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap with a timeout
 * @param ms The timeout in milliseconds
 * @param message The error message to use if the timeout is exceeded
 * @returns The result of the promise if it completes before the timeout
 * @throws AppError if the timeout is exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new AppError(408, message));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, message);
  }
} 