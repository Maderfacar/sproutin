'use client';

import { useEffect, useState } from 'react';
import type { PublicConfig } from '@sproutin/shared';
import { loadPublicConfig } from '../lib/config';

// 骨架首頁：驗證 runtime config 管線（ADR-001）。
// 瀏覽器打 same-origin /api/public-config，bundle 不含任何 per-school 值。
export default function Home() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicConfig()
      .then(setConfig)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'load failed'));
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Sproutin</h1>
      <p>Project skeleton — runtime public config (ADR-001)</p>
      {error ? (
        <p style={{ color: 'crimson' }}>error: {error}</p>
      ) : (
        <pre>{config ? JSON.stringify(config, null, 2) : 'loading public config…'}</pre>
      )}
    </main>
  );
}
