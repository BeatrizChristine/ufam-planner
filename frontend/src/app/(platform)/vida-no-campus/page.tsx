import type { Metadata } from "next";
import { CampusServicesSection } from "@/components/dashboard/CampusServicesSection";

export const metadata: Metadata = { title: "Vida no campus" };

export default function CampusLifePage() {
  return <div className="animate-enter"><CampusServicesSection /></div>;
}
