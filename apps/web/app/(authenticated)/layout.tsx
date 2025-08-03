import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";

/**
 * Authenticated Layout
 * Requires valid session - redirects to login if not authenticated
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const session = await getServerSession();
  
  if (!session) {
    // Not authenticated, redirect to login
    redirect("/login");
  }
  
  // User is authenticated, render children
  return <>{children}</>;
}