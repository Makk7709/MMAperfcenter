/**
 * TDD Tests for Retry with Exponential Backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryWithBackoff,
  type RetryOptions,
  RetryableError,
  isRetryableError,
} from './retryWithBackoff';

// ============================================
// TEST UTILITIES
// ============================================

function createRetryableError(message: string): RetryableError {
  return new RetryableError(message);
}

// ============================================
// BASIC RETRY TESTS
// ============================================

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Successful Execution', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const resultPromise = retryWithBackoff(fn);
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should succeed after retries with retryable errors', async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount < 3) {
          throw createRetryableError(`fail ${callCount}`);
        }
        return 'success';
      });
      
      const resultPromise = retryWithBackoff(fn, { 
        maxRetries: 3,
        initialDelayMs: 100,
      });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
    });

    it('should track all errors in result', async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount < 3) {
          throw createRetryableError(`fail ${callCount}`);
        }
        return 'success';
      });
      
      const resultPromise = retryWithBackoff(fn, { 
        maxRetries: 3,
        initialDelayMs: 100,
      });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toBe('fail 1');
      expect(result.errors[1].message).toBe('fail 2');
    });
  });

  describe('Failure Handling', () => {
    it('should fail after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(createRetryableError('always fails'));
      
      const resultPromise = retryWithBackoff(fn, { 
        maxRetries: 3,
        initialDelayMs: 100,
      });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.attempts).toBe(3);
      expect(result.errors).toHaveLength(3);
    });

    it('should include final error in result', async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        throw createRetryableError(`fail ${callCount}`);
      });
      
      const resultPromise = retryWithBackoff(fn, { 
        maxRetries: 3,
        initialDelayMs: 100,
      });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.finalError?.message).toBe('fail 3');
    });

    it('should not retry non-retryable errors by default', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));
      
      const resultPromise = retryWithBackoff(fn, { maxRetries: 3 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry Conditions', () => {
    it('should use custom shouldRetry function', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('custom error'));
      
      const options: RetryOptions = {
        maxRetries: 3,
        initialDelayMs: 100,
        shouldRetry: (error) => error.message === 'custom error',
      };
      
      const resultPromise = retryWithBackoff(fn, options);
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.attempts).toBe(3);
    });

    it('should stop retrying when shouldRetry returns false', async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw createRetryableError('retryable');
        }
        throw new Error('non-retryable');
      });
      
      const resultPromise = retryWithBackoff(fn, { 
        maxRetries: 5,
        initialDelayMs: 100,
      });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
    });

    it('should retry on HTTP 429 status code', async () => {
      const error429 = Object.assign(new Error('Rate limited'), { status: 429 });
      const fn = vi.fn().mockRejectedValue(error429);
      
      const resultPromise = retryWithBackoff(fn, { 
        maxRetries: 3,
        initialDelayMs: 100,
      });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.attempts).toBe(3);
    });

    it('should retry on HTTP 500 status code', async () => {
      const error500 = Object.assign(new Error('Server error'), { status: 500 });
      const fn = vi.fn().mockRejectedValue(error500);
      
      const resultPromise = retryWithBackoff(fn, { 
        maxRetries: 2,
        initialDelayMs: 100,
      });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.attempts).toBe(2);
    });

    it('should not retry on HTTP 401 status code', async () => {
      const error401 = Object.assign(new Error('Unauthorized'), { status: 401 });
      const fn = vi.fn().mockRejectedValue(error401);
      
      const resultPromise = retryWithBackoff(fn, { maxRetries: 3 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.attempts).toBe(1);
    });
  });

  describe('Callbacks', () => {
    it('should call onRetry callback before each retry', async () => {
      const onRetry = vi.fn();
      const fn = vi.fn().mockRejectedValue(createRetryableError('fail'));
      
      const resultPromise = retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelayMs: 100,
        onRetry,
      });
      await vi.runAllTimersAsync();
      await resultPromise;
      
      expect(onRetry).toHaveBeenCalledTimes(2); // Called before 2nd and 3rd attempt
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), expect.any(Number));
    });

    it('should call onSuccess callback on success', async () => {
      const onSuccess = vi.fn();
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount < 2) {
          throw createRetryableError('fail');
        }
        return 'success';
      });
      
      const resultPromise = retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelayMs: 100,
        onSuccess,
      });
      await vi.runAllTimersAsync();
      await resultPromise;
      
      expect(onSuccess).toHaveBeenCalledWith('success', 2);
    });

    it('should call onFailure callback on final failure', async () => {
      const onFailure = vi.fn();
      const fn = vi.fn().mockRejectedValue(createRetryableError('always fails'));
      
      const resultPromise = retryWithBackoff(fn, {
        maxRetries: 2,
        initialDelayMs: 100,
        onFailure,
      });
      await vi.runAllTimersAsync();
      await resultPromise;
      
      expect(onFailure).toHaveBeenCalledWith(expect.any(Array), 2);
    });
  });

  describe('Delay Calculation', () => {
    it('should respect initialDelayMs', async () => {
      const fn = vi.fn().mockRejectedValue(createRetryableError('fail'));
      
      const resultPromise = retryWithBackoff(fn, {
        maxRetries: 2,
        initialDelayMs: 500,
      });
      
      // First call is immediate
      await vi.advanceTimersByTimeAsync(0);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Should not call again before 500ms
      await vi.advanceTimersByTimeAsync(400);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Should call after 500ms
      await vi.advanceTimersByTimeAsync(100);
      expect(fn).toHaveBeenCalledTimes(2);
      
      await vi.runAllTimersAsync();
      await resultPromise;
    });
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('isRetryableError', () => {
  it('should identify RetryableError', () => {
    const error = new RetryableError('test');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify errors with retryable status codes', () => {
    const error429 = Object.assign(new Error('HTTP 429'), { status: 429 });
    const error500 = Object.assign(new Error('HTTP 500'), { status: 500 });
    const error502 = Object.assign(new Error('HTTP 502'), { status: 502 });
    const error503 = Object.assign(new Error('HTTP 503'), { status: 503 });
    const error504 = Object.assign(new Error('HTTP 504'), { status: 504 });
    
    expect(isRetryableError(error429)).toBe(true);
    expect(isRetryableError(error500)).toBe(true);
    expect(isRetryableError(error502)).toBe(true);
    expect(isRetryableError(error503)).toBe(true);
    expect(isRetryableError(error504)).toBe(true);
  });

  it('should not identify non-retryable status codes', () => {
    const error400 = Object.assign(new Error('HTTP 400'), { status: 400 });
    const error401 = Object.assign(new Error('HTTP 401'), { status: 401 });
    const error404 = Object.assign(new Error('HTTP 404'), { status: 404 });
    
    expect(isRetryableError(error400)).toBe(false);
    expect(isRetryableError(error401)).toBe(false);
    expect(isRetryableError(error404)).toBe(false);
  });

  it('should identify network errors', () => {
    const networkError = new Error('Network request failed');
    const fetchError = new Error('Failed to fetch');
    const connReset = new Error('ECONNRESET');
    
    expect(isRetryableError(networkError)).toBe(true);
    expect(isRetryableError(fetchError)).toBe(true);
    expect(isRetryableError(connReset)).toBe(true);
  });

  it('should not identify generic errors', () => {
    const genericError = new Error('Something went wrong');
    expect(isRetryableError(genericError)).toBe(false);
  });
});

// ============================================
// RETRYABLE ERROR CLASS TESTS
// ============================================

describe('RetryableError', () => {
  it('should create error with message', () => {
    const error = new RetryableError('test message');
    expect(error.message).toBe('test message');
    expect(error.name).toBe('RetryableError');
  });

  it('should be instanceof Error', () => {
    const error = new RetryableError('test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RetryableError);
  });

  it('should include retry metadata', () => {
    const error = new RetryableError('test', { retryAfterMs: 5000 });
    expect(error.retryAfterMs).toBe(5000);
  });
});
