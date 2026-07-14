import { redirect } from "next/navigation";

// Middleware routes "/" to /login or /dashboard based on session;
// this is only a fallback.
export default function Home() {
  redirect("/dashboard");
}
