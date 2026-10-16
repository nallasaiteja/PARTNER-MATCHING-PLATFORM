/**
 * Centralized API & Media Configuration
 *
 * Supports:
 * - Web local development (defaults to relative '/api/v1', proxied by Vite to http://localhost:3000)
 * - Web production (relative '/api/v1' or custom VITE_API_BASE_URL)
 * - Mobile / Capacitor / External environments (configured via VITE_API_BASE_URL or VITE_API_URL)
 */

function getEnvVar(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
    return (import.meta as any).env[key];
  }
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
  if (g && g.process && g.process.env) {
    return g.process.env[key];
  }
  return undefined;
}

function resolveApiBaseUrl(): string {
  const configured =
    getEnvVar('VITE_API_BASE_URL') ||
    getEnvVar('VITE_API_URL');

  if (configured && typeof configured === 'string' && configured.trim() !== '') {
    const trimmed = configured.trim().replace(/\/+$/, '');
    // If user supplied 'http://localhost:3000', append '/api/v1'
    // If user already supplied 'http://localhost:3000/api/v1', preserve it
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }

  // Fallback to relative '/api/v1' for web (preserves existing dev server proxy & same-origin deployment)
  return '/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Resolves the server origin (protocol + host) for media and static assets.
 */
export function getBackendOrigin(): string {
  const configured =
    getEnvVar('VITE_API_BASE_URL') ||
    getEnvVar('VITE_API_URL');

  if (configured && typeof configured === 'string' && configured.trim() !== '') {
    return configured.trim().replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
  }

  // Fallback to relative host (browser origin in development or reverse-proxy production)
  return typeof window !== 'undefined' && window.location ? window.location.origin : '';
}

/**
 * Resolves any media/file URL (photos, public documents, CDN assets) to an accessible URL.
 * - Absolute URLs (https://, http://, blob:, data:) are preserved as-is.
 * - Relative URLs (e.g. '/uploads/photos/xyz.jpg') are resolved with backend origin when needed.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') return '';
  const trimmed = url.trim();

  // Already absolute or browser memory URL
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  const configured =
    getEnvVar('VITE_API_BASE_URL') ||
    getEnvVar('VITE_API_URL');

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // If a mobile or external backend URL is configured, prepend the backend host
  if (configured && typeof configured === 'string' && configured.trim() !== '') {
    const origin = configured.trim().replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
    return `${origin}${cleanPath}`;
  }

  // Otherwise return the relative path (proxied by Vite or served from same origin)
  return cleanPath;
}

/**
 * Validates a file's size and MIME type before uploading.
 */
export function validateUploadFile(
  file: File | Blob,
  options: {
    maxBytes: number;
    allowedMimes?: string[];
    label?: string;
  },
): { valid: boolean; error?: string } {
  const label = options.label || 'File';

  if (!file) {
    return { valid: false, error: `No ${label.toLowerCase()} selected.` };
  }

  if (file.size > options.maxBytes) {
    const maxMb = (options.maxBytes / (1024 * 1024)).toFixed(1);
    const maxKb = Math.round(options.maxBytes / 1024);
    const limitStr = options.maxBytes >= 1024 * 1024 ? `${maxMb}MB` : `${maxKb}KB`;
    return { valid: false, error: `${label} must be smaller than ${limitStr}.` };
  }

  if (options.allowedMimes && options.allowedMimes.length > 0 && file.type) {
    const isAllowed = options.allowedMimes.some((mime) => {
      if (mime.endsWith('/*')) {
        return file.type.startsWith(mime.slice(0, -1));
      }
      return file.type === mime;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `${label} type not supported (${file.type}). Allowed types: ${options.allowedMimes.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Builds standard Bearer authentication headers from localStorage
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Builds Authorization header without forcing Content-Type (useful for FormData / Multipart uploads)
 */
export function getAuthorizationHeader(): HeadersInit {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Performs an upload with real-time progress tracking via XMLHttpRequest.
 * Works seamlessly in both web browsers and mobile WebViews/Capacitor.
 */
export function uploadWithProgress<T = any>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url, true);

    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        data = { message: xhr.statusText };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve(data);
      } else {
        const errorMsg = data.message || `Upload failed (${xhr.status})`;
        reject(new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during file upload. Please check your connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Please try again.'));
    };

    xhr.send(formData);
  });
}
