"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  PenTool,
  ImageIcon,
  CalendarDays,
  Send,
  Inbox,
  Users,
  Sparkles,
  ChartNoAxesCombined,
  Settings,
  Layers3,
  ChevronsLeft,
  Menu,
  X,
  Building2,
  Briefcase,
  Shapes,
  ArrowUpRight,
} from "lucide-react";
const links = [
  ["/", "Businesses", Briefcase],
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/brands", "Brands", Shapes],
  ["/content-studio", "Content Studio", PenTool],
  ["/media-library", "Media Library", ImageIcon],
  ["/content-calendar", "Content Calendar", CalendarDays],
  ["/publishing", "Publishing", Send],
  ["/engagement-inbox", "Engagement Inbox", Inbox],
  ["/audience-intelligence", "Audience Intelligence", Users],
  ["/ai-script-studio", "AI Script Studio", Sparkles],
  ["/analytics", "Analytics", ChartNoAxesCombined],
] as const;
export function Sidebar() {
  const path = usePathname();
  const [collapsed, collapse] = useState(false);
  const [open, show] = useState(false);
  return (
    <>
      <button
        className="mobile-menu icon-button"
        aria-label="Open navigation"
        onClick={() => show(true)}
      >
        <Menu />
      </button>
      {open && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => show(false)}
        />
      )}
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${open ? "mobile-open" : ""}`}
      >
        <Link href="/" className="wordmark">
          <Layers3 />
          <span className="brand-text">
            JUSS <em>CMS</em>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => show(false)}
        >
          <X />
        </button>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {links.map(([href, title, Icon]) => (
            <Link
              key={href}
              href={href}
              title={title}
              aria-current={path === href ? "page" : undefined}
              className={path === href ? "nav-item active" : "nav-item"}
              onClick={() => show(false)}
            >
              <Icon size={18} />
              <span>{title}</span>
              {href === "/ai-script-studio" && <small>AI</small>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="foundation-note">
            <span className="status-dot" /> BUILT FOR WHAT’S NEXT
            <p>
              Your creative foundation.
              <br />
              More possibilities ahead.
            </p>
            <Link href="/brands">
              Build your brand <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link
            className={`nav-item ${path === "/organizations" ? "active" : ""}`}
            href="/organizations"
            title="Organizations"
          >
            <Building2 size={18} />
            <span>Organizations</span>
          </Link>
          <Link
            className={`nav-item ${path.startsWith("/settings") ? "active" : ""}`}
            href="/settings"
            title="Settings"
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
          <button
            className="collapse-button"
            onClick={() => collapse(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft size={17} />
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
