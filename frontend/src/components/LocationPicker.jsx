import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Vite breaks Leaflet's default icon path resolution
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const KOCHI_CENTER = [9.9816, 76.2999]

function ClickHandler({ onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function FlyTo({ position }) {
  const map = useMap()
  if (position) map.flyTo([position.lat, position.lng], 16)
  return null
}

export default function LocationPicker({ value, onChange }) {
  const [gpsState, setGpsState] = useState('idle') // idle | locating | error

  function useGps() {
    if (!navigator.geolocation) {
      setGpsState('error')
      return
    }
    setGpsState('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsState('idle')
      },
      () => setGpsState('error'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-sakura-100/60">
          {value
            ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : 'Tap map to pin the issue location'}
        </span>
        <button
          type="button"
          onClick={useGps}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-sakura-50 hover:bg-white/20"
        >
          {gpsState === 'locating' ? 'Locating…' : 'Use my GPS'}
        </button>
      </div>
      {gpsState === 'error' && (
        <p className="text-sm text-amber-400">
          GPS unavailable — tap the map instead.
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-sakura-300/15">
        <MapContainer
          center={KOCHI_CENTER}
          zoom={12}
          style={{ height: 320, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          <FlyTo position={value} />
          {value && <Marker position={[value.lat, value.lng]} />}
        </MapContainer>
      </div>
    </div>
  )
}
