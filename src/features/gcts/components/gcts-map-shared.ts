import type { WasteBin } from '@/features/gcts/domain/bin';
import { getBinUrgency } from '@/features/gcts/domain/bin';
import { palette } from '@/features/gcts/palette';

export type MapRouteStop = {
  binId: string;
  name: string;
  status?: 'pending' | 'collected' | 'skipped';
  latitude?: number | null;
  longitude?: number | null;
  fillLevelPercent?: number | null;
  code?: string | null;
};

export type GctsMapViewProps = {
  bins?: WasteBin[];
  routeStops?: MapRouteStop[];
  selectedBinId?: string | null;
  onSelectBin?: (bin: WasteBin) => void;
  onSelectStop?: (stopIndex: number, stop: MapRouteStop) => void;
  height?: number;
};

export type UserCoordinates = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type LocationStatusState =
  | { status: 'idle' }
  | { status: 'locating'; message: string }
  | { status: 'ready'; message: string }
  | { status: 'error'; message: string };

const FORT_PORTAL_CENTER = { lat: 0.6565, lng: 30.276 };

export function buildBinMarkersData(bins: WasteBin[], selectedBinId: string | null) {
  return bins
    .filter((b) => typeof b.latitude === 'number' && typeof b.longitude === 'number')
    .map((b) => {
      const urgency = getBinUrgency(b.fillLevelPercent, b.lastReadingAt ?? null);
      let color = '#2E7D32';
      if (urgency === 'collection_due') color = '#D32F2F';
      else if (urgency === 'nearly_full') color = '#F59E0B';
      else if (urgency === 'unknown') color = '#78909C';

      return {
        id: b.id,
        name: b.name,
        code: b.code,
        lat: b.latitude,
        lng: b.longitude,
        fill: b.fillLevelPercent,
        color,
        selected: b.id === selectedBinId,
      };
    });
}

export function buildRouteStopsData(routeStops: MapRouteStop[]) {
  return routeStops
    .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
    .map((s, index) => {
      const urgency = getBinUrgency(s.fillLevelPercent ?? null, null);
      let color = '#2E7D32';
      if (s.status === 'collected') {
        color = '#2E7D32';
      } else if (s.status === 'skipped') {
        color = '#78909C';
      } else if (urgency === 'collection_due') {
        color = '#D32F2F';
      } else if (urgency === 'nearly_full') {
        color = '#F59E0B';
      }

      return {
        binId: s.binId,
        name: s.name,
        code: s.code ?? '',
        lat: s.latitude,
        lng: s.longitude,
        step: index + 1,
        color,
        fill: s.fillLevelPercent ?? null,
        status: s.status ?? 'pending',
      };
    });
}

export function formatGeolocationError(code: number | undefined, rawMessage?: string): string {
  const msg = rawMessage ?? '';
  if (code === 1) {
    if (/secure origin/i.test(msg)) {
      return 'Location blocked on insecure HTTP URL. Use http://localhost or HTTPS.';
    }
    return 'Location permission denied. Allow location access in your browser or device settings.';
  }
  if (code === 2) {
    return 'Location unavailable. Ensure device Location/GPS or Wi-Fi positioning is enabled.';
  }
  if (code === 3) {
    return 'Location timed out. Turn on device GPS/Location and try near a window or outdoors.';
  }
  return msg ? `Location error: ${msg}` : 'Unable to determine your current location.';
}

