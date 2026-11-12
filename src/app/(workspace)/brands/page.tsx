import Link from "next/link";
import { workspaceContext } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader, EmptyState } from "@/components/ui";
import { Plus, ArrowUpRight } from "lucide-react";
export default async function Brands() {
  const { organization, membership } = await workspaceContext();
  const brands = organization
    ? await db.brand.findMany({
        where: { organizationId: organization.id },
        orderBy: { createdAt: "desc" },
      })
    : [];
  return (
    <>
      <PageHeader
        eyebrow="BRAND WORKSPACES"
        title="Made to stand out."
        description="Every brand has a story. Keep yours in focus."
        action={
          membership &&
          can(membership.role, "brand:write") && (
            <Link href="/brands/new" className="button primary">
              <Plus size={17} />
              Create a brand
            </Link>
          )
        }
      />
      {!organization ? (
        <EmptyState
          title="Start with a workspace"
          description="Your brands will live inside an organization."
          href="/organizations"
          label="Create workspace"
        />
      ) : !brands.length ? (
        <section className="panel">
          <EmptyState
            title="A blank canvas for your brands"
            description="Define your identity, audience, and voice in one place."
            href={
              can(membership!.role, "brand:write") ? "/brands/new" : undefined
            }
            label="Create your first brand"
          />
        </section>
      ) : (
        <div className="brand-grid">
          {brands.map((b) => (
            <Link
              className="brand-card panel"
              href={`/brands/${b.id}`}
              key={b.id}
            >
              <div
                className="brand-card-cover"
                style={{
                  background: `linear-gradient(135deg,${b.color}30,${b.secondaryColor}09)`,
                }}
              >
                <span className="brand-logo" style={{ background: b.color }}>
                  {b.name.slice(0, 2).toUpperCase()}
                </span>
                <ArrowUpRight size={20} />
              </div>
              <div className="brand-card-body">
                <h2>{b.name}</h2>
                <p className="muted">
                  {b.description || "Your brand’s story starts here."}
                </p>
                <div className="brand-card-meta">
                  <span>
                    <i style={{ background: b.color }} />
                    <i style={{ background: b.secondaryColor }} />
                  </span>
                  <small>{b.tone || "Define your brand voice"}</small>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
