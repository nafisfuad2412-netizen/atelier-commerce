"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return <form action={action} className="space-y-5">
    <div><label className="admin-label" htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" className="admin-input" maxLength={320} required /></div>
    <div><label className="admin-label" htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" className="admin-input" maxLength={1024} required /></div>
    {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    <button className="admin-button w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in to your store →"}</button>
  </form>;
}
