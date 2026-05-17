import { PDFDocument, PDFName, PDFString } from 'pdf-lib';

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

  for (let i = 0; i < annotsRaw.size(); i++) {
    const annotRef = annotsRaw.get(i);
    const annot: any = pdfDoc.context.lookup(annotRef);
    if (!annot || typeof annot.get !== 'function') continue;

    const subtype = annot.get(PDFName.of('Subtype'));
    if (!subtype || subtype.toString() !== '/Link') continue;

    const aDict: any = annot.get(PDFName.of('A'));
    if (!aDict || typeof aDict.get !== 'function') continue;

    const uriObj = aDict.get(PDFName.of('URI'));
    if (!uriObj) continue;

    const uri = uriObj.toString().replace(/^\(|\)$/g, '');
    if (uri.indexOf('drive.google.com/drive/folders') === -1) continue;

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

  if (!bestRef) throw new Error('DOWNLOAD butonu bulunamadi');

  const annot: any = pdfDoc.context.lookup(bestRef);
  const aDict: any = annot.get(PDFName.of('A'));
  aDict.set(PDFName.of('URI'), PDFString.of(newDriveFolderUrl));

  const out = await pdfDoc.save();
  return Buffer.from(out);
}
