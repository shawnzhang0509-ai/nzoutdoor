import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { myPassport } from '../../src/lib/places';

export default function PassportScreen() {
  const [data, setData] = useState<{ total: number; by_category: any[]; places: any[] } | null>(null);

  useFocusEffect(useCallback(() => { myPassport().then(setData).catch(() => setData(null)); }, []));

  if (!data) {
    return <View style={styles.center}><Text>登录后查看你的 Outdoor Passport 🥾</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Outdoor Passport</Text>
      <Text style={styles.total}>{data.total} {data.total === 1 ? 'place' : 'places'} visited</Text>
      {data.by_category.map(c => (
        <View key={c.category} style={styles.catRow}>
          <Text style={styles.catName}>{c.category}</Text>
          <Text style={styles.catCount}>{c.count}</Text>
        </View>
      ))}
      {/* 地图显示去过的地方: M3 阶段加 MapView + visited 标记 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2', paddingTop: 64, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1F5C3D' },
  total: { fontSize: 16, color: '#5A665A', marginTop: 8, marginBottom: 24 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E8E2' },
  catName: { fontSize: 16, color: '#22301F', textTransform: 'capitalize' },
  catCount: { fontSize: 16, fontWeight: '600', color: '#1F5C3D' },
});
