import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <p className="eyebrow">404</p>
      <h1>This page isn’t here.</h1>
      <p className="muted">It may have moved, or you may not have access.</p>
      <Link className="button primary" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
