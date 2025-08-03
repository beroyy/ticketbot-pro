/**
 * Public Layout
 * No authentication checks - accessible to everyone
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}