import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';

const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const FFMPEG_PATH = ffmpegInstaller.path;

interface VideoInput {
  imageBuffers: Buffer[];  // 8 image buffer (4 slide x 2 image)
  shopLabel: string;       // "SuzyFlowArt" or "SuzyCardPrints"
  shopTagline: string;     // intro text
  slideTexts: string[];    // 4 slide alti metinler
}

/**
 * 10 saniye slideshow MP4 uretir:
 * - 0-1s   Intro karesi
 * - 1-9s   4 slide x 2 sn (Big + Small layout, crossfade + zoom)
 * - 9-10s  Outro karesi
 *
 * 1080x1080, 30fps, H.264, sessiz, ~3-5 MB
 */
export async function generateListingVideo(input: VideoInput): Promise<Buffer> {
  const tmpId = randomBytes(8).toString('hex');
  const tmpDir = join('/tmp', 'video-' + tmpId);
  await mkdir(tmpDir, { recursive: true });

  try {
    // 1. 4 slide olustur (her biri Big + Small layout, 1080x1080 PNG)
    const slidePaths: string[] = [];
    for (let i = 0; i < 4; i++) {
      const imgA = input.imageBuffers[i * 2];
      const imgB = input.imageBuffers[i * 2 + 1];
      const text = input.slideTexts[i] || '';
      const slidePath = join(tmpDir, 'slide-' + i + '.png');
      await composeSlide(imgA, imgB, text, slidePath);
      slidePaths.push(slidePath);
    }

    // 2. Intro karesi
    const introPath = join(tmpDir, 'intro.png');
    await composeIntro(input.shopTagline, introPath);

    // 3. Outro karesi
    const outroPath = join(tmpDir, 'outro.png');
    await composeOutro(input.shopLabel, outroPath);

    // 4. FFmpeg ile slideshow: intro(1s) + 4 slide(2s each, crossfade) + outro(1s)
    const outputPath = join(tmpDir, 'output.mp4');
    await runFfmpeg([
      // Inputs
      '-loop', '1', '-t', '1.2', '-i', introPath,
      '-loop', '1', '-t', '2.2', '-i', slidePaths[0],
      '-loop', '1', '-t', '2.2', '-i', slidePaths[1],
      '-loop', '1', '-t', '2.2', '-i', slidePaths[2],
      '-loop', '1', '-t', '2.2', '-i', slidePaths[3],
      '-loop', '1', '-t', '1.2', '-i', outroPath,
      // Filter: zoompan (Ken Burns) + crossfade
      '-filter_complex',
      [
        // Her input'a hafif zoom (Ken Burns)
        '[0:v]zoompan=z=\'min(zoom+0.0008,1.05)\':d=30:s=1080x1080:fps=30,format=yuv420p[v0]',
        '[1:v]zoompan=z=\'min(zoom+0.0008,1.05)\':d=60:s=1080x1080:fps=30,format=yuv420p[v1]',
        '[2:v]zoompan=z=\'min(zoom+0.0008,1.05)\':d=60:s=1080x1080:fps=30,format=yuv420p[v2]',
        '[3:v]zoompan=z=\'min(zoom+0.0008,1.05)\':d=60:s=1080x1080:fps=30,format=yuv420p[v3]',
        '[4:v]zoompan=z=\'min(zoom+0.0008,1.05)\':d=60:s=1080x1080:fps=30,format=yuv420p[v4]',
        '[5:v]zoompan=z=\'min(zoom+0.0008,1.05)\':d=30:s=1080x1080:fps=30,format=yuv420p[v5]',
        // Crossfade zinciri
        '[v0][v1]xfade=transition=fade:duration=0.3:offset=0.9[x1]',
        '[x1][v2]xfade=transition=fade:duration=0.3:offset=2.8[x2]',
        '[x2][v3]xfade=transition=fade:duration=0.3:offset=4.7[x3]',
        '[x3][v4]xfade=transition=fade:duration=0.3:offset=6.6[x4]',
        '[x4][v5]xfade=transition=fade:duration=0.3:offset=8.5[out]',
      ].join(';'),
      '-map', '[out]',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '23',
      '-r', '30',
      '-movflags', '+faststart',
      '-t', '10',
      '-y',
      outputPath,
    ]);

    const videoBuf = await readFile(outputPath);
    return videoBuf;
  } finally {
    // Temizlik
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Big + Small layout slide olusturur (1080x1080).
 * Buyuk image arka, kucuk image ust sagda, alt yazi.
 */
async function composeSlide(
  imgA: Buffer,
  imgB: Buffer,
  text: string,
  outputPath: string
): Promise<void> {
  // Buyuk image: 1080x1080 white canvas uzerinde 720x720 centered (hafif left-shift)
  const bigImg = await sharp(imgA)
    .resize(720, 720, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  // Kucuk image: 320x320, ust sag, shadow ile
  const smallImg = await sharp(imgB)
    .resize(320, 320, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  // Alt yazi SVG (1080 genislik)
  const textSvg = Buffer.from(`
    <svg width="1080" height="100" xmlns="http://www.w3.org/2000/svg">
      <text x="540" y="60" font-family="Georgia, serif" font-size="42" fill="#3a2a1f"
            text-anchor="middle" font-style="italic">
        ${escapeXml(text)}
      </text>
    </svg>
  `);

  // Compose: white background + big image + small image + text
  await sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 4,
      background: { r: 252, g: 248, b: 240, alpha: 1 }, // cream
    },
  })
    .composite([
      { input: bigImg, top: 140, left: 100 },           // big: left-center
      { input: smallImg, top: 80, left: 680 },           // small: top-right
      { input: textSvg, top: 920, left: 0 },             // text: bottom
    ])
    .png()
    .toFile(outputPath);
}

/**
 * Intro karesi: shop tagline ortada
 */
async function composeIntro(tagline: string, outputPath: string): Promise<void> {
  const svg = Buffer.from(`
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="1080" fill="#fcf8f0"/>
      <text x="540" y="540" font-family="Georgia, serif" font-size="64" fill="#3a2a1f"
            text-anchor="middle" font-style="italic">
        ${escapeXml(tagline)}
      </text>
    </svg>
  `);
  await sharp(svg).png().toFile(outputPath);
}

/**
 * Outro karesi: shop name + tesekkur
 */
async function composeOutro(shopLabel: string, outputPath: string): Promise<void> {
  const svg = Buffer.from(`
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="1080" fill="#fcf8f0"/>
      <text x="540" y="490" font-family="Georgia, serif" font-size="48" fill="#5a4a3f"
            text-anchor="middle">
        Thank you for visiting
      </text>
      <text x="540" y="580" font-family="Georgia, serif" font-size="72" fill="#3a2a1f"
            text-anchor="middle" font-weight="bold">
        ${escapeXml(shopLabel)}
      </text>
    </svg>
  `);
  await sharp(svg).png().toFile(outputPath);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('ffmpeg exit ' + code + ': ' + stderr.slice(-500)));
    });
    proc.on('error', reject);
  });
}
