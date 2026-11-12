import { ArrowUpRight, Layers3 } from "lucide-react";
import Link from "next/link";
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Layers3 size={27} />
      </span>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {href && (
        <Link className="button primary" href={href}>
          {label}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function HiddenOrg({ id }: { id: string }) {
  return <input type="hidden" name="organizationId" value={id} />;
}
