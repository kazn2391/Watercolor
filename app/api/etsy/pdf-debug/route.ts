import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { PDFDocument, PDFName } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (!process.env.CRON_SECRET || adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const { data: tplRow } = await db
      .from('etsy_settings')
      .select('pdf_template_b64')
      .eq('id', 1)
      .single();

    if (!tplRow || !tplRow.pdf_template_b64) {
      return NextResponse.json({ error: 'PDF sablonu yok' }, { status: 400 });
    }

    const tplBuf = Buffer.from(tplRow.pdf_template_b64, 'base64');
    const pdfDoc = await PDFDocument.load(tplBuf);
    const pages = pdfDoc.getPages();

    const report: any = {
      pageCount: pages.length,
      pages: [],
    };

    for (let p = 0; p < pages.length; p++) {
      const page = pages[p];
      const annotsRaw: any = page.node.Annots();
      const pageInfo: any = {
        pageIndex: p,
        hasAnnots: !!annotsRaw,
        annotCount: annotsRaw ? annotsRaw.size() : 0,
        links: [],
      };

      if (annotsRaw) {
        for (let i = 0; i < annotsRaw.size(); i++) {
          const linkInfo: any = { idx: i };
          try {
            const annotRef = annotsRaw.get(i);
            const annot: any = pdfDoc.context.lookup(annotRef);
            linkInfo.hasGet = !!annot && typeof annot.get === 'function';

            if (annot && typeof annot.get === 'function') {
              const subtype = annot.get(PDFName.of('Subtype'));
              linkInfo.subtype = subtype ? subtype.toString() : null;

              const rect: any = annot.get(PDFName.of('Rect'));
              if (rect && typeof rect.get === 'function') {
                try {
                  const x0 = rect.get(0).asNumber();
                  const y0 = rect.get(1).asNumber();
                  const x1 = rect.get(2).asNumber();
                  const y1 = rect.get(3).asNumber();
                  linkInfo.rect = [x0, y0, x1, y1];
                  linkInfo.area = Math.abs((x1 - x0) * (y1 - y0));
                } catch (re: any) {
                  linkInfo.rectErr = re.message;
                }
              }

              const aDict: any = annot.get(PDFName.of('A'));
              linkInfo.hasA = !!aDict;
              if (aDict && typeof aDict.get === 'function') {
                const uriObj = aDict.get(PDFName.of('URI'));
                linkInfo.uri = uriObj ? uriObj.toString() : null;
                const sObj = aDict.get(PDFName.of('S'));
                linkInfo.actionType = sObj ? sObj.toString() : null;
              }
            }
          } catch (e: any) {
            linkInfo.error = e.message;
          }
          pageInfo.links.push(linkInfo);
        }
      }
      report.pages.push(pageInfo);
    }

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
