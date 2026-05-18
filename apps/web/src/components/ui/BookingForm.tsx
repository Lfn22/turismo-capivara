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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  fontSize: '0.95rem',
  border: '1px solid #d6d3d1',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#1c1917',
  backgroundColor: '#ffffff',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.3rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#44403c',
};

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
        <label htmlFor="guestName" style={labelStyle}>
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
          style={inputStyle}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="email" style={labelStyle}>
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
          style={inputStyle}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="phone" style={labelStyle}>
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
          style={inputStyle}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="pax" style={labelStyle}>
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
          style={{ ...inputStyle, width: '100px' }}
          disabled={loading}
        />
      </div>

      {error && (
        <p
          style={{
            margin: 0,
            padding: '0.625rem 0.75rem',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '8px',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          backgroundColor: loading ? '#a8a29e' : '#d97706',
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s',
        }}
      >
        {loading ? 'Processando...' : 'Confirmar reserva'}
      </button>
    </form>
  );
}
