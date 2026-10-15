import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("fh_session")?.value;

  redirect(session ? "/dashboard" : "/login");
}
