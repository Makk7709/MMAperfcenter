import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// ============================================
// MOCK CONFIG - Global state for video mock
// ============================================

interface MockVideoConfig {
  duration: number;
  videoWidth: number;
  videoHeight: number;
  shouldError: boolean;
}

// Use a global object that can be mutated
const mockConfig: MockVideoConfig = {
  duration: 30,
  videoWidth: 1920,
  videoHeight: 1080,
  shouldError: false,
};

export function setMockVideoConfig(config: Partial<MockVideoConfig>) {
  Object.assign(mockConfig, config);
}

export function resetMockVideoConfig() {
  mockConfig.duration = 30;
  mockConfig.videoWidth = 1920;
  mockConfig.videoHeight = 1080;
  mockConfig.shouldError = false;
}

// ============================================
// URL MOCKS
// ============================================

global.URL.createObjectURL = vi.fn(() => 'blob:mock-url-' + Math.random());
global.URL.revokeObjectURL = vi.fn();

// ============================================
// CANVAS MOCK
// ============================================

HTMLCanvasElement.prototype.getContext = function(contextId: string) {
  if (contextId === '2d') {
    return {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => {
        const width = 100;
        const height = 100;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < data.length; i += 4) {
          const baseValue = 100 + Math.floor(Math.random() * 50);
          data[i] = baseValue;
          data[i + 1] = baseValue;
          data[i + 2] = baseValue;
          data[i + 3] = 255;
        }
        return { data, width, height, colorSpace: 'srgb' };
      }),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
} as any;

HTMLCanvasElement.prototype.toDataURL = function(type?: string) {
  const format = type === 'image/webp' ? 'webp' : 'jpeg';
  return `data:image/${format};base64,/9j/4AAQSkZJRgMOCK_${Math.random().toString(36)}`;
} as any;

HTMLCanvasElement.prototype.remove = vi.fn() as any;

// ============================================
// VIDEO ELEMENT MOCK - Using prototype override
// ============================================

// Store callbacks per video instance
const videoCallbacks = new WeakMap<object, {
  onloadedmetadata?: () => void;
  onseeked?: () => void;
  onerror?: (e: any) => void;
}>();

const videoState = new WeakMap<object, {
  src: string;
  currentTime: number;
}>();

// Override video element properties
Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
  get() { return mockConfig.duration; },
  configurable: true,
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  get() { return mockConfig.videoWidth; },
  configurable: true,
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  get() { return mockConfig.videoHeight; },
  configurable: true,
});

Object.defineProperty(HTMLVideoElement.prototype, 'src', {
  get() { 
    const state = videoState.get(this) || { src: '', currentTime: 0 };
    return state.src;
  },
  set(value: string) {
    let state = videoState.get(this);
    if (!state) {
      state = { src: '', currentTime: 0 };
      videoState.set(this, state);
    }
    state.src = value;
    
    const callbacks = videoCallbacks.get(this) || {};
    
    setTimeout(() => {
      if (mockConfig.shouldError) {
        if (callbacks.onerror) {
          callbacks.onerror(new Error('Mock video error'));
        }
      } else {
        if (callbacks.onloadedmetadata) {
          callbacks.onloadedmetadata();
        }
      }
    }, 5);
  },
  configurable: true,
});

Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
  get() {
    const state = videoState.get(this) || { src: '', currentTime: 0 };
    return state.currentTime;
  },
  set(value: number) {
    let state = videoState.get(this);
    if (!state) {
      state = { src: '', currentTime: 0 };
      videoState.set(this, state);
    }
    state.currentTime = value;
    
    const callbacks = videoCallbacks.get(this) || {};
    
    setTimeout(() => {
      if (callbacks.onseeked) {
        callbacks.onseeked();
      }
    }, 2);
  },
  configurable: true,
});

Object.defineProperty(HTMLVideoElement.prototype, 'onloadedmetadata', {
  set(handler: () => void) {
    let callbacks = videoCallbacks.get(this);
    if (!callbacks) {
      callbacks = {};
      videoCallbacks.set(this, callbacks);
    }
    callbacks.onloadedmetadata = handler;
  },
  configurable: true,
});

Object.defineProperty(HTMLVideoElement.prototype, 'onseeked', {
  set(handler: () => void) {
    let callbacks = videoCallbacks.get(this);
    if (!callbacks) {
      callbacks = {};
      videoCallbacks.set(this, callbacks);
    }
    callbacks.onseeked = handler;
  },
  configurable: true,
});

Object.defineProperty(HTMLVideoElement.prototype, 'onerror', {
  set(handler: (e: any) => void) {
    let callbacks = videoCallbacks.get(this);
    if (!callbacks) {
      callbacks = {};
      videoCallbacks.set(this, callbacks);
    }
    callbacks.onerror = handler;
  },
  configurable: true,
});

HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined) as any;
HTMLVideoElement.prototype.pause = vi.fn() as any;
HTMLVideoElement.prototype.load = vi.fn() as any;

// ============================================
// LIFECYCLE
// ============================================

beforeEach(() => {
  vi.clearAllMocks();
  resetMockVideoConfig();
});
