import { NextResponse } from 'next/server';
import { readDriveFolder, downloadDriveFile } from '@/lib/drive-reader';
import { oauthCreateOrGetSubfolder, oauthUploadFileToDrive } from '@/lib/drive-oauth-writer';
import { removeBackground } from '@/lib/photoroom';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ADMIN_PASSWORD = 'Kuzey2391';

async function processBatch<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, i: number) => Promise<void>
) {
  let next = 0;
  let ok = 0;
  const errors: string[] = [];

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      try {
        await fn(items[i], i);
        ok++;
      } catch (e: any) {
        errors.push('idx=' + i + ' ' + (e.message || 'bilinmeyen').slice(0, 120));
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return { ok, errors };
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let driveUrl = '';
  try {
    const body = await req.json();
    driveUrl = body.driveUrl || '';
  } catch (e) {
    return NextResponse.json({ error: 'driveUrl gerekli' }, { status: 400 });
  }
  if (!driveUrl) {
    return NextResponse.json({ error: 'driveUrl bos' }, { status: 400 });
  }

  const steps: string[] = [];
  const t0 = Date.now();
  const el = () => Math.round((Date.now() - t0) / 1000) + 's';

  try {
    const folder = await readDriveFolder(driveUrl);
    if (folder.imageCount === 0) {
      return NextResponse.json({ error: 'Klasorde resim yok', steps }, { status: 400 });
    }
    steps.push('[' + el() + '] ' + folder.imageCount + ' resim bulundu');

    if (folder.hasPngSubfolder) {
      steps.push('UYARI: Png klasoru zaten var, uzerine yazilacak');
    }

    const parentId = folder.folderId;
    if (!parentId) throw new Error('Folder ID alinamadi');

    const pngFolderId = await oauthCreateOrGetSubfolder(parentId, 'Png');
    steps.push('[' + el() + '] Png alt klasoru hazir');

    const res = await processBatch(folder.images, 4, async (img, i) => {
      const buf = await downloadDriveFile(img.id);
      const png = await removeBackground(buf);
      await oauthUploadFileToDrive(pngFolderId, 'design' + (i + 1) + '.png', png, 'image/png');
    });

    steps.push('[' + el() + '] PNG sonuc: ' + res.ok + ' basarili, ' + res.errors.length + ' hatali');
    for (let i = 0; i < Math.min(3, res.errors.length); i++) {
      steps.push('  - ' + res.errors[i]);
    }
    if (res.errors.length > 3) {
      steps.push('  - ... ve ' + (res.errors.length - 3) + ' hata daha');
    }

    if (res.ok === 0) {
      return NextResponse.json({ error: 'Hicbir PNG uretilemedi', steps }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pngCount: res.ok,
      failed: res.errors.length,
      steps,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, steps }, { status: 500 });
  }
}
