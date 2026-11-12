export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading workspace"
      className="loading-skeleton"
    >
      <div />
      <div />
      <div />
      <p>Loading your workspace…</p>
    </div>
  );
}
