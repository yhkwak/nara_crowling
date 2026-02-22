import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 환경변수를 .env 에 설정하세요."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
