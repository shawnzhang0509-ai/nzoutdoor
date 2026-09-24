// 数据访问层: 全部走 Supabase RPC / PostgREST, 无手写 API
import { supabase } from './supabase';

export type Category = 'walk'|'hiking'|'beach'|'fishing'|'campsite'|'hut'|'waterfall'|
  'lookout'|'swimming'|'kayaking'|'mtb'|'park'|'picnic'|'other';

export interface PlaceSummary {
  id: string; name: string; category: Category;
  lng: number; lat: number; difficulty: string | null;
  region: string | null; city: string | null; distance_m?: number;
}

export async function getPlacesInBBox(minLng: number, minLat: number, maxLng: number, maxLat: number, cat?: Category) {
  const { data, error } = await supabase.rpc('places_in_bbox', {
    min_lng: minLng, min_lat: minLat, max_lng: maxLng, max_lat: maxLat,
    cat: cat ?? null, limit_n: 500,
  });
  if (error) throw error;
  return data as PlaceSummary[];
}

export async function searchPlaces(q: string, cat?: Category, region?: string) {
  const { data, error } = await supabase.rpc('search_places', {
    q: q || null, cat: cat ?? null, region_f: region ?? null,
    difficulty_f: null, near_lat: null, near_lng: null, limit_n: 50,
  });
  if (error) throw error;
  return data as PlaceSummary[];
}

export async function getPlace(id: string) {
  const { data, error } = await supabase.from('places').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// 500m 校验在服务端 (check_in RPC), 这里只是调用
export async function checkIn(placeId: string, lat: number, lng: number) {
  const { data, error } = await supabase.rpc('check_in', { p_place_id: placeId, p_lat: lat, p_lng: lng });
  if (error) throw error;
  return data;
}

export async function myPassport() {
  const { data, error } = await supabase.rpc('my_passport');
  if (error) throw error;
  return data as { total: number; by_category: { category: Category; count: number }[]; places: any[] };
}

export async function toggleFavourite(placeId: string, favourited: boolean) {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error('login required');
  if (favourited) {
    await supabase.from('favourites').delete().eq('user_id', uid).eq('place_id', placeId);
  } else {
    await supabase.from('favourites').insert({ user_id: uid, place_id: placeId });
  }
}
