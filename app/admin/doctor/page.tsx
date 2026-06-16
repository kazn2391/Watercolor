'use client';

import { useState } from 'react';

const ADMIN_KEY = 'Kuzey2391';

export default function DoctorPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [listingUrl, setListingUrl] = useState('');
  const [shopKey, setShopKey] = useState<'shop1' | 'shop2'>('shop1');
  const [estimatedSales, setEstimatedSales] = useState('0');
  const [diagnosing, setDiagnosing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [applyResult, setApplyResult] = useState<any>(null);

  const handleAuth = () => {
    if (password === ADMIN_KEY) {
      setAuthed(true);
    } else {
      alert('Yanlis sifre');
    }
  };

  const handleDiagnose = async () => {
    setError('');
    setResult(null);
    setApplyResult(null);
    setDiagnosing(true);

    try {
      const res = await fetch('/api/doctor/diagnose?key=' + ADMIN_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingUrl,
          shopKey,
          estimatedSales: parseInt(estimatedSales) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Hata');
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    if (!confirm('Etsy listingini guncelle? Bu islem geri alinamaz.')) return;

    setApplying(true);
    setApplyResult(null);

    try {
      const res = await fetch('/api/doctor/apply?key=' + ADMIN_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: result.listingId,
          newTitle: result.optimized.newTitle,
          newTags: result.optimized.newTags,
          newDescription: result.optimized.newDescription,
          shopKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Update hatasi');
      } else {
        setApplyResult(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  };

  if (!authed) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
        <h2>Listing Doctor - Sifre</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sifre"
          style={{ width: '100%', padding: 8, fontSize: 16 }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAuth(); }}
        />
        <button onClick={handleAuth} style={{ marginTop: 10, padding: '8px 16px', fontSize: 16 }}>
          Giris
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '20px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1>🏥 Listing Doctor</h1>
      <p style={{ color: '#666' }}>Uyuyan Etsy listinglerini yeniden canlandir.</p>

      <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Etsy Listing URL:</label>
          <input
            type="text"
            value={listingUrl}
            onChange={(e) => setListingUrl(e.target.value)}
            placeholder="https://www.etsy.com/listing/1234567890/..."
            style={{ width: '100%', padding: 8, fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Shop:</label>
            <select
              value={shopKey}
              onChange={(e) => setShopKey(e.target.value as 'shop1' | 'shop2')}
              style={{ width: '100%', padding: 8, fontSize: 14 }}
            >
              <option value="shop1">SuzyFlowArt</option>
              <option value="shop2">SuzyCardPrints</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Tahmini Satis (varsa):</label>
            <input
              type="number"
              value={estimatedSales}
              onChange={(e) => setEstimatedSales(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 14 }}
            />
          </div>
        </div>

        <button
          onClick={handleDiagnose}
          disabled={diagnosing || !listingUrl}
          style={{
            padding: '10px 24px',
            fontSize: 16,
            background: diagnosing ? '#999' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: diagnosing ? 'not-allowed' : 'pointer',
          }}
        >
          {diagnosing ? 'Tani Konuyor...' : '🩺 Tani Koy'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: 12, borderRadius: 4, marginBottom: 16 }}>
          HATA: {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{
            background: result.diagnosis.isBestsellerWarning ? '#fff3cd' : '#e7f3ff',
            border: '1px solid ' + (result.diagnosis.isBestsellerWarning ? '#ffc107' : '#0070f3'),
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
          }}>
            <h3>🏥 Tani: {result.diagnosis.categoryLabel}</h3>
            <p>{result.diagnosis.diagnosis}</p>
            {result.diagnosis.isBestsellerWarning && (
              <p style={{ color: '#856404', fontWeight: 'bold' }}>
                ⚠️ Bu listing iyi performans gosteriyor (yuksek favori veya satis). Degisikleri dikkatlice incele!
              </p>
            )}
            <p style={{ marginTop: 8, fontStyle: 'italic' }}>{result.optimized.recommendation}</p>
          </div>

          <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 4, marginBottom: 20, fontSize: 13 }}>
            <strong>Stats:</strong> {result.current.views} view, {result.current.favorites} favori,{' '}
            {result.stats.ageInDays} gun yas, {Math.round(result.stats.viewsPerDay * 10) / 10} view/gun
          </div>

          <h3>🎨 Karsilastirma</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: '#fafafa', padding: 12, borderRadius: 4 }}>
              <h4 style={{ color: '#c00' }}>ESKI</h4>
              <p><strong>Title:</strong></p>
              <p style={{ fontSize: 13 }}>{result.current.title}</p>
              <p><strong>Tags ({result.current.tags.length}):</strong></p>
              <p style={{ fontSize: 12 }}>{result.current.tags.join(', ')}</p>
            </div>
            <div style={{ background: '#e7ffe7', padding: 12, borderRadius: 4 }}>
              <h4 style={{ color: '#080' }}>YENI</h4>
              <p><strong>Title:</strong></p>
              <p style={{ fontSize: 13 }}>{result.optimized.newTitle}</p>
              <p><strong>Tags ({result.optimized.newTags.length}):</strong></p>
              <p style={{ fontSize: 12 }}>{result.optimized.newTags.join(', ')}</p>
            </div>
          </div>

          <details style={{ marginBottom: 20 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Eski Description (Ilk 500 char)</summary>
            <pre style={{ background: '#fafafa', padding: 12, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {result.current.description.slice(0, 500)}...
            </pre>
          </details>

          <details style={{ marginBottom: 20 }} open>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#080' }}>Yeni Description (Tam)</summary>
            <pre style={{ background: '#e7ffe7', padding: 12, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {result.optimized.newDescription}
            </pre>
          </details>

          {!applyResult && (
            <button
              onClick={handleApply}
              disabled={applying}
              style={{
                padding: '12px 32px',
                fontSize: 16,
                background: applying ? '#999' : '#080',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: applying ? 'not-allowed' : 'pointer',
              }}
            >
              {applying ? 'Etsy\'ye Gonderiliyor...' : '✅ Etsy\'ye Uygula'}
            </button>
          )}

          {applyResult && (
            <div style={{ background: '#e7ffe7', padding: 16, borderRadius: 4, marginTop: 16 }}>
              <h3 style={{ color: '#080' }}>✅ Basarili!</h3>
              {applyResult.steps.map((s: string, i: number) => (
                <div key={i} style={{ fontSize: 13 }}>{s}</div>
              ))}
              <p style={{ marginTop: 12 }}>
                <a href={applyResult.etsyEditUrl} target="_blank" rel="noreferrer" style={{ color: '#0070f3' }}>
                  Etsy'de Goruntule →
                </a>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
