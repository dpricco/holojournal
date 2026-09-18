import { gapi } from 'gapi-script';
import { useAppStore } from '../store/useAppStore';

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  'https://docs.googleapis.com/$discovery/rest?version=v1'
];
const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents';

let tokenClient: any;
let authPromise: Promise<boolean> | null = null;

/**
 * Robustly ensures both Google API client (gapi) and Google Identity Services (GIS)
 * are fully downloaded and initialized on window before proceeding.
 */
const ensureGoogleServicesLoaded = (maxRetries = 25, intervalMs = 200): Promise<{ gapi: any; google: any }> => {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const check = () => {
      const g = (window as any).gapi || gapi;
      const google = (window as any).google;

      const gapiReady = g && typeof g.load === 'function';
      const gisReady = Boolean(google && google.accounts && google.accounts.oauth2);

      if (gapiReady && gisReady) {
        resolve({ gapi: g, google });
        return;
      }

      retries++;

      // Inject GAPI if missing from DOM
      if (!gapiReady && !document.getElementById('google-gapi-script')) {
        const s = document.createElement('script');
        s.id = 'google-gapi-script';
        s.src = 'https://apis.google.com/js/api.js';
        document.head.appendChild(s);
      }

      // Inject GIS if missing from DOM
      if (!gisReady && !document.getElementById('google-gis-script')) {
        const s = document.createElement('script');
        s.id = 'google-gis-script';
        s.src = 'https://accounts.google.com/gsi/client';
        document.head.appendChild(s);
      }

      if (retries >= maxRetries) {
        reject(new Error('Timeout waiting for Google scripts to load'));
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
};

export const loadGapiAndAuthenticate = async (): Promise<boolean> => {
  if (authPromise) {
    return authPromise;
  }

  authPromise = (async () => {
    const clientId = useAppStore.getState().googleClientId;
    
    if (!clientId) {
      console.error('No Google Client ID provided');
      return false;
    }

    // Await both scripts to be fully initialized on the window
    const { gapi: gapiInstance, google: googleInstance } = await ensureGoogleServicesLoaded();

    return new Promise<boolean>((resolve, reject) => {
      // 1. Load GAPI client
      gapiInstance.load('client', async () => {
        try {
          // 2. Initialize GAPI client with discovery docs (no clientId or scopes here)
          await gapiInstance.client.init({
            discoveryDocs: DISCOVERY_DOCS,
          });

          // 3. Initialize the token client
          tokenClient = googleInstance.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: (tokenResponse: any) => {
              if (tokenResponse.error !== undefined) {
                console.error('GIS Token Error detailed object:', tokenResponse);
                useAppStore.getState().setAuthenticated(false);
                reject(tokenResponse);
              } else {
                console.log('GIS Token Success:', tokenResponse);
                // The token is automatically set in gapi.client by GIS
                useAppStore.getState().setAuthenticated(true);
                resolve(true);
              }
            },
            error_callback: (error: any) => {
              console.error('GIS initialization/popup error:', error);
              reject(error);
            }
          });

          // 4. Trigger the auth flow
          tokenClient.requestAccessToken();

        } catch (error) {
          console.error('Error initializing GAPI client / GIS:', error);
          useAppStore.getState().setAuthenticated(false);
          reject(error);
        }
      });
    });
  })();

  try {
    const result = await authPromise;
    return result;
  } finally {
    authPromise = null;
  }
};

export const signOut = () => {
  try {
    const g = (window as any).gapi || gapi;
    const token = g?.client?.getToken?.();
    if (token && (window as any).google?.accounts?.oauth2?.revoke) {
      (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
        if (g?.client) g.client.setToken(null);
        useAppStore.getState().setAuthenticated(false);
      });
    } else {
      useAppStore.getState().setAuthenticated(false);
    }
  } catch {
    useAppStore.getState().setAuthenticated(false);
  }
};
