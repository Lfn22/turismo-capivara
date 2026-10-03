'use client';
import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, Button, IconButton, Input, Modal, Textarea } from '@/src/components/ui/capi';

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
  // Estável: o Modal reexecuta o efeito de foco sempre que onClose muda.
  const closeModal = useCallback(() => setOpen(false), []);

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
      <style precedence="default">{`
        .dpe-fab {
          position: fixed;
          right: var(--space-6);
          bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
          z-index: var(--z-nav);
          box-shadow: var(--shadow-lg);
          border-radius: var(--radius-pill);
        }
        .dpe { display: flex; flex-direction: column; gap: var(--space-6); font-family: var(--font-sans); }
        .dpe__section { display: flex; flex-direction: column; gap: var(--space-4); }
        .dpe__section + .dpe__section { padding-top: var(--space-6); border-top: 1px solid var(--border); }
        .dpe__title { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.35; color: var(--text); }
        .dpe__label { margin: 0; font-size: 14px; font-weight: 600; color: var(--text); }
        .dpe__desc { margin: 4px 0 0; font-size: 13px; line-height: 1.45; color: var(--text-secondary); }
        .dpe__row { display: flex; align-items: flex-end; gap: var(--space-2); }
        .dpe__row > :first-child { flex: 1; min-width: 0; }
        .dpe__row > .capi-iconbtn { flex: none; margin-bottom: 2px; }
      `}</style>

      <Button iconLeft={Pencil} className="dpe-fab" onClick={() => setOpen(true)}>
        Editar destino
      </Button>

      <Modal
        open={open}
        onClose={closeModal}
        title="Editar destino"
        description="Textos e fotos da página pública do destino."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </>
        }
      >
        <div className="dpe">
          {/* ── Texto ── */}
          <section className="dpe__section">
            <h3 className="dpe__title">Conteúdo</h3>

            <Input
              label="Frase de impacto (“Sobre o destino”)"
              optional
              value={taglineVal}
              onChange={(e) => setTaglineVal(e.target.value)}
              placeholder="Ex.: A natureza que cura quem chega"
              hint="Substitui o texto padrão “Um lugar que transforma quem visita”."
            />

            <Input label="Título" value={titleVal} onChange={(e) => setTitleVal(e.target.value)} />

            <Input
              label="Subtítulo"
              optional
              value={subtitleVal}
              onChange={(e) => setSubtitleVal(e.target.value)}
              placeholder="Frase curta de apoio"
            />

            <Textarea
              label="Descrição"
              optional
              value={descriptionVal}
              onChange={(e) => setDescriptionVal(e.target.value)}
              rows={5}
              placeholder="Texto descritivo."
              hint="Separe parágrafos com uma linha em branco."
            />

            <div>
              <p className="dpe__label">Pontos de interesse</p>
              <p className="dpe__desc">Um por campo. Aparecem nos cards da seção escura.</p>
            </div>
            {highlightInputs.map((h, i) => (
              <div key={i} className="dpe__row">
                <Input
                  label={`Ponto ${i + 1}`}
                  hideLabel
                  value={h}
                  onChange={(e) => setHighlight(i, e.target.value)}
                  placeholder={`Ponto ${i + 1}`}
                />
                <IconButton icon={Trash2} label={`Remover ponto ${i + 1}`} onClick={() => removeHighlight(i)} />
              </div>
            ))}
            <div>
              <Button variant="secondary" size="sm" iconLeft={Plus} onClick={addHighlight}>
                Adicionar ponto
              </Button>
            </div>
          </section>

          {/* ── Fotos ── */}
          <section className="dpe__section">
            <h3 className="dpe__title">Fotos</h3>

            <Input
              label="Foto do card (listagem)"
              optional
              type="url"
              value={hero}
              onChange={(e) => setHero(e.target.value)}
              placeholder="https://res.cloudinary.com/..."
              leadingIcon={Link2}
            />

            {Array.from({ length: 5 }, (_, i) => (
              <Input
                key={i}
                label={`Foto destaque ${i + 1}`}
                optional
                type="url"
                value={photoInputs[i]}
                onChange={(e) => setPhoto(i, e.target.value)}
                placeholder="https://res.cloudinary.com/..."
                leadingIcon={Link2}
              />
            ))}
          </section>

          {error && <Alert tone="danger" title="Não foi possível salvar">{error}</Alert>}
          {success && <Alert tone="success">Alterações salvas.</Alert>}
        </div>
      </Modal>
    </>
  );
}
