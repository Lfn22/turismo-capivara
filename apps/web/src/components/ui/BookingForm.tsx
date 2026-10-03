'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import '@/src/styles/animations.css';
import { posthog } from '@/src/lib/posthog';

function isValidCPF(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const digits = cpf.split('').map(Number)
  let sum = 0
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i)
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder
  if (digits[9] !== digit1) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i)
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder
  return digits[10] === digit2
}

interface BookingFormProps {
  slotId: string;
  packageId: string;
  slug: string;
}

interface FormState {
  guestName: string;
  email: string;
  phone: string;
  cpf: string;
  pax: number;
}


export default function BookingForm({ slotId, packageId, slug }: BookingFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    guestName: '',
    email: '',
    phone: '',
    cpf: '',
    pax: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);

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

    const rawCpf = form.cpf.replace(/\D/g, '');
    if (rawCpf.length !== 11 || !isValidCPF(rawCpf)) {
      setCpfError(rawCpf.length !== 11 ? 'CPF deve ter 11 dígitos' : 'CPF inválido');
      setLoading(false);
      return;
    }
    setCpfError(null);

    posthog.capture('booking_started', { packageId, pax: form.pax });

    try {
      const res = await fetch(`/api/${slug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          customerName: form.guestName,
          customerEmail: form.email,
          customerPhone: form.phone,
          customerCpf: form.cpf.replace(/\D/g, ''),
          pax: form.pax,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Erro ao realizar reserva. Tente novamente.');
      }

      const data = await res.json();
      const bookingId: string = data?.id ?? data?.data?.id ?? '';
      // CR-01: validate bookingId is a non-empty alphanumeric ID (cuid, uuid, cuid2, nanoid)
      const ID_RE = /^[a-zA-Z0-9_-]{10,}$/;
      if (!ID_RE.test(bookingId)) {
        throw new Error('Resposta inválida do servidor. Tente novamente.');
      }
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
          className="field-input"
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
          className="field-input"
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
          className="field-input"
          style={{
            border: '1px solid var(--stone-300)',
            color: 'var(--stone-900)',
            backgroundColor: 'var(--stone-50)',
          }}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="cpf" className="block text-sm font-medium mb-1" style={{ color: 'var(--stone-700)' }}>
          CPF
        </label>
        <input
          id="cpf"
          name="cpf"
          type="text"
          required
          inputMode="numeric"
          maxLength={14}
          value={form.cpf}
          onChange={handleChange}
          onBlur={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            if (val.length === 0) {
              setCpfError(null);
            } else if (val.length !== 11) {
              setCpfError('CPF deve ter 11 dígitos');
            } else if (!isValidCPF(val)) {
              setCpfError('CPF inválido');
            } else {
              setCpfError(null);
            }
          }}
          placeholder="000.000.000-00"
          className="field-input"
          aria-invalid={cpfError ? true : undefined}
          aria-describedby={cpfError ? "cpf-error" : undefined}
          style={{
            border: cpfError ? '1px solid #b91c1c' : '1px solid var(--stone-300)',
            color: 'var(--stone-900)',
            backgroundColor: 'var(--stone-50)',
          }}
          disabled={loading}
        />
        {cpfError && (
          <p id="cpf-error" role="alert" className="m-0 mt-1 text-sm" style={{ color: '#b91c1c' }}>{cpfError}</p>
        )}
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
          className="field-input"
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
          role="alert"
          className="field-input"
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
        aria-busy={loading}
        className="btn btn-primary btn-lg w-full"
      >
        {loading ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ animation: 'spin 0.75s linear infinite' }}
            >
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
              <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Processando…
          </>
        ) : 'Confirmar reserva'}
      </button>
    </form>
  );
}
