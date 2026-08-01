import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'dist');
const fallbackSupabaseUrl = 'https://fgghesxikhbhasyyuwpf.supabase.co';

function cleanSupabaseUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, '');
}

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const file of ['index.html', 'styles.css', 'client-panel.css', 'client-panel-extra.css', 'app.js', 'client-panel.js', 'push-client.js', 'manifest.webmanifest', 'app-icon.svg', 'sw.js']) {
  copyFileSync(join(root, file), join(out, file));
}

const supabaseUrl = cleanSupabaseUrl(process.env.SUPABASE_URL || fallbackSupabaseUrl);
const config = {
  mode: supabaseUrl && process.env.SUPABASE_ANON_KEY ? 'supabase' : 'local',
  supabaseUrl,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
};

writeFileSync(join(out, 'config.js'), `window.CUOTLY_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
