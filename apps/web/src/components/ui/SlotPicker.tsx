'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlotPicker as CapiSlotPicker, type SlotDay, type SlotTime } from '@/src/components/ui/capi';

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

/** Chave do dia no fuso local (AAAA-MM-DD). */
function dayKey(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-CA');
}

function stripDot(s: string): string {
  return s.replace(/\.$/, '');
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Wrapper legado → `SlotPicker` do CAPI v2: datas em faixa com snap e horários com vagas restantes.
 * Ao escolher o horário, segue para a etapa "Seus dados" (/reservar) como antes.
 */
export default function SlotPicker({ slots, packageId, slug }: SlotPickerProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { days, timesByDay } = useMemo(() => {
    const sorted = slots.filter((s) => s.status === 'OPEN' && s.booked < s.capacity).sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
    const dayList: SlotDay[] = [];
    const byDay: Record<string, SlotTime[]> = {};
    for (const slot of sorted) {
      const key = dayKey(slot.startsAt);
      if (!byDay[key]) {
        const d = new Date(slot.startsAt);
        byDay[key] = [];
        dayList.push({
          value: key,
          weekday: stripDot(d.toLocaleDateString('pt-BR', { weekday: 'short' })),
          day: d.toLocaleDateString('pt-BR', { day: '2-digit' }),
          month: stripDot(d.toLocaleDateString('pt-BR', { month: 'short' })),
        });
      }
      byDay[key].push({
        value: slot.id,
        label: formatTime(slot.startsAt),
        spots: slot.capacity - slot.booked,
      });
    }
    return { days: dayList, timesByDay: byDay };
  }, [slots]);

  const [selectedDay, setSelectedDay] = useState<string | null>(days[0]?.value ?? null);

  function handleSelect(slotId: string) {
    setSelectedId(slotId);
    router.push(`/${slug}/reservar?slotId=${slotId}&packageId=${packageId}`);
  }

  if (days.length === 0) {
    return (
      <p className="m-0 text-sm text-fg-secondary">
        Nenhuma data disponível no momento.
      </p>
    );
  }

  return (
    <CapiSlotPicker
      days={days}
      selectedDay={selectedDay}
      onSelectDay={setSelectedDay}
      times={selectedDay ? timesByDay[selectedDay] ?? [] : []}
      selectedTime={selectedId}
      onSelectTime={handleSelect}
      dayLabel="Escolha a data"
      timeLabel="Escolha o horário"
    />
  );
}
