// Midnight Vault — a one-room heist game, handed in as a program/v1 entry.
// The game is plain static files under game/ (game/index.html and its ES
// modules, no library, no network request) and the screenshots under
// screenshots/. This program copies both into /output and writes
// /output/dossier.json with the vendored make.fun library, exactly as the
// gate expects: the dossier is rebuilt from the same files and must match
// byte for byte. Node 22, standard library only; nothing is installed.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps (game/ at most 993 files and 48 MiB, screenshots at most
// 4 files of 256 KiB each, dossier text at most 160 KiB) shape what is copied:
// a repo that breaks them here would break them in the grader too.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
