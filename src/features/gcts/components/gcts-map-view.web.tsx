import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  buildBinMarkersData,
  buildLeafletMapHtml,
  buildRouteStopsData,
  formatGeolocationError,
  type GctsMapViewProps,
  type LocationStatusState,
  type MapRouteStop,
  type UserCoordinates,
} from '@/features/gcts/components/gcts-map-shared';
import { MapLocationBanner } from '@/features/gcts/components/map-location-banner';
import { palette } from '@/features/gcts/palette';

export type { GctsMapViewProps, MapRouteStop };

export function GctsMapView({
  bins = [],
  routeStops = [],
  selectedBinId = null,
  onSelectBin,
  onSelectStop,
  height = 360,
}: GctsMapViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocationRef = useRef<UserCoordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatusState>({ status: 'idle' });

  const clearActiveWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchTimerRef.current) {
      clearTimeout(watchTimerRef.current);
      watchTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearActiveWatch();
      if (readyTimerRef.current) {
        clearTimeout(readyTimerRef.current);
      }
    };
  }, [clearActiveWatch]);

  const postToIframe = useCallback((payload: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(payload), '*');
  }, []);

  const scheduleReadyClear = useCallback(() => {
    if (readyTimerRef.current) {
      clearTimeout(readyTimerRef.current);
    }
    readyTimerRef.current = setTimeout(() => {
      setLocationStatus((prev) => (prev.status === 'ready' ? { status: 'idle' } : prev));
    }, 4500);
  }, []);

  const startWebGeolocation = useCallback(
    (silentAutoCheck: boolean) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        const message = 'Geolocation is not supported by this browser.';
        postToIframe({ type: 'locate_done' });
        if (!silentAutoCheck) {
          setLocationStatus({ status: 'error', message });
        }
        return;
      }

      if (!window.isSecureContext) {
        const message = `Location requires http://localhost or HTTPS (current origin: ${window.location.origin}).`;
        postToIframe({ type: 'locate_done' });
        if (!silentAutoCheck) {
          setLocationStatus({ status: 'error', message });
        }
        return;
      }

      if (!silentAutoCheck) {
        setLocationStatus({ status: 'locating', message: 'Finding your location...' });
      }

      clearActiveWatch();
      let gotAnyFix = false;
      let recentered = false;

      const handleFix = (pos: GeolocationPosition, sourceLabel: string) => {
        gotAnyFix = true;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 25;
        const shouldRecenter = !silentAutoCheck && !recentered;
        recentered = true;

        lastLocationRef.current = { lat, lng, accuracy };
        postToIframe({
          type: 'user_location',
          lat,
          lng,
          accuracy,
          recenter: shouldRecenter,
        });

        if (!silentAutoCheck) {
          setLocationStatus({
            status: 'ready',
            message: `Location active (±${Math.round(accuracy)}m)`,
          });
          scheduleReadyClear();
        }

        if (sourceLabel === 'watch' && accuracy <= 25) {
          clearActiveWatch();
        }
      };

      // Stage 1: Fast cached / network fix
      navigator.geolocation.getCurrentPosition(
        (pos) => handleFix(pos, 'fast'),
        (_err) => { /* silent — watch will also try */ },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );

      // Stage 2: High-accuracy watch fallback/refinement
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => handleFix(pos, 'watch'),
        (err) => {
          if (!gotAnyFix) {
            postToIframe({ type: 'locate_done' });
            if (!silentAutoCheck) {
              setLocationStatus({
                status: 'error',
                message: formatGeolocationError(err.code, err.message),
              });
            }
          }
          clearActiveWatch();
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
      );

      watchTimerRef.current = setTimeout(() => {
        clearActiveWatch();
        postToIframe({ type: 'locate_done' });
        if (!gotAnyFix && !silentAutoCheck) {
          setLocationStatus({ status: 'error', message: formatGeolocationError(3) });
        }
      }, 22000);
    },
    [clearActiveWatch, postToIframe, scheduleReadyClear],
  );

  useEffect(() => {
    function onWindowMessage(event: MessageEvent) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        if (data.type === 'select_bin' && onSelectBin) {
          const found = bins.find((b) => b.id === data.binId);
          if (found) onSelectBin(found);
        } else if (data.type === 'select_stop' && onSelectStop) {
          const stop = routeStops[data.index];
          if (stop) onSelectStop(data.index, stop);
        } else if (data.type === 'request_location') {
          startWebGeolocation(false);
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, [bins, routeStops, onSelectBin, onSelectStop, startWebGeolocation]);

  const handleIframeLoad = useCallback(() => {
    const saved = lastLocationRef.current;
    if (saved) {
      postToIframe({
        type: 'user_location',
        lat: saved.lat,
        lng: saved.lng,
        accuracy: saved.accuracy,
        recenter: false,
      });
      return;
    }

    // If permission is already granted on a secure origin, show user dot automatically
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'granted') {
            startWebGeolocation(true);
          }
        })
        .catch(() => {
          // Permissions API not supported — user can tap Locate button
        });
    }
  }, [postToIframe, startWebGeolocation]);

  const binMarkersData = useMemo(
    () => buildBinMarkersData(bins, selectedBinId),
    [bins, selectedBinId],
  );

  const routeStopsData = useMemo(
    () => buildRouteStopsData(routeStops),
    [routeStops],
  );

  const htmlContent = useMemo(
    () => buildLeafletMapHtml(binMarkersData, routeStopsData),
    [binMarkersData, routeStopsData],
  );

  return (
    <View style={[styles.container, { height }]}>
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        onLoad={handleIframeLoad}
        title="Fort Portal Map"
        allow="geolocation *"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: 'transparent',
        }}
      />
      <MapLocationBanner
        state={locationStatus}
        onDismiss={() => setLocationStatus({ status: 'idle' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#E8EDE9',
  },
});