export function buildLeafletMapHtml(
  binMarkersData: ReturnType<typeof buildBinMarkersData>,
  routeStopsData: ReturnType<typeof buildRouteStopsData>,
): string {
  const serializedBins = JSON.stringify(binMarkersData);
  const serializedStops = JSON.stringify(routeStopsData);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #E8EDE9;
    }
    .custom-marker {
      background: none;
      border: none;
    }
    .bin-marker-wrap, .stop-marker-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      user-select: none;
      filter: drop-shadow(0 2px 5px rgba(0,0,0,0.28));
      transition: transform 0.15s ease;
    }
    .bin-marker-wrap:hover, .stop-marker-wrap:hover {
      transform: scale(1.08);
    }
    .pin-selected {
      transform: scale(1.18) !important;
      filter: drop-shadow(0 0 6px #12211B) drop-shadow(0 4px 10px rgba(0,0,0,0.45)) !important;
    }

    /* Live User Location Pulsing Dot */
    .user-location-marker {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-location-pulse {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #2563EB;
      border: 3px solid #FFFFFF;
      box-shadow: 0 0 10px rgba(37, 99, 235, 0.65);
      position: relative;
    }
    .user-location-pulse::after {
      content: '';
      position: absolute;
      top: -6px;
      left: -6px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.35);
      animation: pulse-ring 2s infinite ease-out;
    }
    @keyframes pulse-ring {
      0% {
        transform: scale(0.6);
        opacity: 0.9;
      }
      80%, 100% {
        transform: scale(2.2);
        opacity: 0;
      }
    }

    /* Locate Button */
    .leaflet-control-locate {
      background: #FFFFFF;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.22);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-top: 10px;
      transition: background 0.15s;
    }
    .leaflet-control-locate:hover {
      background: #F1F5F2;
    }
    .leaflet-control-locate.locating svg {
      animation: spin 1.2s infinite linear;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Popup Card */
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      padding: 0;
      overflow: hidden;
    }
    .leaflet-popup-content {
      margin: 10px 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .popup-title {
      font-size: 13px;
      font-weight: 800;
      color: #1C2823;
    }
    .popup-sub {
      font-size: 10px;
      color: #718078;
      margin-top: 1px;
      margin-bottom: 6px;
    }
    .popup-bar {
      height: 6px;
      background: #E4EAE5;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 4px;
    }
    .popup-bar-fill {
      height: 100%;
      border-radius: 3px;
    }
    .popup-meta {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function postToHost(payload) {
      var raw = JSON.stringify(payload);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(raw);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(raw, '*');
      }
    }

    function escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    var map = L.map('map', {
      center: [${FORT_PORTAL_CENTER.lat}, ${FORT_PORTAL_CENTER.lng}],
      zoom: 14,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    var bins = ${serializedBins};
    var stops = ${serializedStops};
    var bounds = [];

    function createBinMarkerSvg(bin) {
      var fillText = bin.fill !== null ? bin.fill + '%' : '—';
      var fillPct = bin.fill !== null ? Math.max(0, Math.min(100, bin.fill)) : 0;
      var fillH = Math.round(22 * (fillPct / 100));
      var fillY = 12 + 22 - fillH;

      var fillLevelRect = bin.fill !== null
        ? '<rect x="9" y="' + fillY + '" width="20" height="' + fillH + '" rx="1" fill="' + bin.color + '" opacity="0.95"/>'
        : '';

      return '<div class="bin-marker-wrap' + (bin.selected ? ' pin-selected' : '') + '">' +
        '<svg width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<rect x="14" y="2" width="10" height="3" rx="1.5" fill="' + bin.color + '" stroke="#FFFFFF" stroke-width="1"/>' +
          '<rect x="5" y="5" width="28" height="5" rx="2.5" fill="' + bin.color + '" stroke="#FFFFFF" stroke-width="1.2"/>' +
          '<rect x="7" y="10" width="24" height="26" rx="3" fill="#FFFFFF" stroke="' + bin.color + '" stroke-width="2"/>' +
          '<rect x="9" y="12" width="20" height="22" rx="2" fill="#EEF2F0"/>' +
          fillLevelRect +
          '<rect x="8" y="17" width="22" height="12" rx="3" fill="#12211B" opacity="0.88"/>' +
          '<text x="19" y="23.5" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="900" font-size="' + (bin.fill === 100 ? 7.5 : 8.5) + '" fill="#FFFFFF">' + fillText + '</text>' +
          '<polygon points="14,36 24,36 19,46" fill="' + bin.color + '" stroke="#FFFFFF" stroke-width="1"/>' +
        '</svg>' +
      '</div>';
    }

    function createStopMarkerSvg(stop) {
      var bodyContent = '';
      if (stop.status === 'collected') {
        bodyContent =
          '<rect x="9" y="20" width="20" height="20" rx="2" fill="#2E7D32"/>' +
          '<text x="19" y="30" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="900" font-size="13" fill="#FFFFFF">✓</text>';
      } else if (stop.status === 'skipped') {
        bodyContent =
          '<rect x="9" y="20" width="20" height="20" rx="2" fill="#78909C"/>' +
          '<text x="19" y="30" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="900" font-size="12" fill="#FFFFFF">✕</text>';
      } else {
        var fillText = stop.fill !== null ? stop.fill + '%' : '—';
        var fillPct = stop.fill !== null ? Math.max(0, Math.min(100, stop.fill)) : 0;
        var fillH = Math.round(20 * (fillPct / 100));
        var fillY = 20 + 20 - fillH;

        var fillRect = stop.fill !== null
          ? '<rect x="9" y="' + fillY + '" width="20" height="' + fillH + '" rx="1" fill="' + stop.color + '" opacity="0.95"/>'
          : '';

        bodyContent =
          '<rect x="9" y="20" width="20" height="20" rx="2" fill="#EEF2F0"/>' +
          fillRect +
          '<rect x="8" y="24" width="22" height="12" rx="3" fill="#12211B" opacity="0.88"/>' +
          '<text x="19" y="30" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="900" font-size="' + (stop.fill === 100 ? 7.5 : 8.5) + '" fill="#FFFFFF">' + fillText + '</text>';
      }

      return '<div class="stop-marker-wrap">' +
        '<svg width="38" height="52" viewBox="0 0 38 52" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="19" cy="8" r="7" fill="#12211B" stroke="#FFFFFF" stroke-width="1.5"/>' +
          '<text x="19" y="8" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="900" font-size="8.5" fill="#FFFFFF">' + stop.step + '</text>' +
          '<rect x="5" y="15" width="28" height="4.5" rx="2" fill="' + stop.color + '" stroke="#FFFFFF" stroke-width="1.2"/>' +
          '<rect x="7" y="19" width="24" height="22" rx="3" fill="#FFFFFF" stroke="' + stop.color + '" stroke-width="2"/>' +
          bodyContent +
          '<polygon points="14,41 24,41 19,50" fill="' + stop.color + '" stroke="#FFFFFF" stroke-width="1"/>' +
        '</svg>' +
      '</div>';
    }

    bins.forEach(function(bin) {
      bounds.push([bin.lat, bin.lng]);
      var fillText = bin.fill !== null ? bin.fill + '%' : '—';

      var customIcon = L.divIcon({
        className: 'custom-marker',
        html: createBinMarkerSvg(bin),
        iconSize: [38, 48],
        iconAnchor: [19, 46],
        popupAnchor: [0, -42]
      });

      var marker = L.marker([bin.lat, bin.lng], { icon: customIcon }).addTo(map);

      var urgencyText = bin.fill !== null
        ? (bin.fill >= 85 ? 'Collection Due' : (bin.fill >= 70 ? 'Nearly Full' : 'Available'))
        : 'Status unknown';
      var popupHtml = '<div class="popup-title">' + escapeHtml(bin.name) + '</div>' +
        '<div class="popup-sub">' + escapeHtml(bin.code || 'Bin location') + '</div>' +
        (bin.fill !== null
          ? '<div class="popup-bar"><div class="popup-bar-fill" style="width: ' + bin.fill + '%; background-color: ' + bin.color + ';"></div></div>'
          : '') +
        '<div class="popup-meta"><span style="color: ' + bin.color + ';">' + urgencyText + '</span><span>' + fillText + '</span></div>';

      marker.bindPopup(popupHtml, { offset: [0, -22] });

      marker.on('click', function() {
        postToHost({ type: 'select_bin', binId: bin.id });
      });
    });

    if (stops.length > 0) {
      var stopCoords = [];
      stops.forEach(function(stop, idx) {
        stopCoords.push([stop.lat, stop.lng]);
        bounds.push([stop.lat, stop.lng]);

        var stopIcon = L.divIcon({
          className: 'custom-marker',
          html: createStopMarkerSvg(stop),
          iconSize: [38, 52],
          iconAnchor: [19, 50],
          popupAnchor: [0, -46]
        });

        var marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(map);

        var stopStatusText = stop.status === 'collected'
          ? 'Collected'
          : stop.status === 'skipped'
          ? 'Skipped'
          : 'Pending collection';

        var stopPopupHtml = '<div class="popup-title">Stop ' + stop.step + ': ' + escapeHtml(stop.name) + '</div>' +
          '<div class="popup-sub">' + (stop.code ? escapeHtml(stop.code) + ' • ' : '') + 'Status: ' + stopStatusText + '</div>' +
          (stop.fill !== null
            ? '<div class="popup-bar"><div class="popup-bar-fill" style="width: ' + stop.fill + '%; background-color: ' + stop.color + ';"></div></div>' +
              '<div class="popup-meta"><span style="color: ' + stop.color + ';">Fill Level</span><span>' + stop.fill + '%</span></div>'
            : '');

        marker.bindPopup(stopPopupHtml, { offset: [0, -26] });

        marker.on('click', function() {
          postToHost({ type: 'select_stop', index: idx, binId: stop.binId });
        });
      });

      L.polyline(stopCoords, {
        color: '${palette.forest}',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
        lineJoin: 'round'
      }).addTo(map);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }

    var userLocationMarker = null;
    var userAccuracyCircle = null;

    var LocateControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function() {
        var container = L.DomUtil.create('div', 'leaflet-control-locate');
        container.title = 'Show my current location';
        container.innerHTML =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#12211B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="12" cy="12" r="7"/>' +
            '<line x1="12" y1="2" x2="12" y2="5"/>' +
            '<line x1="12" y1="19" x2="12" y2="22"/>' +
            '<line x1="2" y1="12" x2="5" y2="12"/>' +
            '<line x1="19" y1="12" x2="22" y2="12"/>' +
          '</svg>';

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(container, 'click', function() {
          container.classList.add('locating');
          postToHost({ type: 'request_location' });
        });

        return container;
      }
    });

    map.addControl(new LocateControl());

    window.__gctsStopLocating = function() {
      var controlEl = document.querySelector('.leaflet-control-locate');
      if (controlEl) controlEl.classList.remove('locating');
    };

    window.__gctsApplyUserLocation = function(lat, lng, accuracy, shouldRecenter) {
      var latlng = L.latLng(lat, lng);
      window.__gctsStopLocating();

      var acc = typeof accuracy === 'number' && accuracy > 0 ? accuracy : 20;
      var popupHtml = '<b>Your Current Location</b><br>Accuracy: within ' + Math.round(acc) + 'm';

      if (!userLocationMarker) {
        var userIcon = L.divIcon({
          className: 'user-location-marker',
          html: '<div class="user-location-pulse"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        userLocationMarker = L.marker(latlng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        userLocationMarker.bindPopup(popupHtml);
        userAccuracyCircle = L.circle(latlng, {
          radius: acc,
          color: '#2563EB',
          weight: 1,
          opacity: 0.4,
          fillColor: '#3B82F6',
          fillOpacity: 0.12
        }).addTo(map);
      } else {
        userLocationMarker.setLatLng(latlng);
        userLocationMarker.setPopupContent(popupHtml);
        userAccuracyCircle.setLatLng(latlng);
        userAccuracyCircle.setRadius(acc);
      }

      if (shouldRecenter !== false) {
        map.setView(latlng, 16);
      }
    };

    window.addEventListener('message', function(event) {
      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;
        if (data.type === 'user_location') {
          window.__gctsApplyUserLocation(data.lat, data.lng, data.accuracy || 20, data.recenter !== false);
        } else if (data.type === 'locate_done') {
          window.__gctsStopLocating();
        }
      } catch (e) {
        /* ignore */
      }
    });
  </script>
</body>
</html>
  `;
}
