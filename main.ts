import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MAX_SIZE = 1024 * 1024; // 1 MiB
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const artUrl = new URL('./art.jpg', import.meta.url);
const artBytes = readFileSync(artUrl);

if (artBytes.length > MAX_SIZE) {
  throw new Error(`Art size ${artBytes.length} exceeds 1 MiB limit.`);
}

if (
  artBytes.length < 2 ||
  artBytes[0] !== 0xff ||
  artBytes[1] !== 0xd8 ||
  artBytes[artBytes.length - 2] !== 0xff ||
  artBytes[artBytes.length - 1] !== 0xd9
) {
  throw new Error('Invalid JPEG start or end markers.');
}

let offset = 2;
let sofFound = false;

while (offset < artBytes.length) {
  if (artBytes[offset] !== 0xff) {
    throw new Error('Expected 0xFF marker prefix.');
  }

  while (offset < artBytes.length && artBytes[offset] === 0xff) {
    offset++;
  }

  if (offset >= artBytes.length) {
    throw new Error('Unexpected end of input after 0xFF.');
  }

  const marker = artBytes[offset++];

  if (marker === 0x00) {
    throw new Error('Stuffed 0x00 byte encountered where marker expected.');
  }

  if (marker === 0xd9 || marker === 0xda) {
    break;
  }

  if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
    continue;
  }

  if (offset + 2 > artBytes.length) {
    throw new Error('Truncated JPEG segment length.');
  }

  const len = (artBytes[offset] << 8) | artBytes[offset + 1];
  if (len < 2 || offset + len > artBytes.length) {
    throw new Error('Invalid JPEG segment length.');
  }

  if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
    if (len < 8) {
      throw new Error('Invalid SOF segment length.');
    }
    const height = (artBytes[offset + 3] << 8) | artBytes[offset + 4];
    const width = (artBytes[offset + 5] << 8) | artBytes[offset + 6];

    if (width > 1024 || height > 1024) {
      throw new Error(`Dimensions ${width}x${height} exceed 1024 limit.`);
    }
    sofFound = true;
    break;
  }

  offset += len;
}

if (!sofFound) {
  throw new Error('No valid SOF marker found.');
}

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(join(outputDirectory, 'entry.png'), artBytes);
console.log(`Successfully validated and wrote ${artBytes.length} bytes to ${join(outputDirectory, 'entry.png')}`);



