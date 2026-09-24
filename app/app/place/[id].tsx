import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { getPlace, checkIn } from '../../src/lib/places';

// 展示规则: null = "Unknown", 绝不猜
const Rule = ({ label, value }: { label: string; value?: boolean | null }) => (
  <Text style={styles.rule}>
    {label}: {value === null || value === undefined ? 'Unknown' : value ? '✅ Yes' : '❌ No'}
  </Text>
);

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [place, setPlace] = useState<any>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => { if (id) getPlace(id).then(setPlace).catch(console.error); }, [id]);
  if (!place) return <View style={styles.center}><Text>Loading...</Text></View>;

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat ?? ''},${place.lng ?? ''}`
    .replace('//', '//'); // lat/lng 字段由 geom 派生, RPC 返回时补充

  const doCheckIn = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('需要定位权限才能 Check-in'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      await checkIn(place.id, loc.coords.latitude, loc.coords.longitude);
      setCheckedIn(true);
      Alert.alert('✓ Checked in!', '已记录到你的 Outdoor Passport');
    } catch (e: any) {
      // 服务端 500m 校验失败会在这里抛出 "too far"
      Alert.alert('Check-in 失败', e.message ?? '请确认你已到达地点附近 (500m 内) 并已登录');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.name}>{place.name}</Text>
      <Text style={styles.meta}>
        📍 {place.city ?? place.region ?? 'New Zealand'} · 🥾 {place.category}
      </Text>
      {place.description && <Text style={styles.section}>{place.description}</Text>}

      <Text style={styles.h2}>Info</Text>
      <Rule label="📏 Distance" value={undefined} />
      <Text style={styles.rule}>⏱ Time: {place.estimated_time_minutes ? `${place.estimated_time_minutes} min` : 'Unknown'}</Text>
      <Text style={styles.rule}>🟢 Difficulty: {place.difficulty ?? 'Unknown'}</Text>

      <Text style={styles.h2}>Rules</Text>
      <Rule label="🐕 Dogs" value={place.dog_allowed} />
      <Rule label="🚗 Parking" value={place.parking} />
      <Rule label="🏕️ Camping" value={place.camping_allowed} />
      <Rule label="🎣 Fishing" value={place.fishing_allowed} />
      <Rule label="🏊 Swimming" value={place.swimming_allowed} />
      {place.accessibility && <Text style={styles.rule}>♿ Accessibility: {place.accessibility}</Text>}

      <Text style={styles.h2}>Data Source</Text>
      <Text style={styles.source}>Source: {place.source_name}</Text>
      {place.source_url && (
        <Text style={styles.link} onPress={() => Linking.openURL(place.source_url)}>{place.source_url}</Text>
      )}
      <Text style={styles.source}>Last updated: {place.last_updated ? new Date(place.last_updated).toLocaleDateString() : 'Unknown'}</Text>

      <TouchableOpacity style={styles.btnPrimary} onPress={doCheckIn} disabled={checkedIn}>
        <Text style={styles.btnText}>{checkedIn ? '✓ Checked in' : "✓ I've been here"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => Linking.openURL(gmapsUrl)}>
        <Text style={styles.btnTextDark}>Open in Google Maps</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2', padding: 20, paddingTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 26, fontWeight: '700', color: '#22301F' },
  meta: { marginTop: 6, color: '#5A665A', textTransform: 'capitalize' },
  section: { marginTop: 16, fontSize: 15, lineHeight: 22, color: '#3A4438' },
  h2: { marginTop: 24, marginBottom: 8, fontSize: 17, fontWeight: '700', color: '#1F5C3D' },
  rule: { fontSize: 14, color: '#3A4438', paddingVertical: 3 },
  source: { fontSize: 13, color: '#7A857A', paddingVertical: 2 },
  link: { fontSize: 13, color: '#2A6BBF', textDecorationLine: 'underline' },
  btnPrimary: { marginTop: 28, backgroundColor: '#1F5C3D', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnSecondary: { marginTop: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#1F5C3D', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  btnTextDark: { color: '#1F5C3D', fontWeight: '600', fontSize: 16 },
});
