import type { Metadata } from "next";
import { MenuContent } from "@/components/sections/MenuContent";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Menu | Super Crown Catering",
  description:
    "Browse our fresh box lunches, grab-and-go items, and salads.",
};

export default function MenuPage() {
  return <MenuContent />;
}
