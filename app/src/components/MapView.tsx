// 地图抽象层: 未来加 web 端只需在这里加 maplibre-gl-js 分支
import React from 'react';
import MapLibreGL from 'react-native-maplibre-gl';
import { View } from 'react-native';

MapLibreGL.setAccessToken(null); // 自托管 PMTiles, 不需要 token

export interface MapMarker { id: string; lng: number; lat: number; }

interface Props {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  onMarkerPress?: (id: string) => void;
  onRegionChange?: (bbox: [number, number, number, number]) => void;
  children?: React.ReactNode;
}

// PMTiles 底图: 上传到 Supabase Storage 后在 lib/basemap.ts 配置 URL
const STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://demotiles.maplibre.org/style.json';

export default function MapView({ center = [174.76, -36.85], zoom = 10, markers = [], onMarkerPress, onRegionChange, children }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <MapLibreGL.MapView
        style={{ flex: 1 }}
        styleURL={STYLE_URL}
        onRegionDidChange={async (e) => {
          const bb = await (e as any).properties?.visibleBounds;
          if (bb && onRegionChange) onRegionChange([bb[0][0], bb[0][1], bb[1][0], bb[1][1]]);
        }}
      >
        <MapLibreGL.Camera
          defaultSettings={{ centerCoordinate: center, zoomLevel: zoom }}
          followUserMode="normal"
        />
        {markers.map(m => (
          <MapLibreGL.PointAnnotation
            key={m.id}
            id={m.id}
            coordinate={[m.lng, m.lat]}
            onSelected={() => onMarkerPress?.(m.id)}
          />
        ))}
        {children}
      </MapLibreGL.MapView>
    </View>
  );
}
