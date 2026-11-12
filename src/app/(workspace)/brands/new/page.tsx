import { workspaceContext } from "@/lib/session";
import { can } from "@/lib/permissions";
import { BrandForm } from "@/components/brand-form";
import { PageHeader, EmptyState } from "@/components/ui";
export default async function Page() {
  const { organization, membership } = await workspaceContext();
  return (
    <>
      <PageHeader
        eyebrow="YOUR BRAND PORTFOLIO"
        title="Create a brand"
        description="Give your next big idea a clear identity."
      />
      {organization && membership && can(membership.role, "brand:write") ? (
        <section className="panel form-panel">
          <BrandForm organizationId={organization.id} />
        </section>
      ) : (
        <EmptyState
          title="A workspace and editing access are required"
          description="Create a workspace or ask an administrator for access."
          href="/organizations"
          label="View workspaces"
        />
      )}
    </>
  );
}
