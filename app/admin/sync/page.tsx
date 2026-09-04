'use client';
import { useState } from 'react';

export default function SyncAdminPage() {
  const [secret, setSecret] = useState('');
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  function add(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function runFullSync() {
    setRunning(true);
    setDone(false);
    setLog([]);

    let offset = 0;
    let round = 0;
    let totalAdded = 0;
    let totalUpdated = 0;

    try {
      while (round < 40) {
        round++;
        add('Tur ' + round + ' - offset ' + offset + ' isleniyor...');

        const res = await fetch(
          '/api/cron/sync?secret=' + encodeURIComponent(secret) + '&offset=' + offset
        );
        const data = await res.json();

        if (!res.ok) {
          add('HATA: ' + (data.error || 'bilinmeyen'));
          break;
        }

        totalAdded += data.added || 0;
        totalUpdated += data.updated || 0;

        add(
          '  ' + data.processed + ' islendi | ' + data.added + ' yeni | ' +
          data.updated + ' guncellendi | ' + data.errors + ' hata | toplam ' + data.total
        );

        for (const m of (data.errorMessages || []).slice(0, 3)) add('  - ' + m);

        if (!data.hasMore) {
          add('TAMAMLANDI. Toplam ' + totalAdded + ' yeni, ' + totalUpdated + ' guncelleme.');
          setDone(true);
          break;
        }
        offset = data.nextOffset;
      }
    } catch (e: any) {
      add('BAGLANTI HATASI: ' + e.message);
    }
    setRunning(false);
  }

  async function runNewListings() {
    setRunning(true);
    setLog([]);
    try {
      const res = await fetch('/api/etsy/refresh-new-listings?secret=' + encodeURIComponent(secret));
      const data = await res.json();
      add(res.ok ? 'Yeni listingler yenilendi: ' + data.inserted : 'HATA: ' + data.error);
    } catch (e: any) {
      add('BAGLANTI HATASI: ' + e.message);
    }
    setRunning(false);
  }

  return (
    <div style={{ maxWidth: 700, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Site Senkronizasyon</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        Etsy listinglerini siteye ceker. Tam senkron tum listingleri batch batch isler.
      </p>

      <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#666' }}>
        CRON_SECRET
      </label>
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Vercel ENV degeri"
        style={{ width: '100%', padding: 10, marginBottom: 20, border: '1px solid #ddd', borderRadius: 8 }}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          onClick={runFullSync}
          disabled={running || !secret}
          style={{
            flex: 1, padding: 14, background: running ? '#999' : '#b5835a',
            color: 'white', border: 'none', borderRadius: 8, fontSize: 15,
            cursor: running ? 'wait' : 'pointer',
          }}
        >
          {running ? 'Calisiyor...' : 'Tam Senkron (tum listingler)'}
        </button>

        <button
          onClick={runNewListings}
          disabled={running || !secret}
          style={{
            flex: 1, padding: 14, background: running ? '#999' : '#5a7fb5',
            color: 'white', border: 'none', borderRadius: 8, fontSize: 15,
            cursor: running ? 'wait' : 'pointer',
          }}
        >
          Sadece Yeni Listingler
        </button>
      </div>

      {log.length > 0 && (
        <div style={{
          background: done ? '#efe' : '#f5f5f5', padding: 16, borderRadius: 8,
          fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap',
        }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
