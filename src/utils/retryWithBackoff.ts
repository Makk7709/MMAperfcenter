/**
 * Retry with Exponential Backoff
 * 
 * A robust retry mechanism with:
 * - Exponential backoff with optional jitter
 * - Configurable retry conditions
 * - Timeout support
 * - Detailed result tracking
 */

// ============================================
// TYPES
// ============================================

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Initial delay before first retry in ms (default: 1000) */
  initialDelayMs?: number;
  
  /** Multiplier for each subsequent delay (default: 2) */
  backoffMultiplier?: number;
  
  /** Maximum delay cap in ms (default: 30000) */
  maxDelayMs?: number;
  
  /** Add random jitter to delays (default: false) */
  jitter?: boolean;
  
  /** Total timeout for all attempts in ms (optional) */
  timeoutMs?: number;
  
  /** Custom function to determine if error is retryable */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  
  /** Callback before each retry */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
  
  /** Callback on successful completion */
  onSuccess?: (result: any, attempts: number) => void;
  
  /** Callback on final failure */
  onFailure?: (errors: Error[], attempts: number) => void;
}

export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  
  /** Result data if successful */
  data?: T;
  
  /** Number of attempts made */
  attempts: number;
  
  /** All errors encountered during retries */
  errors: Error[];
  
  /** The final error if failed */
  finalError?: Error;
  
  /** Total time elapsed in ms */
  elapsedMs?: number;
}

export interface RetryableErrorOptions {
  /** Suggested delay before retry in ms */
  retryAfterMs?: number;
}

// ============================================
// RETRYABLE ERROR CLASS
// ============================================

/**
 * Custom error class to mark errors as explicitly retryable
 */
export class RetryableError extends Error {
  public readonly retryAfterMs?: number;
  
  constructor(message: string, options?: RetryableErrorOptions) {
    super(message);
    this.name = 'RetryableError';
    this.retryAfterMs = options?.retryAfterMs;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RetryableError);
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Determines if an error should be retried
 */
export function isRetryableError(error: Error): boolean {
  // Explicitly marked as retryable
  if (error instanceof RetryableError) {
    return true;
  }
  
  // Check for HTTP status codes
  const errorWithStatus = error as Error & { status?: number };
  if (errorWithStatus.status) {
    const retryableStatuses = [429, 500, 502, 503, 504];
    if (retryableStatuses.includes(errorWithStatus.status)) {
      return true;
    }
  }
  
  // Check for network errors
  const networkErrorPatterns = [
    /network/i,
    /fetch/i,
    /ECONNRESET/,
    /ETIMEDOUT/,
    /ECONNREFUSED/,
  ];
  
  for (const pattern of networkErrorPatterns) {
    if (pattern.test(error.message)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate delay with optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  backoffMultiplier: number,
  maxDelayMs: number,
  jitter: boolean
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  
  // Apply max cap
  delay = Math.min(delay, maxDelayMs);
  
  // Add jitter (0-25% random addition)
  if (jitter) {
    const jitterAmount = delay * 0.25 * Math.random();
    delay += jitterAmount;
  }
  
  return Math.round(delay);
}

/**
 * Create a timeout promise
 */
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Encapsule une promesse dans une course contre un timeout si `timeoutMs` est
 * défini. Lève synchroniquement si le délai restant est déjà épuisé.
 */
function applyTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined, startTime: number): Promise<T> {
  if (!timeoutMs) return promise;
  const remainingTime = timeoutMs - (Date.now() - startTime);
  if (remainingTime <= 0) {
    throw new Error('Operation timed out');
  }
  return Promise.race([promise, createTimeoutPromise(remainingTime)]) as Promise<T>;
}

/**
 * Sleep for specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// MAIN RETRY FUNCTION
// ============================================

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    jitter = false,
    timeoutMs,
    shouldRetry = isRetryableError,
    onRetry,
    onSuccess,
    onFailure,
  } = options;
  
  const errors: Error[] = [];
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await applyTimeout(fn(), timeoutMs, startTime);

      onSuccess?.(result, attempt);

      return {
        success: true,
        data: result,
        attempts: attempt,
        errors,
        elapsedMs: Date.now() - startTime,
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);

      // Check if we should retry
      const isLastAttempt = attempt >= maxRetries;
      const canRetry = !isLastAttempt && shouldRetry(err, attempt);

      if (!canRetry) {
        // Final failure
        onFailure?.(errors, attempt);

        return {
          success: false,
          attempts: attempt,
          errors,
          finalError: err,
          elapsedMs: Date.now() - startTime,
        };
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(
        attempt,
        initialDelayMs,
        backoffMultiplier,
        maxDelayMs,
        jitter
      );

      onRetry?.(attempt, err, delay);

      // Wait before next attempt
      await sleep(delay);
    }
  }
  
  // Should not reach here, but TypeScript needs it
  return {
    success: false,
    attempts: maxRetries,
    errors,
    finalError: errors[errors.length - 1],
    elapsedMs: Date.now() - startTime,
  };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Retry a fetch request with backoff
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const result = await retryWithBackoff(async () => {
    const response = await fetch(url, init);
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }
    
    return response;
  }, {
    ...retryOptions,
    shouldRetry: (error) => {
      const errorWithStatus = error as Error & { status?: number };
      if (errorWithStatus.status) {
        return [429, 500, 502, 503, 504].includes(errorWithStatus.status);
      }
      return isRetryableError(error);
    },
  });
  
  if (!result.success) {
    throw result.finalError || new Error('Fetch failed after retries');
  }
  
  return result.data;
}

export default {
  retryWithBackoff,
  fetchWithRetry,
  isRetryableError,
  RetryableError,
};

