import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
copyFileSync(
  join(projectDir, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'),
  join(projectDir, 'vendor/supabase.global.min.js'),
);
