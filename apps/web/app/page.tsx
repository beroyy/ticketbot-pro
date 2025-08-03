import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/guilds");
  } else {
    redirect("/login");
  }
}
