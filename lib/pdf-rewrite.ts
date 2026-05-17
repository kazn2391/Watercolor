import { PDFDocument, PDFName, PDFString, PDFDict } from 'pdf-lib';

export async function rewritePdfDownloadLink(
  templatePdf: Buffer,
  newDriveFolderUrl: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(templatePdf);
  const page = pdfDoc.getPages()[0];

  const annotsRaw: any = page.node.Annots();
  if (!annotsRaw) throw new Error('PDF annotation bulunamadi');

  let bestRef: any = null;
  let bestArea = -1;

  // En buyuk alanli Link annotation = DOWNLOAD butonu
  for (let i = 0; i < annotsRaw.size(); i++) {
    const annotRef = annotsRaw.get(i);
    const annot: any = pdfDoc.context.lookup(annotRef);
    if (!annot || typeof annot.get !== 'function') continue;

    const subtype = annot.get(PDFName.of('Subtype'));
    if (!subtype || subtype.toString() !== '/Link') continue;

    const rect: any = annot.get(PDFName.of('Rect'));
    if (!rect || typeof rect.get !== 'function') continue;

    const x0 = rect.get(0).asNumber();
    const y0 = rect.get(1).asNumber();
    const x1 = rect.get(2).asNumber();
    const y1 = rect.get(3).asNumber();
    const area = Math.abs((x1 - x0) * (y1 - y0));

    if (area > bestArea) {
      bestArea = area;
      bestRef = annotRef;
    }
  }

  if (!bestRef) throw new Error('DOWNLOAD butonu bulunamadi (link yok)');

  const annot: any = pdfDoc.context.lookup(bestRef);

  // Eski /A action sozlugunu komple yeni bir URI action ile degistir
  const newAction = pdfDoc.context.obj({
    Type: PDFName.of('Action'),
    S: PDFName.of('URI'),
    URI: PDFString.of(newDriveFolderUrl),
  });
  annot.set(PDFName.of('A'), newAction);

  const out = await pdfDoc.save();
  return Buffer.from(out);
}
