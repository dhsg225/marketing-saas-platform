// [Oct 24, 2025 - 08:30] Supabase client for direct database access
// [Oct 24, 2025 - 08:40] FIXED: Corrected project ID from ltehfuwgqgvajypkwwtv to uakfsxlsmmmpqsjjhlnb
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakfsxlsmmmpqsjjhlnb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2ZzeGxzbW1tcHFzampobG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTkyNzIsImV4cCI6MjA3NTM3NTI3Mn0.Tp2Ufj3u-oCk3R5yn1hf6w0fAwY8OPnDRgZQ9Aqfkao';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

