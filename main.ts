import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outputDirectory, { recursive: true });
copyFileSync(new URL('./art.jpg', import.meta.url), join(outputDirectory, 'entry.png'));
