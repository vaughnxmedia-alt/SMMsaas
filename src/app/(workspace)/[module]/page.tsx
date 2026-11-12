import { notFound } from "next/navigation";
import { Sparkles, Layers3 } from "lucide-react";
import { workspaceContext } from "@/lib/session";
import { can } from "@/lib/permissions";
import { tools } from "@/lib/social/catalog";
import { ConnectionGuard } from "@/components/social/connection-guard";
export default async function ComingSoon({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const tool = tools[module];
  if (!tool) notFound();
  const { user, organization, membership } = await workspaceContext();
  return (
    <>
      <div className="coming-soon tool-first">
        <span className="pill">
          <Sparkles size={13} />
          COMING IN A FUTURE PHASE
        </span>
        <div className="coming-icon">
          <Layers3 size={44} />
        </div>
        <p className="eyebrow">{tool.name.toUpperCase()}</p>
        <h1>{tool.title}</h1>
        <p className="muted">{tool.description}</p>
      </div>
      <ConnectionGuard
        userId={user.id}
        organizationId={organization?.id}
        returnTo={`/${module}`}
        required={tool.capabilities}
        canManage={Boolean(
          membership && can(membership.role, "connections:manage"),
        )}
        local={tool.local}
      />
    </>
  );
}
