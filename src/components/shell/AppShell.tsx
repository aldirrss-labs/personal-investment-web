import { Sidebar, MobileSidebarDrawer } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNavProvider } from "./MobileNavContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <MobileSidebarDrawer />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
