'use client';
import { useState } from 'react';
export default function EtsyAdminPanel() {
  const [password, setPassword] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [shopKey, setShopKey] = useState('shop1');
  const [productType, setProductType] = useState('auto');
  const [generatePng, setGeneratePng] = useState(false);
  const [upscaleImages, setUpscaleImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  async function handleSubmit() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/etsy/create-draft?key=' + encodeURIComponent(password), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveUrl, generatePng, upscaleImages, shopKey, productType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Hata');
        if (data.steps) setResult({ steps: data.steps });
      } else {
        setResult(data);
        setDriveUrl('');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }
  return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Etsy Draft Olusturucu</h1>

      <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#666' }}>
        Sifre
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Sifre"
        style={{ width: '100%', padding: 10, marginBottom: 16, border: '1px solid #ddd', borderRadius: 8 }}
      />

      <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#666' }}>
        Shop Sec
      </label>
      <select
        value={shopKey}
        onChange={(e) => setShopKey(e.target.value)}
        style={{
          width: '100%', padding: 10, marginBottom: 16, border: '1px solid #ddd',
          borderRadius: 8, fontSize: 14, background: 'white', cursor: 'pointer',
        }}
      >
        <option value="shop1">SuzyFlowArt</option>
        <option value="shop2">SuzyCardPrints</option>
      </select>

      <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#666' }}>
        Urun Tipi
      </label>
      <select
        value={productType}
        onChange={(e) => setProductType(e.target.value)}
        style={{
          width: '100%', padding: 10, marginBottom: 16, border: '1px solid #ddd',
          borderRadius: 8, fontSize: 14, background: 'white', cursor: 'pointer',
        }}
      >
        <option value="auto">Otomatik (Watercolor / Sublimation)</option>
        <option value="line_art">Line Art Clipart (Tattoo / Junk Journal)</option>
      </select>

      <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#666' }}>
        Google Drive Klasor Linki
      </label>
      <input
        type="text"
        value={driveUrl}
        onChange={(e) => setDriveUrl(e.target.value)}
        placeholder="https://drive.google.com/drive/folders/..."
        style={{ width: '100%', padding: 10, marginBottom: 16, border: '1px solid #ddd', borderRadius: 8 }}
      />

      <label style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
        padding: 12, background: '#f9f5ef', borderRadius: 8, cursor: 'pointer',
        border: upscaleImages ? '2px solid #b5835a' : '2px solid transparent',
      }}>
        <input
          type="checkbox"
          checked={upscaleImages}
          onChange={(e) => setUpscaleImages(e.target.checked)}
          style={{ width: 18, height: 18, cursor: 'pointer' }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>Resimleri Buyut (4032x4032 JPG)</div>
          <div style={{ fontSize: 12, color: '#888' }}>
            MJ kucuk dosyalarini 4032x4032 maksimum kalite JPG&apos;ye yukseltir. Eskiler Low Quality alt klasore tasinir.
          </div>
        </div>
      </label>

      <label style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        padding: 12, background: '#f9f5ef', borderRadius: 8, cursor: 'pointer',
        border: generatePng ? '2px solid #b5835a' : '2px solid transparent',
      }}>
        <input
          type="checkbox"
          checked={generatePng}
          onChange={(e) => setGeneratePng(e.target.checked)}
          style={{ width: 18, height: 18, cursor: 'pointer' }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>PNG uret (transparent background)</div>
          <div style={{ fontSize: 12, color: '#888' }}>
            Drive klasorune Png alt klasoru acar, JPG&apos;leri Photoroom ile transparan PNG&apos;ye cevirip yukler.
          </div>
        </div>
      </label>

      <button
        onClick={handleSubmit}
        disabled={loading || !password || !driveUrl}
        style={{
          width: '100%', padding: 14, background: loading ? '#999' : '#b5835a',
          color: 'white', border: 'none', borderRadius: 8, fontSize: 16,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Olusturuluyor (1-3 dk)' : 'Etsy Draft Olustur'}
      </button>

      {error && (
        <div style={{ marginTop: 20, padding: 16, background: '#fee', borderRadius: 8, color: '#c00' }}>
          <strong>Hata:</strong> {error}
        </div>
      )}
      {result && result.steps && (
        <div style={{ marginTop: 20, padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>
          {result.steps.map((s: string, i: number) => (
            <div key={i}>{s}</div>
          ))}
        </div>
      )}
      {result && result.success && (
        <div style={{ marginTop: 20, padding: 16, background: '#efe', borderRadius: 8 }}>
          <p style={{ fontWeight: 'bold', color: '#080' }}>Draft hazir! ({result.shop})</p>
          <p style={{ fontSize: 14, margin: '8px 0' }}><strong>Title:</strong> {result.seo.title}</p>
          <p style={{ fontSize: 13, margin: '8px 0' }}><strong>Tags:</strong> {result.seo.tags.join(', ')}</p>
          <a href={result.etsyEditUrl} target="_blank" rel="noopener"
             style={{ color: '#b5835a', fontWeight: 'bold' }}>
            Etsy de kontrol et ve yayinla
          </a>
        </div>
      )}
    </div>
  );
}
