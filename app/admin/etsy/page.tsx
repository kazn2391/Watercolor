'use client';
import { useState, useEffect, useRef } from 'react';

const JOB_KEY = 'etsy_active_job';

export default function EtsyAdminPanel() {
  const [password, setPassword] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [shopKey, setShopKey] = useState('shop1');
  const [productType, setProductType] = useState('auto');
  const [categoryMode, setCategoryMode] = useState('clipart');
  const [generatePng, setGeneratePng] = useState(false);
  const [upscaleImages, setUpscaleImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(JOB_KEY);
      if (raw) {
        const j = JSON.parse(raw);
        if (j.jobId && j.password) {
          setPassword(j.password);
          setLoading(true);
          setInfo('Devam eden islem bulundu, durum sorgulaniyor...');
          startPolling(j.jobId, j.password);
        }
      }
    } catch (e) {}
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function finishJob() {
    try { localStorage.removeItem(JOB_KEY); } catch (e) {}
    stopPolling();
    setLoading(false);
  }

  function startPolling(jobId: string, pwd: string) {
    stopPolling();

    const tick = async () => {
      try {
        const res = await fetch(
          '/api/etsy/job-status?key=' + encodeURIComponent(pwd) + '&id=' + encodeURIComponent(jobId)
        );
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'not_found') return;

        if (Array.isArray(data.steps) && data.steps.length > 0) {
          setResult((prev: any) => ({ ...(prev || {}), steps: data.steps }));
        }

        if (data.status === 'done') {
          setInfo('');
          setError('');
          setResult(
            data.result
              ? { ...data.result, steps: data.steps }
              : { success: true, steps: data.steps }
          );
          setDriveUrl('');
          finishJob();
          return;
        }

        if (data.status === 'error') {
          setInfo('');
          setError(data.error || 'Bilinmeyen hata');
          setResult({ steps: data.steps || [] });
          finishJob();
          return;
        }

        if (data.updatedAt) {
          const age = Date.now() - new Date(data.updatedAt).getTime();
          if (age > 8 * 60 * 1000) {
            setInfo('');
            setError('Islem 8 dakikadir guncellenmiyor - sunucu limitine takilmis olabilir. Steps loguna bak, Etsy draftlari kontrol et.');
            finishJob();
            return;
          }
        }
      } catch (e) {}
    };

    tick();
    pollRef.current = setInterval(tick, 5000);
  }

  async function handleSubmit() {
    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    setLoading(true);
    setError('');
    setInfo('');
    setResult(null);

    try {
      localStorage.setItem(JOB_KEY, JSON.stringify({ jobId, password, startedAt: Date.now() }));
    } catch (e) {}

    startPolling(jobId, password);

    try {
      const res = await fetch('/api/etsy/create-draft?key=' + encodeURIComponent(password), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl, generatePng, upscaleImages, shopKey, productType, categoryMode, jobId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Hata');
        if (data.steps) setResult({ steps: data.steps });
        finishJob();
      } else {
        setResult(data);
        setDriveUrl('');
        finishJob();
      }
    } catch (e: any) {
      setInfo('Baglanti koptu ama islem sunucuda devam ediyor. Bu sayfayi kapatabilirsin - tekrar acinca durum otomatik gelir.');
    }
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
        Etsy Kategorisi
      </label>
      <select
        value={categoryMode}
        onChange={(e) => setCategoryMode(e.target.value)}
        style={{
          width: '100%', padding: 10, marginBottom: 16, border: '1px solid #ddd',
          borderRadius: 8, fontSize: 14, background: 'white', cursor: 'pointer',
        }}
      >
        <option value="clipart">Clip Art &amp; Image Files (varsayilan)</option>
        <option value="digital_prints">Digital Prints (Art &amp; Collectibles)</option>
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
            Drive klasorune Png alt klasoru acar, JPG&apos;leri transparan PNG&apos;ye cevirip yukler.
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
        {loading ? 'Calisiyor... (sayfayi kapatabilirsin)' : 'Etsy Draft Olustur'}
      </button>

      {info && (
        <div style={{ marginTop: 20, padding: 16, background: '#eef4ff', borderRadius: 8, color: '#1a4d8f', fontSize: 14 }}>
          {info}
        </div>
      )}

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
          <p style={{ fontWeight: 'bold', color: '#080' }}>
            Draft hazir! ({result.shop}{result.category ? ' · ' + result.category : ''})
          </p>
          <p style={{ fontSize: 14, margin: '8px 0' }}><strong>Title:</strong> {result.seo && result.seo.title}</p>
          <p style={{ fontSize: 13, margin: '8px 0' }}><strong>Tags:</strong> {result.seo && result.seo.tags.join(', ')}</p>
          <a href={result.etsyEditUrl} target="_blank" rel="noopener"
             style={{ color: '#b5835a', fontWeight: 'bold' }}>
            Etsy de kontrol et ve yayinla
          </a>
        </div>
      )}
    </div>
  );
}
