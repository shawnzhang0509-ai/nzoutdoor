import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function ProfileScreen() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {email ? (
        <>
          <Text style={styles.email}>{email}</Text>
          <Button title="Sign out" color="#1F5C3D" onPress={() => supabase.auth.signOut()} />
        </>
      ) : (
        // M3: Email magic link + Google + Apple。MVP 先演示 magic link:
        <Button title="Sign in with Email (magic link)" color="#1F5C3D"
          onPress={async () => {
            const e = 'user@example.com'; // TODO: 接输入框
            await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: 'nzoutdoor://auth-callback' } });
          }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2', paddingTop: 64, paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1F5C3D' },
  email: { fontSize: 16, color: '#22301F' },
});
