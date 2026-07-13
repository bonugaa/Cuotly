import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'dist');
if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const file of ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'app-icon.svg', 'sw.js']) {
  copyFileSync(join(root, file), join(out, file));
}

const config = {
  mode: process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? 'supabase' : 'local',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
};

writeFileSync(join(out, 'config.js'), `window.CUOTLY_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
