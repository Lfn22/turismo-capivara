import StickyDestinationNav from '@/src/components/layout/StickyDestinationNav';

interface Props {
  children: React.ReactNode;
  params: Promise<{ 'destination-slug': string }>;
}

export default async function RoteirosLayout({ children, params }: Props) {
  const { 'destination-slug': slug } = await params;

  // Format slug as display name (e.g. "bonito" → "Bonito")
  const destinationName = slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <>
      <StickyDestinationNav
        destinationName={destinationName}
        destinationSlug={slug}
        activeTab="roteiros"
      />
      {children}
    </>
  );
}
