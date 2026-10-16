import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export interface NativePlatformInfo {
  isNative: boolean;
  platform: 'android' | 'ios' | 'web';
}

/**
 * Returns current platform runtime information
 */
export function getPlatformInfo(): NativePlatformInfo {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  return { isNative, platform };
}

/**
 * Initialize native device capabilities (StatusBar, Back Button, Safe areas)
 * Safely no-ops in standard web browsers.
 */
export function initializeNativeApp(navigate?: (to: string | number) => void): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  // 1. Configure Native Status Bar
  try {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#800020' }).catch(() => {});
    }
  } catch (err) {
    console.debug('StatusBar initialization skipped:', err);
  }

  // 2. Register Android Hardware Back Button listener
  let backListenerRemove: (() => void) | undefined;
  try {
    const handleBackButton = CapApp.addListener('backButton', ({ canGoBack }) => {
      const currentPath = window.location.pathname;
      const rootPaths = ['/', '/member/dashboard', '/admin/dashboard', '/agent/dashboard', '/branch/dashboard'];
      
      if (rootPaths.includes(currentPath)) {
        // Exit app if on main landing / root dashboard
        CapApp.exitApp();
      } else if (navigate) {
        navigate(-1);
      } else if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });

    handleBackButton.then((listener) => {
      backListenerRemove = () => listener.remove();
    }).catch(() => {});
  } catch (err) {
    console.debug('BackButton listener skipped:', err);
  }

  return () => {
    if (backListenerRemove) {
      backListenerRemove();
    }
  };
}

/**
 * Native camera / photo picker helper
 * Falls back cleanly in web browsers
 */
export async function pickPhotoFromDevice(): Promise<{ file?: File; webPath?: string } | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt, // Prompts user: Camera or Photo Library
      });

      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.${photo.format || 'jpg'}`, {
          type: blob.type || 'image/jpeg',
        });
        return { file, webPath: photo.webPath };
      }
    } catch (err) {
      console.warn('Native photo picker was cancelled or failed:', err);
      return null;
    }
  }

  // Standard web browser fallback: file input prompt
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        const webPath = URL.createObjectURL(file);
        resolve({ file, webPath });
      } else {
        resolve(null);
      }
    };
    input.click();
  });
}
