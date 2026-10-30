import SetupPage from "@/components/setup-page";

export const metadata = { title: "Administration", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <SetupPage title="Administration">Administration is not configured yet. No customer data or administrative controls are available.</SetupPage>;
}
