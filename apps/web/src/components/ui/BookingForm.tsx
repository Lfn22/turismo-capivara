'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface BookingFormProps {
  slotId: string;
  packageId: string;
  slug: string;
}

interface FormState {
  guestName: string;
  email: string;
  phone: string;
  pax: number;
}


export default function BookingForm({ slotId, packageId, slug }: BookingFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    guestName: '',
    email: '',
    phone: '',
    pax: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 1 : value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
      const res = await fetch(`${apiBase}/tenants/${slug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          packageId,
          guestName: form.guestName,
          email: form.email,
          phone: form.phone,
          pax: form.pax,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Erro ao realizar reserva. Tente novamente.');
      }

      const data = await res.json();
      const bookingId: string = data?.id ?? data?.data?.id ?? '';
      // CR-01: validate bookingId is a UUID before using in navigation
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(bookingId)) {
        throw new Error('Resposta inválida do servidor. Tente novamente.');
      }
      setLoading(false); // WR-03: unlock form before navigation
      router.push(`/${slug}/checkout?bookingId=${bookingId}&email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label htmlFor="guestName" className="block text-sm font-medium mb-1" style={{ color: 'var(--stone-700)' }}>
          Nome completo
        </label>
        <input
          id="guestName"
          name="guestName"
          type="text"
          required
          value={form.guestName}
          onChange={handleChange}
          placeholder="Seu nome"
          className="w-full px-3 py-2.5 text-[0.95rem] rounded-lg outline-none box-border"
          style={{
            border: '1px solid var(--stone-300)',
            color: 'var(--stone-900)',
            backgroundColor: 'var(--stone-50)',
          }}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--stone-700)' }}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="seu@email.com"
          className="w-full px-3 py-2.5 text-[0.95rem] rounded-lg outline-none box-border"
          style={{
            border: '1px solid var(--stone-300)',
            color: 'var(--stone-900)',
            backgroundColor: 'var(--stone-50)',
          }}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1" style={{ color: 'var(--stone-700)' }}>
          Telefone / WhatsApp
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          value={form.phone}
          onChange={handleChange}
          placeholder="(11) 99999-9999"
          className="w-full px-3 py-2.5 text-[0.95rem] rounded-lg outline-none box-border"
          style={{
            border: '1px solid var(--stone-300)',
            color: 'var(--stone-900)',
            backgroundColor: 'var(--stone-50)',
          }}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="pax" className="block text-sm font-medium mb-1" style={{ color: 'var(--stone-700)' }}>
          Número de pessoas
        </label>
        <input
          id="pax"
          name="pax"
          type="number"
          min={1}
          max={20}
          required
          value={form.pax}
          onChange={handleChange}
          className="px-3 py-2.5 text-[0.95rem] rounded-lg outline-none box-border"
          style={{
            width: '100px',
            border: '1px solid var(--stone-300)',
            color: 'var(--stone-900)',
            backgroundColor: 'var(--stone-50)',
          }}
          disabled={loading}
        />
      </div>

      {error && (
        <p
          className="m-0 px-3 py-2.5 rounded-lg text-sm"
          style={{
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-3 rounded-[10px] font-semibold text-base transition-colors"
        style={{
          backgroundColor: loading ? 'var(--stone-400)' : 'var(--ochre)',
          color: 'var(--stone-50)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Processando...' : 'Confirmar reserva'}
      </button>
    </form>
  );
}
