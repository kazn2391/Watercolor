import { getValidPinterestToken } from './pinterest-auth';

const PINTEREST_API = 'https://api.pinterest.com/v5';

interface CreatePinInput {
  boardId: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  altText?: string;
}

export interface PinResult {
  success: boolean;
  pinId?: string;
  error?: string;
}

/**
 * Pinterest'te bir pin oluşturur.
 * imageUrl public erişilebilir olmalı (Etsy'nin CDN url'leri zaten public).
 */
export async function createPinterestPin(input: CreatePinInput): Promise<PinResult> {
  try {
    const token = await getValidPinterestToken();

    const body = {
      board_id: input.boardId,
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 800),
      link: input.link,
      alt_text: (input.altText || input.title).slice(0, 500),
      media_source: {
        source_type: 'image_url',
        url: input.imageUrl,
      },
    };

    const res = await fetch(PINTEREST_API + '/pins', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      return {
        success: false,
        error: 'Pin failed: ' + JSON.stringify(data).slice(0, 300),
      };
    }
    return { success: true, pinId: data.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Kullanıcının board listesini çeker.
 * İlk kurulumda board ID'sini bulmak için.
 */
export async function listPinterestBoards(): Promise<any[]> {
  const token = await getValidPinterestToken();
  const res = await fetch(PINTEREST_API + '/boards', {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Board list failed: ' + JSON.stringify(data));
  }
  return data.items || [];
}
