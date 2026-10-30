"use client";

export default function AdminError({ reset }) {
  return <main id="main-content" className="admin-workspace grid place-items-center p-8"><div className="admin-panel max-w-md p-8"><h1 className="mb-4 text-2xl font-semibold">Let’s try that again.</h1><p className="mb-6 text-sm text-stone-500">The dashboard couldn’t be loaded. Check your connection and try again.</p><button className="admin-button" onClick={() => reset()}>Retry</button></div></main>;
}
