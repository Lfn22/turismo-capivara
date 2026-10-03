import { CalendarDays, CalendarPlus, CircleCheck, Clock, Map as MapIcon, Search, User, Users, type LucideIcon } from 'lucide-react';
import { Button, StatusBadge } from '@/src/components/ui/capi';

interface Booking {
  id: string;
  status: string;
  packageName?: string;
  slotStartsAt?: string;
  guestName: string;
  pax: number;
  slug: string;
}

interface ConfirmationCardProps {
  booking: Booking;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Link "Adicionar à agenda" (Google Agenda) a partir do horário de saída. */
function calendarUrl(title: string, isoString: string): string {
  const stamp = new Date(isoString).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp}/${stamp}` });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const HEADLINE: Record<string, { title: string; text: string }> = {
  CONFIRMED: { title: 'Reserva confirmada!', text: 'Está tudo certo. Guarde o código abaixo para consultar sua reserva.' },
  COMPLETED: { title: 'Reserva concluída', text: 'Obrigado por viajar com a gente.' },
  CHECKED_IN: { title: 'Check-in feito', text: 'Aproveite o passeio!' },
  PENDING: { title: 'Reserva recebida', text: 'Assim que o PIX for confirmado, sua vaga fica garantida.' },
  CANCELLED: { title: 'Reserva cancelada', text: 'Esta reserva não está mais ativa.' },
};

export default function ConfirmationCard({ booking }: ConfirmationCardProps) {
  const headline = HEADLINE[booking.status] ?? { title: 'Reserva recebida', text: '' };
  const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' || booking.status === 'CHECKED_IN';
  // Mesmo código que Minha reserva pede (6 últimos caracteres do id).
  const code = booking.id.slice(-6).toUpperCase();

  const details: Array<{ icon: LucideIcon; label: string; value: string }> = [
    ...(booking.packageName ? [{ icon: MapIcon, label: 'Roteiro', value: booking.packageName }] : []),
    { icon: User, label: 'Hóspede', value: booking.guestName },
    ...(booking.slotStartsAt
      ? [
          { icon: CalendarDays, label: 'Data', value: formatDate(booking.slotStartsAt) },
          { icon: Clock, label: 'Saída', value: formatTime(booking.slotStartsAt) },
        ]
      : []),
    { icon: Users, label: 'Pessoas', value: `${booking.pax} ${booking.pax === 1 ? 'pessoa' : 'pessoas'}` },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Faixa de marca */}
      <section className="flex flex-col items-center gap-3 rounded-2xl bg-surface-brand px-5 py-8 text-center">
        {isConfirmed && (
          <span
            className="inline-flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}
          >
            <CircleCheck size={30} strokeWidth={1.75} aria-hidden="true" />
          </span>
        )}
        <h1 className="font-display m-0 text-3xl" style={{ color: 'var(--text-on-brand)' }}>
          {headline.title}
        </h1>
        {headline.text && (
          <p className="m-0 text-sm" style={{ color: 'var(--text-on-brand-secondary)' }}>
            {headline.text}
          </p>
        )}
      </section>

      {/* Card da reserva */}
      <section
        aria-label="Detalhes da reserva"
        className="rounded-2xl border border-line bg-surface p-5"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-fg-secondary">Código da reserva</p>
            <p className="m-0 font-mono text-2xl font-bold tracking-widest text-fg">#{code}</p>
          </div>
          <StatusBadge kind="booking" status={booking.status} />
        </div>

        <dl className="m-0 flex flex-col gap-3">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <dt className="flex shrink-0 items-center gap-2 text-sm text-fg-secondary" style={{ minWidth: 104 }}>
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </dt>
              <dd className="m-0 ml-auto text-right text-sm font-medium text-fg first-letter:uppercase">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Ações */}
      <div className="flex flex-col gap-3">
        <Button href={`/${booking.slug}/minha-reserva`} size="lg" fullWidth iconLeft={Search}>
          Consultar minha reserva
        </Button>
        {booking.slotStartsAt && booking.status !== 'CANCELLED' && (
          <Button
            href={calendarUrl(booking.packageName ?? 'Passeio', booking.slotStartsAt)}
            target="_blank"
            variant="secondary"
            fullWidth
            iconLeft={CalendarPlus}
          >
            Adicionar à agenda
          </Button>
        )}
      </div>
    </div>
  );
}
