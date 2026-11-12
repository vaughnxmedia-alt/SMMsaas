"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { LogOut } from "lucide-react";
export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState(false);
  return (
    <>
      <button
        className="icon-button"
        title="Sign out"
        aria-label="Sign out"
        onClick={async () => {
          const result = await authClient.signOut();
          if (result.error) setError(true);
          else {
            router.push("/sign-in");
            router.refresh();
          }
        }}
      >
        <LogOut size={17} />
      </button>
      {error && <span role="alert">Sign out failed. Retry.</span>}
    </>
  );
}
