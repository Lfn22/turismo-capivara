'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { posthog } from '@/src/lib/posthog';

interface Slot {
  id: string;
  startsAt: string;
  capacity: number;
  booked: number;
  status: string;
}

interface SlotPickerProps {
  slots: Slot[];
  packageId: string;
  slug: string;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SlotPicker({ slots, packageId, slug }: SlotPickerProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const availableSlots = slots.filter((s) => s.status === 'OPEN' && s.booked < s.capacity);

  function handleSelect(slotId: string) {
    setSelectedId(slotId);
    const slot = availableSlots.find((s) => s.id === slotId);
    posthog.capture('slot_selected', { packageId, date: slot?.startsAt, slotId });
    router.push(`/${slug}/reservar?slotId=${slotId}&packageId=${packageId}`);
  }

  if (availableSlots.length === 0) {
    return (
      <p style={{ color: 'var(--stone-500)', fontSize: '0.9rem', margin: '1rem 0' }}>
        Nenhuma data disponível no momento.
      </p>
    );
  }

  return (
    <div
      role="group"
      aria-label="Selecione uma data disponível"
      style={{
        overflowX: 'auto',
        display: 'flex',
        gap: '0.625rem',
        paddingBottom: '0.5rem',
        scrollbarWidth: 'thin',
      }}
    >
      {availableSlots.map((slot) => {
        const isSelected = selectedId === slot.id;
        const remaining = slot.capacity - slot.booked;
        return (
          <button
            key={slot.id}
            onClick={() => handleSelect(slot.id)}
            aria-pressed={isSelected}
            aria-label={`${formatDate(slot.startsAt)} às ${formatTime(slot.startsAt)}, ${remaining} ${remaining === 1 ? 'vaga' : 'vagas'}`}
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0.625rem 1rem',
              borderRadius: '10px',
              border: isSelected ? '2px solid var(--color-warning)' : '2px solid var(--stone-200)',
              backgroundColor: isSelected ? 'var(--color-warning)' : 'var(--color-surface)',
              color: isSelected ? '#ffffff' : 'var(--stone-900)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              minWidth: '100px',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontWeight: 600 }}>{formatDate(slot.startsAt)}</span>
            <span style={{ marginTop: '0.2rem', opacity: 0.85 }}>{formatTime(slot.startsAt)}</span>
            <span
              style={{
                marginTop: '0.3rem',
                fontSize: '0.75rem',
                opacity: 0.75,
              }}
            >
              {remaining} {remaining === 1 ? 'vaga' : 'vagas'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
