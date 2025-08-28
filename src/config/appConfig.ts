import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

interface ExtraConfig {
  backendUrl?: string;
}

export function getBackendBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
  let url = '';

  // 1) Highest priority: public env var (easy to override per device)
  const envUrl = (process.env.EXPO_PUBLIC_BACKEND_URL ?? '').trim();
  if (envUrl) url = envUrl;

  // 2) Next: app.json extra.backendUrl
  if (!url) url = (extra.backendUrl || '').trim();

  const isLocalhost = (u: string) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(u);

  // Helpers to get dev host
  const getHostFromExpo = (): string | null => {
    const hostUri = (Constants.expoConfig as any)?.hostUri as string | undefined;
    if (!hostUri) return null;
    const host = hostUri.split(':')[0];
    if (!host || host === 'localhost' || host === '127.0.0.1') return null;
    return host;
  };
  const getHostFromScriptURL = (): string | null => {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
    if (!scriptURL) return null;
    try {
      const u = new URL(scriptURL);
      const host = u.hostname;
      if (!host || host === 'localhost' || host === '127.0.0.1') return null;
      return host;
    } catch {
      return null;
    }
  };

  // If localhost is configured, replace with LAN host if we can detect it
  if (url && isLocalhost(url)) {
    const detectedHost = getHostFromExpo() ?? getHostFromScriptURL();
    if (detectedHost) {
      url = `http://${detectedHost}:8082`;
    } else if (Platform.OS === 'android') {
      // Android emulator maps host to 10.0.2.2
      url = 'http://10.0.2.2:8082';
    }
  }

  // If still empty, try to infer from dev host
  if (!url) {
    const detectedHost = getHostFromExpo() ?? getHostFromScriptURL();
    if (detectedHost) {
      url = `http://${detectedHost}:8082`;
    }
  }

  if (!url) {
    // Final fallback (simulators or when nothing detectable)
    url = Platform.OS === 'android' ? 'http://10.0.2.2:8082' : 'http://localhost:8082';
  }

  // Normalize by removing trailing slashes
  url = url.replace(/\/+$/, '');

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[Config] Backend base URL:', url);
  }
  return url;
}
