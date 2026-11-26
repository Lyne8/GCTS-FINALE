import * as Location from 'expo-location';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  buildBinMarkersData,
  buildLeafletMapHtml,
  buildRouteStopsData,
  type GctsMapViewProps,
  type LocationStatusState,
  type MapRouteStop,
  type UserCoordinates,
} from '@/features/gcts/components/gcts-map-shared';
import { MapLocationBanner } from '@/features/gcts/components/map-location-banner';
import { palette } from '@/features/gcts/palette';

export type { GctsMapViewProps, MapRouteStop };

const WebViewComponent = WebView as unknown as React.ComponentType<any>;

export function GctsMapView({
  bins = [],
  routeStops = [],
  selectedBinId = null,
  onSelectBin,
  onSelectStop,
  height = 360,
}: GctsMapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const lastLocationRef = useRef<UserCoordinates | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatusState>({ status: 'idle' });

  useEffect(() => {
    return () => {
      if (readyTimerRef.current) {
        clearTimeout(readyTimerRef.current);
      }
    };
  }, []);

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

  const scheduleReadyClear = useCallback(() => {
    if (readyTimerRef.current) {
      clearTimeout(readyTimerRef.current);
    }
    readyTimerRef.current = setTimeout(() => {
      setLocationStatus((prev) => (prev.status === 'ready' ? { status: 'idle' } : prev));
    }, 4500);
  }, []);

  const pushLocationToWebView = useCallback((coords: UserCoordinates, recenter: boolean) => {
    lastLocationRef.current = coords;
    webViewRef.current?.injectJavaScript(
      `window.__gctsApplyUserLocation && window.__gctsApplyUserLocation(${coords.lat}, ${coords.lng}, ${coords.accuracy}, ${recenter}); true;`,
    );
  }, []);

  const stopWebViewSpinner = useCallback(() => {
    webViewRef.current?.injectJavaScript(
      'window.__gctsStopLocating && window.__gctsStopLocating(); true;',
    );
  }, []);

  const fetchNativeLocation = useCallback(
    async (interactive: boolean) => {
      if (readyTimerRef.current) {
        clearTimeout(readyTimerRef.current);
      }

      if (interactive) {
        setLocationStatus({ status: 'locating', message: 'Finding your location...' });
      }

      try {
        const perm = interactive
          ? await Location.requestForegroundPermissionsAsync()
          : await Location.getForegroundPermissionsAsync();

        if (perm.status !== 'granted') {
          if (interactive) {
            stopWebViewSpinner();
            setLocationStatus({
              status: 'error',
              message: 'Location permission denied. Enable location access in device settings.',
            });
          }
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (interactive) {
            stopWebViewSpinner();
            setLocationStatus({
              status: 'error',
              message: 'Device Location is turned off. Turn on Location/GPS and try again.',
            });
          }
          return;
        }

        let appliedInitial = false;
        const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 300000 });
        if (lastKnown) {
          const cachedCoords: UserCoordinates = {
            lat: lastKnown.coords.latitude,
            lng: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy ?? 40,
          };
          pushLocationToWebView(cachedCoords, interactive);
          appliedInitial = true;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const freshCoords: UserCoordinates = {
          lat: current.coords.latitude,
          lng: current.coords.longitude,
          accuracy: current.coords.accuracy ?? 20,
        };
        pushLocationToWebView(freshCoords, interactive && !appliedInitial);

        if (interactive) {
          setLocationStatus({
            status: 'ready',
            message: `Location active (±${Math.round(freshCoords.accuracy)}m)`,
          });
          scheduleReadyClear();
        }
      } catch {
        if (interactive) {
          stopWebViewSpinner();
          setLocationStatus({
            status: 'error',
            message: 'Could not get current location. Ensure GPS/Location is enabled and try again.',
          });
        }
      }
    },
    [pushLocationToWebView, scheduleReadyClear, stopWebViewSpinner],
  );

  const handleWebViewLoadEnd = useCallback(() => {
    const saved = lastLocationRef.current;
    if (saved) {
      pushLocationToWebView(saved, false);
      return;
    }
    void fetchNativeLocation(false);
  }, [fetchNativeLocation, pushLocationToWebView]);

  function handleMessage(event: { nativeEvent: { data: string } }) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'select_bin' && onSelectBin) {
        const found = bins.find((b) => b.id === data.binId);
        if (found) onSelectBin(found);
      } else if (data.type === 'select_stop' && onSelectStop) {
        const stop = routeStops[data.index];
        if (stop) onSelectStop(data.index, stop);
      } else if (data.type === 'request_location') {
        void fetchNativeLocation(true);
      }
    } catch {
      // Ignore unparseable message
    }
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebViewComponent
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'https://localhost' }}
        onMessage={handleMessage}
        onLoadEnd={handleWebViewLoadEnd}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={styles.webView}
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
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
