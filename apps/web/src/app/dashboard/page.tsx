import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("fh_session")?.value;
  if (!session) redirect("/login");

  const apiBase = process.env.CLOUDFLARE_API_URL?.trim().replace(new RegExp("/+$"), "");
  if (!apiBase) redirect("/login");

  let authenticated = false;
  try {
    const response = await fetch(`${apiBase}/auth/me`, {
      headers: { cookie: `fh_session=${encodeURIComponent(session)}` },
      cache: "no-store",
    });
    authenticated = response.ok;
  } catch {
    authenticated = false;
  }

  if (!authenticated) redirect("/login");
  return <DashboardClient />;
}
