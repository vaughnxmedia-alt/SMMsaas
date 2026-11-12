import { notFound } from "next/navigation";
import { workspaceContext } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { BrandForm } from "@/components/brand-form";
import { ActionForm } from "@/components/action-form";
import { PageHeader, HiddenOrg } from "@/components/ui";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization, membership } = await workspaceContext();
  if (!organization || !membership) notFound();
  const brand = await db.brand.findUnique({
    where: { id, organizationId: organization.id },
  });
  if (!brand) notFound();
  return (
    <>
      <PageHeader
        eyebrow="BRAND IDENTITY"
        title={brand.name}
        description="The details that make your brand unmistakable."
      />
      {can(membership.role, "brand:write") ? (
        <>
          <section className="panel form-panel">
            <BrandForm organizationId={organization.id} brand={brand} />
          </section>
          <section className="panel form-panel danger-zone">
            <h2>Delete brand</h2>
            <p className="muted">
              Permanently remove this brand profile. This cannot be undone.
            </p>
            <details>
              <summary>Delete this brand…</summary>
              <ActionForm
                kind="brand:delete"
                label="Permanently delete brand"
                danger
              >
                <HiddenOrg id={organization.id} />
                <input type="hidden" name="id" value={brand.id} />
              </ActionForm>
            </details>
          </section>
        </>
      ) : (
        <section className="panel form-panel">
          <div className="brand-logo" style={{ background: brand.color }}>
            {brand.name.slice(0, 2)}
          </div>
          {[
            ["Description", brand.description],
            ["Website", brand.website],
            ["Audience", brand.audience],
            ["Tone", brand.tone],
          ].map(([k, v]) => (
            <div key={k}>
              <h3>{k}</h3>
              <p className="muted">{v || "Not specified"}</p>
            </div>
          ))}
          <p className="muted">
            Viewer access · Ask an administrator for editing permissions.
          </p>
        </section>
      )}
    </>
  );
}
