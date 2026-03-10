import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://unvziecfnqgitksclpsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_81QRmjhn8H_oJjw3By6gbg_-_3OJLGG';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_URL, SUPABASE_ANON_KEY };
