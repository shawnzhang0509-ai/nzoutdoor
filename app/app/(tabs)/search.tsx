import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { searchPlaces, PlaceSummary } from '../../src/lib/places';
import CategoryChips from '../../src/components/CategoryChips';

export default function SearchScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [results, setResults] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchPlaces(q, (category as any) ?? undefined, undefined));
      } finally { setLoading(false); }
    }, 300); // 防抖
    return () => clearTimeout(t);
  }, [q, category]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search walks, beaches, fishing spots..."
        value={q}
        onChangeText={setQ}
        autoFocus
      />
      <CategoryChips selected={category} onSelect={setCategory} />
      <FlatList
        data={results}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push(`/place/${item.id}`)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.category}{item.difficulty ? ` · ${item.difficulty}` : ''}{item.city ? ` · ${item.city}` : ''}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No places found</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2', paddingTop: 56 },
  input: { margin: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#E0E4DD' },
  row: { padding: 16, backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#22301F' },
  meta: { marginTop: 4, color: '#7A857A', fontSize: 13, textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#8A938A', marginTop: 40 },
});
