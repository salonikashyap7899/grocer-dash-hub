import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface DeliveryMapProps {
  status: string;
  deliveryAddress?: string;
  orderNumber?: string;
}

const STORE_LAT = 28.6139;
const STORE_LNG = 77.2090;
const STATUS_STEPS = ["placed", "confirmed", "packed", "out_for_delivery", "delivered"];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function DeliveryMap({ status, deliveryAddress }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const animRef = useRef<number>(0);
  const [geocoded, setGeocoded] = useState<[number, number] | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const stepIndex = STATUS_STEPS.indexOf(status);
  const isOutForDelivery = status === "out_for_delivery";
  const isDelivered = status === "delivered";

  // Geocode delivery address via Nominatim (free, no API key)
  useEffect(() => {
    setGeoLoading(true);
    if (!deliveryAddress) {
      setGeocoded([STORE_LAT + 0.018, STORE_LNG + 0.012]);
      setGeoLoading(false);
      return;
    }
    const q = encodeURIComponent(deliveryAddress + ", India");
    fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { "Accept-Language": "en", "User-Agent": "FreshCart/1.0" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.[0]) {
          setGeocoded([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        } else {
          setGeocoded([STORE_LAT + 0.018, STORE_LNG + 0.012]);
        }
      })
      .catch(() => setGeocoded([STORE_LAT + 0.018, STORE_LNG + 0.012]))
      .finally(() => setGeoLoading(false));
  }, [deliveryAddress]);

  // Init Leaflet map (dynamic import — works with Vite ESM)
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !geocoded) return;

    let cancelled = false;

    import("leaflet").then((mod) => {
      if (cancelled || !mapRef.current || mapInstance.current) return;
      const L = mod.default;

      // Fix default icon bundler issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const midLat = (STORE_LAT + geocoded[0]) / 2;
      const midLng = (STORE_LNG + geocoded[1]) / 2;

      const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: false }).setView([midLat, midLng], 13);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Store marker
      const storeIcon = L.divIcon({
        html: `<div style="background:#0c831f;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px">🏪</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([STORE_LAT, STORE_LNG], { icon: storeIcon }).addTo(map)
        .bindPopup("<b>FreshCart Store</b><br>Your order starts here");

      // Destination marker
      const destIcon = L.divIcon({
        html: `<div style="background:#ef4444;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px">🏠</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker(geocoded, { icon: destIcon }).addTo(map)
        .bindPopup("<b>Your delivery address</b>");

      // Route line
      L.polyline([[STORE_LAT, STORE_LNG], geocoded], {
        color: "#0c831f", weight: 4, dashArray: "8 6", opacity: 0.7,
      }).addTo(map);

      // Rider position based on status
      let progress = 0;
      if (status === "confirmed") progress = 0.1;
      else if (status === "packed") progress = 0.25;
      else if (isOutForDelivery) progress = 0.5;
      else if (isDelivered) progress = 1;

      const riderIcon = L.divIcon({
        html: `<div style="background:#f59e0b;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,.35);font-size:20px">🛵</div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const riderLat = lerp(STORE_LAT, geocoded[0], progress);
      const riderLng = lerp(STORE_LNG, geocoded[1], progress);
      const rider = L.marker([riderLat, riderLng], { icon: riderIcon }).addTo(map)
        .bindPopup("<b>Your delivery rider</b>");

      // Animate rider when out for delivery
      if (isOutForDelivery) {
        let t = 0.5;
        let dir = 1;
        const tick = () => {
          if (cancelled) return;
          t += dir * 0.002;
          if (t >= 0.95) dir = -1;
          if (t <= 0.5) dir = 1;
          rider.setLatLng([lerp(STORE_LAT, geocoded[0], t), lerp(STORE_LNG, geocoded[1], t)]);
          animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
      }

      map.fitBounds([[STORE_LAT, STORE_LNG], geocoded], { padding: [40, 40] });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
    };
  }, [geocoded, status]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  if (status === "cancelled") return null;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0c831f] transition-all duration-700"
          style={{ width: `${Math.max(5, (stepIndex / (STATUS_STEPS.length - 1)) * 100)}%` }}
        />
      </div>

      {/* ETA / status card */}
      {!isDelivered ? (
        <div className="flex items-center gap-3 rounded-xl bg-[#f0fdf4] px-4 py-3 border border-green-100">
          <span className="text-2xl">⚡</span>
          <div>
            <div className="text-sm font-bold text-green-800">
              {isOutForDelivery ? "Your rider is on the way!" : "Preparing your order"}
            </div>
            <div className="text-xs text-green-600">
              {isOutForDelivery
                ? "Estimated arrival in 5–10 min"
                : status === "packed"
                ? "Packed — waiting for rider pickup"
                : "Order confirmed, we're packing it"}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 border border-green-200">
          <span className="text-2xl">✅</span>
          <div>
            <div className="text-sm font-bold text-green-800">Delivered successfully!</div>
            <div className="text-xs text-green-600">We hope you enjoy your order.</div>
          </div>
        </div>
      )}

      {/* Map */}
      {geoLoading && (
        <div className="flex items-center justify-center h-48 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-sm text-gray-400">Loading map…</div>
        </div>
      )}
      <div
        ref={mapRef}
        className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
        style={{ height: 300, display: geoLoading ? "none" : "block" }}
      />
      {!geoLoading && (
        <p className="text-center text-xs text-gray-400">
          🏪 FreshCart Store → 🏠 Your address
          {isOutForDelivery && " · 🛵 Rider is moving in real time"}
        </p>
      )}
    </div>
  );
}
