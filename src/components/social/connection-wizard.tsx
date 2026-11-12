"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {
  platforms,
  platformInfo,
  capabilityLabels,
  type Platform,
  type Capability,
} from "@/lib/social/catalog";
import type { ConnectionSummary } from "@/lib/social/contracts";
import { ConnectionStatus } from "./connection-status";
export function ConnectionWizard({
  reusable,
  organizationId,
  returnTo,
  requested,
  initialPlatform,
  connection,
  availability,
}: {
  reusable: ConnectionSummary[];
  organizationId: string;
  returnTo: string;
  requested: Capability[];
  initialPlatform?: Platform;
  connection?: ConnectionSummary;
  availability: Record<Platform, boolean>;
}) {
  const [platform, choose] = useState<Platform | undefined>(initialPlatform);
  const [step, setStep] = useState(1);
  const info = platform ? platformInfo[platform] : undefined;
  const ready = platform ? availability[platform] : false;
  return (
    <div className="connection-wizard">
      {reusable.length > 0 && (
        <section className="panel reuse-account">
          <h2>You already have access</h2>
          <p className="muted">
            {reusable.map((a) => a.accountName).join(", ")} can be used here.
            There’s no need to authorize again.
          </p>
          <Link href={returnTo} className="button primary">
            Return with existing access
          </Link>
        </section>
      )}
      <ol className="wizard-steps" aria-label="Connection progress">
        {["Choose platform", "Review access", "Authorize"].map((label, i) => (
          <li
            key={label}
            aria-current={step === i + 1 ? "step" : undefined}
            className={step >= i + 1 ? "current" : ""}
          >
            <span>{step > i + 1 ? <Check size={13} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <section className="panel wizard-body">
        <p className="eyebrow">STEP {step} OF 3</p>
        <h2>
          {step === 1
            ? "Where do you want to connect?"
            : step === 2
              ? `Review your ${info?.name} connection`
              : `Authorize with ${info?.name}`}
        </h2>
        {step === 1 ? (
          <>
            <p className="muted">
              Choose the platform you use. You can add more accounts later.
            </p>
            <fieldset className="platform-options">
              <legend className="sr-only">Choose platform</legend>
              {platforms.map((p) => (
                <label
                  key={p}
                  className={
                    platform === p
                      ? "platform-option selected"
                      : "platform-option"
                  }
                >
                  <input
                    type="radio"
                    name="platform"
                    value={p}
                    checked={platform === p}
                    onChange={() => choose(p)}
                    disabled={
                      connection !== undefined && p !== connection.platform
                    }
                  />
                  <span
                    className="platform-mark"
                    style={{ color: platformInfo[p].color }}
                  >
                    {platformInfo[p].mark}
                  </span>
                  <span>{platformInfo[p].name}</span>
                  {platform === p && <Check size={15} />}
                </label>
              ))}
            </fieldset>
          </>
        ) : step === 2 ? (
          <>
            <div className="wizard-info">
              <ShieldCheck size={23} />
              <div>
                <h3>Sign in on the platform itself</h3>
                <p>
                  {info?.eligibility} The platform will explain what you’re
                  allowing before you confirm.
                </p>
              </div>
            </div>
            {connection && (
              <div className="review-existing">
                <h3>{connection.accountName}</h3>
                <ConnectionStatus state={connection.state} />
                <p className="muted">
                  Granted access:{" "}
                  {connection.grantedCapabilities
                    .map((c) => capabilityLabels[c])
                    .join(", ") || "None"}
                  .
                </p>
              </div>
            )}
            <h3>
              {requested.length
                ? "What this workflow needs"
                : "Start with account identity"}
            </h3>
            <ul className="access-list">
              {requested.length ? (
                requested.map((c) => (
                  <li key={c}>
                    <LockKeyhole size={15} />
                    {capabilityLabels[c]}
                    <span>Requested when available</span>
                  </li>
                ))
              ) : (
                <li>
                  <ShieldCheck size={15} />
                  Identify your account
                  <span>No publishing or inbox access requested</span>
                </li>
              )}
            </ul>
            <p className="muted">
              You can review access later. Additional permissions are requested
              only when you choose a tool that needs them.
            </p>
            <div className="notice">
              {ready
                ? "You’ll be sent to the official platform to authorize access."
                : `${info?.name} authorization isn’t available in this release. No permissions will be requested.`}
            </div>
          </>
        ) : (
          <>
            <div className="authorization-illustration">
              <span className="platform-mark" style={{ color: info?.color }}>
                {info?.mark}
              </span>
              <ArrowRight size={22} />
              <span className="workspace-mark">J</span>
            </div>
            <h3>
              {ready
                ? "You’re ready to continue"
                : "This platform isn’t ready to connect yet"}
            </h3>
            <p className="muted">
              {ready
                ? "Authorize on the official platform. You’ll return to the tool you started from."
                : "Juss CMS needs an approved connection before this step is available. You don’t need to enter keys or change any developer settings."}
            </p>
            <p className="muted">
              {ready
                ? "You can cancel there at any time."
                : "Try another platform, review account access, or keep working on your brands."}
            </p>
            <form
              action={`/api/social/${platform?.toLowerCase()}/authorize`}
              method="post"
            >
              <input
                name="organizationId"
                type="hidden"
                value={organizationId}
              />
              <input name="returnTo" type="hidden" value={returnTo} />
              {connection && (
                <input
                  name="connectionId"
                  type="hidden"
                  value={connection.id}
                />
              )}{" "}
              {requested.map((c) => (
                <input key={c} name="capability" type="hidden" value={c} />
              ))}
              <button className="button primary" disabled={!ready}>
                <ExternalLink size={15} />
                {ready
                  ? `Continue with ${info?.name}`
                  : "Authorization unavailable"}
              </button>
            </form>
          </>
        )}
        <div className="wizard-footer">
          {step > 1 ? (
            <button
              className="button secondary"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : (
            <Link href={returnTo} className="button secondary">
              <ArrowLeft size={14} />
              Return to your tool
            </Link>
          )}
          {step < 3 && (
            <button
              className="button primary"
              disabled={!platform}
              onClick={() => setStep(step + 1)}
            >
              Continue
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </section>
      <div className="wizard-skip">
        <Link href={returnTo}>Skip for now · return to your workflow</Link>
        <Link href="/brands">Work on brand profiles instead</Link>
      </div>
    </div>
  );
}
