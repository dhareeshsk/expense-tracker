import { BottomNav } from "@/components/bottom-nav";
import { AddTransactionFab } from "@/components/add-transaction-fab";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <AddTransactionFab />
      <BottomNav />
    </>
  );
}
