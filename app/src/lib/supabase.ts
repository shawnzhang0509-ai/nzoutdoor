// 唯一数据出口 —— app 内任何地方不允许直接访问数据库
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    // RN 无浏览器 cookie, 用 SecureStore 持久化会话
    storage: Platform.OS !== 'web' ? require('expo-secure-store') : undefined,
    autoRefreshToken: true,
    persistSession: true,
  },
});
