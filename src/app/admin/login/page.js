import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/login-form";
import { requireAdmin, AdminAccessError } from "@/lib/admin/auth";

export default async function LoginPage() {
  let authorized = false;
  try { await requireAdmin(); authorized = true; } catch (error) { if (!(error instanceof AdminAccessError)) throw error; }
  if (authorized) redirect("/admin");
  return <main id="main-content" className="admin-workspace grid min-h-screen place-items-center p-6">
    <div className="w-full max-w-md">
      <Link href="/" className="mb-10 flex items-center justify-center gap-3 text-lg font-semibold tracking-tight"><span className="grid size-10 place-items-center rounded-xl bg-[#214b3b] text-white">a.</span> atelier<span className="font-normal text-stone-400">/ commerce</span></Link>
      <section className="admin-panel p-7 shadow-[0_15px_50px_-35px_#214b3b66] sm:p-10">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#74946d]">Store administration</p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">Welcome back.</h1>
        <p className="mb-8 text-sm leading-6 text-stone-500">A little care behind every great storefront. Sign in with your verified administrator account.</p>
        <LoginForm />
      </section>
      <p className="mt-6 text-center text-xs text-stone-500">Only the store owner can access this workspace.</p>
      <Link href="/" className="mt-6 block text-center text-sm text-[#436b51]">← Back to storefront</Link>
    </div>
  </main>;
}
