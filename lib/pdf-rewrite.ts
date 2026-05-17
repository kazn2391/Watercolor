import { PDFDocument, PDFName, PDFString, PDFArray, PDFDict } from 'pdf-lib';

export async function rewritePdfDownloadLink(
  templatePdf: Buffer,
  newDriveFolderUrl: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(templatePdf);
  const pages = pdfDoc.getPages();
  const page = pages[0];

  const annots = page.node.Annots();
  if (!annots) throw new Error('PDF annotation bulunamadi');

  let bestIdx = -1;
  let bestArea = -1;

  for (let i = 0; i < annots.size(); i++) {
    const annotRef = annots.get(i);
    const annot = pdfDoc.context.lookup(annotRef) as PDFDict;
    if (!annot) continue;

    const subtype = annot.get(PDFName.of('Subtype'));
    if (!subtype || subtype.toString() !== '/Link') continue;

    const aDict = annot.get(PDFName.of('A')) as PDFDict;
    if (!aDict) continue;
    const uriObj = aDict.get(PDFName.of('URI'));
    if (!uriObj) continue;

    const uri = uriObj.toString().replace(/^\(|\)$/g, '');
    if (uri.indexOf('drive.google.com/drive/folders') === -1) continue;

    const rect = annot.get(PDFName.of('Rect')) as PDFArray;
    if (!rect) continue;
    const x0 = (rect.get(0) as any).asNumber();
    const y0 = (rect.get(1) as any).asNumber();
    const x1 = (rect.get(2) as any).asNumber();
    const y1 = (rect.get(3) as any).asNumber();
    const area = Math.abs((x1 - x0) * (y1 - y0));

    if (area > bestArea) {
      bestArea = area;
      bestIdx = i;
    }
  }

  if (bestIdx === -1) {
    throw new Error('DOWNLOAD butonu bulunamadi (drive folders linki yok)');
  }

  const annotRef = annots.get(bestIdx);
  const annot = pdfDoc.context.lookup(annotRef) as PDFDict;
  const aDict = annot.get(PDFName.of('A')) as PDFDict;
  aDict.set(PDFName.of('URI'), PDFString.of(newDriveFolderUrl));

  const out = await pdfDoc.save();
  return Buffer.from(out);
}
