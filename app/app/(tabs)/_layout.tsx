import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#1F5C3D' }}>
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: () => '🗺️' }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: () => '🔍' }} />
      <Tabs.Screen name="passport" options={{ title: 'Passport', tabBarIcon: () => '🥾' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => '👤' }} />
    </Tabs>
  );
}
