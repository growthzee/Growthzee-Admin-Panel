export const dynamic = "force-dynamic";
// app/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  redirect("/login");
}
