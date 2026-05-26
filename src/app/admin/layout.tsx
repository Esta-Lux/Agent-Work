import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server-auth";
import { isAdminUser } from "@/lib/auth/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const devBypass = process.env.BOOTRISE_DEV_AUTH_BYPASS === "1" && process.env.NODE_ENV !== "production";
  if (devBypass) return <>{children}</>;

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
