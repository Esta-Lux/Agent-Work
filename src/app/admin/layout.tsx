import { redirect } from "next/navigation";
import { isServerDevAuthBypass } from "@/lib/auth/dev-bypass";
import { getServerUser } from "@/lib/auth/server-auth";
import { isAdminUser } from "@/lib/auth/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (isServerDevAuthBypass()) return <>{children}</>;

  const user = await getServerUser();
  if (!user) {
    redirect("/auth/sign-in?next=/admin");
  }

  const admin = await isAdminUser(user);
  if (!admin) {
    redirect("/?error=admin_forbidden");
  }

  return <>{children}</>;
}
