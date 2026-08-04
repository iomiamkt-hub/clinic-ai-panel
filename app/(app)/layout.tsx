import { Sidebar } from "@/components/layout/Sidebar";
import { AmigoTestBanner } from "@/components/layout/AmigoTestBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AmigoTestBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
