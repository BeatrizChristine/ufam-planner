import { AuthGuard } from "@/components/auth/AuthGuard";
import { ProfileGate } from "@/components/auth/ProfileGate";
import { AppShell } from "@/components/layout/AppShell";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><ProfileGate><AppShell>{children}</AppShell></ProfileGate></AuthGuard>;
}
