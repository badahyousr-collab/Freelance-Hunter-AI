import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("fh_session")?.value;

  if (!session) redirect("/login");

  const apiBase = process.env.CLOUDFLARE_API_URL?.trim().replace(/\\/+$/, "");
  if (!apiBase) redirect("/login");

  let authenticated = false;
  try {
    const response = await fetch(`${apiBase}/auth/me`, {
      headers: { cookie: `fh_session=${encodeURIComponent(session)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    authenticated = response.ok;
  } catch {
    authenticated = false;
  }

  redirect(authenticated ? "/dashboard" : "/login");
}
