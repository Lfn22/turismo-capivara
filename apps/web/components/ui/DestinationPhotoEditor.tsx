'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Props {
  slug: string;
  heroImageUrl: string | null;
  photos: string[];
  title: string;
  subtitle: string | null;
  description: string | null;
  highlights: string[];
  tagline: string | null;
}

export default function DestinationPhotoEditor({
  slug,
  heroImageUrl,
  photos,
  title,
  subtitle,
  description,
  highlights,
  tagline,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;

  const [open, setOpen] = useState(false);
  const [taglineVal, setTaglineVal] = useState(tagline ?? '');
  const [titleVal, setTitleVal] = useState(title);
  const [subtitleVal, setSubtitleVal] = useState(subtitle ?? '');
  const [descriptionVal, setDescriptionVal] = useState(description ?? '');
  const [highlightInputs, setHighlightInputs] = useState<string[]>(
    highlights.length > 0 ? [...highlights] : [''],
  );
  const [hero, setHero] = useState(heroImageUrl ?? '');
  const [photoInputs, setPhotoInputs] = useState<string[]>(
    Array.from({ length: 5 }, (_, i) => photos[i] ?? ''),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'CONDUTOR') return null;

  function setPhoto(index: number, value: string) {
    setPhotoInputs((prev) => { const n = [...prev]; n[index] = value; return n; });
  }

  function setHighlight(index: number, value: string) {
    setHighlightInputs((prev) => { const n = [...prev]; n[index] = value; return n; });
  }

  function addHighlight() {
    setHighlightInputs((prev) => [...prev, '']);
  }

  function removeHighlight(index: number) {
    setHighlightInputs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/destinations/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroImageUrl: hero.trim() || null,
          photos: photoInputs.map((p) => p.trim()).filter(Boolean),
          tagline: taglineVal.trim() || null,
          title: titleVal.trim() || undefined,
          subtitle: subtitleVal.trim() || null,
          description: descriptionVal.trim() || null,
          highlights: highlightInputs.map((h) => h.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? 'Erro ao salvar');
      } else {
        setSuccess(true);
        setTimeout(() => { setOpen(false); router.refresh(); }, 800);
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100,
          background: 'var(--ochre, #c2783c)', color: '#fff', border: 'none',
          borderRadius: '2rem', padding: '0.65rem 1.25rem', fontSize: '0.8rem',
          fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: '0.4rem', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Editar destino
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{ background: '#fff', borderRadius: '1rem', padding: 'clamp(1.5rem, 4vw, 2rem)', width: '100%', maxWidth: '560px', maxHeight: '90dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1c1917', margin: 0 }}>Editar destino</h2>

            {/* ── Texto ── */}
            <p style={sectionLabel}>Conteúdo</p>

            <div>
              <label style={labelStyle}>Frase de impacto ("Sobre o destino")</label>
              <input value={taglineVal} onChange={(e) => setTaglineVal(e.target.value)} placeholder="Ex: A natureza que cura quem chega" style={inputStyle} />
              <p style={{ fontSize: '0.72rem', color: '#78716c', margin: '0.25rem 0 0' }}>Substitui o texto padrão "Um lugar que transforma quem visita"</p>
            </div>

            <div>
              <label style={labelStyle}>Título</label>
              <input value={titleVal} onChange={(e) => setTitleVal(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Subtítulo</label>
              <input value={subtitleVal} onChange={(e) => setSubtitleVal(e.target.value)} placeholder="Frase curta de apoio" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Descrição</label>
              <textarea
                value={descriptionVal}
                onChange={(e) => setDescriptionVal(e.target.value)}
                rows={5}
                placeholder="Texto descritivo. Separe parágrafos com uma linha em branco."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Pontos de interesse</label>
              <p style={{ fontSize: '0.72rem', color: '#78716c', margin: '0 0 0.5rem' }}>Um por linha — aparecem nos cards da seção escura</p>
              {highlightInputs.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <input
                    value={h}
                    onChange={(e) => setHighlight(i, e.target.value)}
                    placeholder={`Ponto ${i + 1}`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={() => removeHighlight(i)} style={{ ...btnBase, background: '#fef2f2', color: '#dc2626', padding: '0.5rem 0.75rem' }}>✕</button>
                </div>
              ))}
              <button onClick={addHighlight} style={{ ...btnBase, background: '#f5f5f4', color: '#44403c', fontSize: '0.75rem', marginTop: '0.25rem' }}>+ Adicionar ponto</button>
            </div>

            {/* ── Fotos ── */}
            <p style={{ ...sectionLabel, borderTop: '1px solid #e7e5e4', paddingTop: '1rem' }}>Fotos</p>

            <div>
              <label style={labelStyle}>Foto do card (listagem)</label>
              <input type="url" value={hero} onChange={(e) => setHero(e.target.value)} placeholder="https://res.cloudinary.com/..." style={inputStyle} />
            </div>

            {Array.from({ length: 5 }, (_, i) => (
              <div key={i}>
                <label style={labelStyle}>Foto destaque {i + 1}</label>
                <input type="url" value={photoInputs[i]} onChange={(e) => setPhoto(i, e.target.value)} placeholder="https://res.cloudinary.com/..." style={inputStyle} />
              </div>
            ))}

            {error && <p style={{ fontSize: '0.8rem', color: '#dc2626', margin: 0 }}>{error}</p>}
            {success && <p style={{ fontSize: '0.8rem', color: '#16a34a', margin: 0 }}>Salvo com sucesso!</p>}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} disabled={saving} style={{ ...btnBase, background: '#f5f5f4', color: '#44403c' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnBase, background: 'var(--ochre, #c2783c)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const sectionLabel: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a8a29e', margin: 0 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#44403c', marginBottom: '0.3rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d6d3d1', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#1c1917', background: '#fafaf9', boxSizing: 'border-box' };
const btnBase: React.CSSProperties = { padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' };
