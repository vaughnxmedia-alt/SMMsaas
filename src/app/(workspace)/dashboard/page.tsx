import Link from "next/link";
import { cookies } from "next/headers";
import { workspaceContext } from "@/lib/session";
import { db } from "@/lib/db";
import { switchBrand } from "@/app/actions";
import { PageHeader, EmptyState } from "@/components/ui";
import {
  Plus,
  Shapes,
  FileText,
  CalendarDays,
  Send,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Activity,
  Check,
  Circle,
} from "lucide-react";
export default async function Dashboard() {
  const { user, organization } = await workspaceContext();
  if (!organization)
    return (
      <>
        <PageHeader
          eyebrow="LET’S GET STARTED"
          title={`Welcome, ${user.name.split(" ")[0]}.`}
          description="Your next chapter starts with a workspace."
        />
        <section className="panel">
          <EmptyState
            title="A home for your creative work"
            description="Create a workspace to organize your brands and bring your team together."
            href="/organizations"
            label="Create your first workspace"
          />
        </section>
      </>
    );
  const [brands, activities] = await Promise.all([
    db.brand.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    }),
    db.activityLog.findMany({
      where: { organizationId: organization.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);
  const selected = (await cookies()).get("brand")?.value;
  const brand = brands.find((b) => b.id === selected);
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE OVERVIEW"
        title={`Welcome back, ${user.name.split(" ")[0]}.`}
        description="A little clarity. A lot of creative possibility."
        action={
          <Link href="/brands/new" className="button primary">
            <Plus size={17} />
            Create a brand
          </Link>
        }
      />
      <div className="overview-bar">
        <span>
          <i className="status-dot" />
          {organization.name}
          <span className="muted"> / Overview</span>
        </span>
        <form action={switchBrand}>
          <input type="hidden" name="organizationId" value={organization.id} />
          <select
            name="brand"
            aria-label="Current brand"
            defaultValue={brand?.id ?? ""}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button className="text-button">Apply</button>
        </form>
      </div>
      <div className="stats-grid">
        {[
          {
            label: "Total Brands",
            value: brands.length,
            Icon: Shapes,
            note: "Your brand portfolio",
            color: "blue",
          },
          {
            label: "Draft Content",
            value: "—",
            Icon: FileText,
            note: "Content Studio coming soon",
            color: "cyan",
          },
          {
            label: "Scheduled Posts",
            value: "—",
            Icon: CalendarDays,
            note: "Scheduling coming soon",
            color: "violet",
          },
          {
            label: "Published Posts",
            value: "—",
            Icon: Send,
            note: "Publishing coming soon",
            color: "green",
          },
        ].map(({ label, value, Icon, note, color }) => (
          <section className="stat-card" key={label}>
            <div>
              <span>{label}</span>
              <span className={`stat-icon ${color}`}>
                <Icon size={18} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </section>
        ))}
      </div>
      <div className="dashboard-grid">
        <div>
          <section className="panel brand-panel">
            <div className="panel-heading">
              <h2>
                Your brands <span className="count">{brands.length}</span>
              </h2>
              <Link href="/brands">
                View all <ArrowUpRight size={15} />
              </Link>
            </div>
            {brands.length ? (
              <div className="brand-list">
                {(brand ? [brand] : brands).slice(0, 3).map((b) => (
                  <Link
                    href={`/brands/${b.id}`}
                    className="brand-row"
                    key={b.id}
                  >
                    <span
                      className="brand-logo"
                      style={{ background: b.color }}
                    >
                      {b.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3>{b.name}</h3>
                      <p className="muted">
                        {b.description || "Ready for your next big idea"}
                      </p>
                    </div>
                    <ArrowUpRight size={18} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Your next great brand belongs here"
                description="Give your brand a home. Define its identity, voice, and audience."
                href="/brands/new"
                label="Add your first brand"
              />
            )}
          </section>
          <section className="panel activity-panel">
            <div className="panel-heading">
              <h2>Recent activity</h2>
              <Activity size={17} className="muted" />
            </div>
            <div className="activity-list">
              {activities.map((a) => (
                <div className="activity-row" key={a.id}>
                  <span className="activity-dot">
                    <Check size={13} />
                  </span>
                  <div>
                    <p>{a.action}</p>
                    <small>
                      {a.user?.name ?? "Former member"} <span>·</span>{" "}
                      {a.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </small>
                  </div>
                  <time dateTime={a.createdAt.toISOString()}>
                    {a.createdAt.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ))}
              {!activities.length && (
                <p className="muted">
                  Your workspace activity will appear here.
                </p>
              )}
            </div>
          </section>
        </div>
        <div>
          <section className="panel quick-panel">
            <div className="panel-heading">
              <h2>Quick actions</h2>
              <span className="mini-label">MAKE YOUR NEXT MOVE</span>
            </div>
            <Link className="quick-action" href="/brands/new">
              <span className="quick-icon">
                <Plus size={20} />
              </span>
              <div>
                <h3>Create a brand</h3>
                <p>Build something recognizable</p>
              </div>
              <ArrowRight size={16} />
            </Link>
            <Link className="quick-action" href="/organizations">
              <span className="quick-icon">
                <Shapes size={19} />
              </span>
              <div>
                <h3>Manage workspace</h3>
                <p>Keep your team in sync</p>
              </div>
              <ArrowRight size={16} />
            </Link>
            <Link className="quick-action" href="/settings">
              <span className="quick-icon">
                <Circle size={19} />
              </span>
              <div>
                <h3>Personalize your profile</h3>
                <p>Make yourself at home</p>
              </div>
              <ArrowRight size={16} />
            </Link>
          </section>
          <section className="next-card">
            <span className="pill">
              <Sparkles size={12} /> THE NEXT CHAPTER
            </span>
            <h2>
              Less busywork.
              <br />
              More creative flow.
            </h2>
            <p>
              Your ideas deserve a bigger stage. Content creation, scheduling,
              and insights are on the horizon.
            </p>
            <Link href="/content-studio">
              Explore what’s coming <ArrowUpRight size={16} />
            </Link>
            <div className="next-decoration" />
          </section>
        </div>
      </div>
    </>
  );
}
