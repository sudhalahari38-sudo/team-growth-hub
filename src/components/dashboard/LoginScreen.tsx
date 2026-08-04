import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, KeyRound, ShieldCheck, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account, IdentityRole } from "@/lib/current-user";

const ROLES: {
  role: IdentityRole;
  title: string;
  blurb: string;
  icon: React.ReactNode;
}[] = [
  {
    role: "admin",
    title: "Admin",
    blurb: "Full access · uploads, sync, settings, all views",
    icon: <KeyRound className="h-4 w-4" />,
  },
  {
    role: "leadership",
    title: "Leadership",
    blurb: "Organization-wide analytics · no admin actions",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    role: "manager",
    title: "Manager",
    blurb: "My team in full · organization read-only",
    icon: <UserCircle2 className="h-4 w-4" />,
  },
];

export function LoginScreen({
  managerNames,
  onLogin,
}: {
  managerNames: string[];
  onLogin: (a: Account) => void;
}) {
  const [role, setRole] = useState<IdentityRole>("admin");
  const [managerName, setManagerName] = useState(managerNames[0] ?? "");

  const submit = () => {
    if (role === "manager") {
      onLogin({
        id: `mgr:${managerName}`,
        name: managerName,
        role: "manager",
        managerName,
      });
      return;
    }
    onLogin(
      role === "admin"
        ? { id: "admin", name: "Admin User", role: "admin" }
        : { id: "leadership", name: "Leadership User", role: "leadership" },
    );
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <Card className="w-full max-w-md p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Skillsoft LMS · Console
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Learning &amp; Development</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Sign in to continue. Your account role decides which viewers you can switch between.
        </p>

        <div className="flex flex-col gap-2">
          {ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => setRole(r.role)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                role === r.role
                  ? "border-accent-brand bg-accent-brand/5"
                  : "border-border hover:bg-secondary",
              )}
            >
              <span className="mt-0.5 text-accent-brand">{r.icon}</span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{r.title}</span>
                <span className="text-xs text-muted-foreground">{r.blurb}</span>
              </span>
            </button>
          ))}
        </div>

        {role === "manager" && (
          <div className="mt-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Manager account
            </label>
            <Select value={managerName} onValueChange={setManagerName}>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                {managerNames.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button className="mt-6 w-full" onClick={submit} disabled={role === "manager" && !managerName}>
          Log in
        </Button>
      </Card>
    </div>
  );
}
