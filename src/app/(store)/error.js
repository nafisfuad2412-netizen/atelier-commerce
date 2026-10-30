"use client";
export default function StoreError({ reset }) { return <div className="store-width store-empty-state"><span aria-hidden="true">✳</span><h1>A little pause.</h1><p>We couldn’t load this page. Please check your connection and try again.</p><button className="store-button" onClick={reset}>Try again ↗</button></div>; }
