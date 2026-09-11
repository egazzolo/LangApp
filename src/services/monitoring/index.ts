import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { env } from '@/config/env';

const privateAdminRoute = () => typeof window !== 'undefined' && window.location?.pathname.startsWith('/admin');
const sensitiveKey = /(worksheet|answer|activity|filename|authorization|cookie|token|secret|password|email|name|text|message|transcript|prompt|response|content|body|url|uri)/i;
const safeCode = /^[A-Z0-9_.:-]{1,80}$/i;

function scrub(value: unknown, key = '', depth = 0): unknown {
  if (depth > 5 || sensitiveKey.test(key)) return '[Filtered]';
  if (Array.isArray(value)) return value.map((item) => scrub(item, key, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, scrub(child, childKey, depth + 1)]));
  }
  if (typeof value === 'string') return safeCode.test(value) ? value : '[Filtered]';
  return value;
}

export function initializeMonitoring() {
  if (!env.EXPO_PUBLIC_SENTRY_DSN || privateAdminRoute() || (Platform.OS === 'web' && typeof window === 'undefined')) return;
  Sentry.init({
    dsn: env.EXPO_PUBLIC_SENTRY_DSN,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableNative: true,
    enableAutoSessionTracking: true,
    beforeBreadcrumb(breadcrumb) {
      if (privateAdminRoute()) return null;
      if (breadcrumb.category === 'console' || breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') return null;
      return scrub(breadcrumb) as typeof breadcrumb;
    },
    beforeSend(event) {
      if (privateAdminRoute()) return null;
      delete event.user;
      delete event.request;
      delete event.breadcrumbs;
      if (event.exception?.values) event.exception.values = event.exception.values.map((exception) => ({
        ...exception,
        value: exception.type && safeCode.test(exception.value ?? '') ? exception.value : '[Filtered]',
      }));
      event.contexts = scrub(event.contexts) as typeof event.contexts;
      event.extra = scrub(event.extra) as typeof event.extra;
      event.tags = scrub(event.tags) as typeof event.tags;
      return event;
    },
  });
}

export function captureOperationalError(error: unknown, operation: string, code = 'UNKNOWN_ERROR') {
  Sentry.withScope((scope) => {
    scope.setTag('operation', safeCode.test(operation) ? operation : 'unknown');
    scope.setTag('error_code', safeCode.test(code) ? code : 'UNKNOWN_ERROR');
    const sanitized = new Error(safeCode.test(code) ? code : 'UNKNOWN_ERROR');
    sanitized.name = error instanceof Error && safeCode.test(error.name) ? error.name : 'OperationalError';
    Sentry.captureException(sanitized);
  });
}

export const withMonitoring = Sentry.wrap;
