import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getPlatformInfo, initializeNativeApp } from '../src/services/nativeService.ts';

describe('Capacitor Native Service & Web Fallbacks', () => {
  test('getPlatformInfo returns web platform in node/browser environment', () => {
    const info = getPlatformInfo();
    assert.strictEqual(info.isNative, false);
    assert.strictEqual(info.platform, 'web');
  });

  test('initializeNativeApp safely no-ops and returns cleanup function in non-native environment', () => {
    let navigatedTo: string | number | null = null;
    const mockNavigate = (to: string | number) => {
      navigatedTo = to;
    };

    const cleanup = initializeNativeApp(mockNavigate);
    assert.strictEqual(typeof cleanup, 'function');
    
    // Cleanup should execute cleanly without throwing
    assert.doesNotThrow(() => cleanup());
    assert.strictEqual(navigatedTo, null);
  });
});
