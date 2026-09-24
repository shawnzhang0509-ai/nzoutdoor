import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const CATEGORIES = [
  { key: 'walk', label: '🥾 Walks' }, { key: 'hiking', label: '🥾 Hiking' },
  { key: 'fishing', label: '🎣 Fishing' }, { key: 'campsite', label: '🏕️ Camps' },
  { key: 'beach', label: '🏖️ Beaches' }, { key: 'lookout', label: '🌄 Lookouts' },
  { key: 'swimming', label: '🏊 Swimming' }, { key: 'kayaking', label: '🚣 Kayaking' },
  { key: 'waterfall', label: '💧 Waterfalls' }, { key: 'hut', label: '🛖 Huts' },
] as const;

export default function CategoryChips({ selected, onSelect }: { selected: string | null; onSelect: (c: string | null) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
      <Chip label="✨ All" active={selected === null} onPress={() => onSelect(null)} />
      {CATEGORIES.map(c => (
        <Chip key={c.key} label={c.label} active={selected === c.key} onPress={() => onSelect(selected === c.key ? null : c.key)} />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexGrow: 0, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E4DD' },
  chipActive: { backgroundColor: '#1F5C3D', borderColor: '#1F5C3D' },
  text: { color: '#3A4438', fontSize: 13 },
  textActive: { color: '#fff', fontWeight: '600' },
});
