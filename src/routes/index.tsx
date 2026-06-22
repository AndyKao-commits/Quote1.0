import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "報得過 — 三分鐘做出客戶願意簽的報價" }] }),
  component: LandingPage,
});
