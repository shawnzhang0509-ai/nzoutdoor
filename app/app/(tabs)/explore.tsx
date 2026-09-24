import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { MapMarker } from '../../src/components/MapView';
import CategoryChips from '../../src/components/CategoryChips';
import { getPlacesInBBox, PlaceSummary } from '../../src/lib/places';
import { useFilters } from '../../src/stores/filters';

// Auckland 初始视野 (试点)
const AUCKLAND: [number, number] = [174.76, -36.85];

export default function ExploreScreen() {
  const router = useRouter();
  const { category, setCategory } = useFilters();
  const [places, setPlaces] = useState<PlaceSummary[]>([]);

  const load = useCallback(async (bbox?: [number, number, number, number]) => {
    const b = bbox ?? [173.9, -37.5, 175.4, -36.2]; // 大奥克兰范围
    const data = await getPlacesInBBox(b[0], b[1], b[2], b[3], category ?? undefined);
    setPlaces(data);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const markers: MapMarker[] = places.map(p => ({ id: p.id, lng: p.lng, lat: p.lat }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌿 NZ Outdoor</Text>
        <Text style={styles.searchHint} onPress={() => router.push('/search')}>
          🔍 Search walks, beaches, fishing spots...
        </Text>
      </View>
      <MapView
        center={AUCKLAND}
        markers={markers}
        onRegionChange={load}
        onMarkerPress={(id) => router.push(`/place/${id}`)}
      />
      <View style={styles.chipsWrap}>
        <CategoryChips selected={category} onSelect={setCategory} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#fff' },
  logo: { fontSize: 22, fontWeight: '700', color: '#1F5C3D' },
  searchHint: { marginTop: 8, backgroundColor: '#F0F2EE', borderRadius: 12, padding: 12, color: '#8A938A' },
  chipsWrap: { position: 'absolute', bottom: 90, left: 0, right: 0 },
});
