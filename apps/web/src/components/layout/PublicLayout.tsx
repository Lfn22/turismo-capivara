import BottomNav from './BottomNav';

interface Props {
  children: React.ReactNode;
}

/**
 * Casca das páginas públicas globais: conteúdo + BottomNav no celular.
 * `.capi-has-bottombar--nav` reserva o espaço da barra fixa (some a partir de 768px).
 */
export default function PublicLayout({ children }: Props) {
  return (
    <div className="capi-has-bottombar capi-has-bottombar--nav">
      {children}
      <BottomNav />
    </div>
  );
}
