import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen bg-black">
      <Sidebar userName={session.user.name ?? "User"} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
