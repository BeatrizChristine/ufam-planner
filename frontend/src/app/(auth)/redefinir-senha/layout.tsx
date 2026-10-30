import type { ReactNode } from "react";

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return <><meta name="referrer" content="no-referrer" />{children}</>;
}
