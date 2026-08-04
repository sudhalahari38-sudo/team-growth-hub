import {
  allowedViewers,
  VIEWER_LABELS,
  type Account,
  type IdentityRole,
} from "@/lib/current-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Eye, LogOut, KeyRound, ShieldCheck, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_ICON: Record<IdentityRole, React.ReactNode> = {
  admin: <KeyRound className="h-3.5 w-3.5" />,
  leadership: <ShieldCheck className="h-3.5 w-3.5" />,
  manager: <UserCircle2 className="h-3.5 w-3.5" />,
};

interface Props {
  account: Account;
  viewer: IdentityRole;
  onViewerChange: (r: IdentityRole) => void;
  /** Manager identities available when an admin/leadership account views as a manager */
  managerNames?: string[];
  impersonatedManager?: string;
  onImpersonateManager?: (name: string) => void;
  onLogout: () => void;
}

export function ViewerSwitcher({
  account,
  viewer,
  onViewerChange,
  managerNames = [],
  impersonatedManager,
  onImpersonateManager,
  onLogout,
}: Props) {
  const options = allowedViewers(account.role);
  const showManagerPicker =
    viewer === "manager" && account.role !== "manager" && managerNames.length > 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-full bg-black pl-3 pr-1.5 py-1 shadow-sm ring-1 ring-white/15">
        <Eye className="h-3.5 w-3.5 text-white/70" />
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/55">
            Viewer
          </span>
          <Select value={viewer} onValueChange={(v) => onViewerChange(v as IdentityRole)}>
            <SelectTrigger
              className={cn(
                "h-6 border-0 bg-transparent p-0 gap-1.5 text-xs font-semibold text-white",
                "shadow-none focus:ring-0 hover:text-white/80 [&>svg]:opacity-80",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="border-white/15 bg-black text-white">
              {options.map((r) => (
                <SelectItem
                  key={r}
                  value={r}
                  className="text-white focus:bg-white/15 focus:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    {ROLE_ICON[r]}
                    {VIEWER_LABELS[r]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showManagerPicker && (
        <Select value={impersonatedManager} onValueChange={(v) => onImpersonateManager?.(v)}>
          <SelectTrigger className="h-8 w-[190px] text-xs">
            <SelectValue placeholder="Select manager" />
          </SelectTrigger>
          <SelectContent align="end">
            {managerNames.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="hidden lg:flex flex-col items-end leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Signed in
        </span>
        <span className="text-xs font-semibold text-foreground">{account.name}</span>
      </div>

      <Button size="sm" variant="ghost" className="h-8" onClick={onLogout} title="Log out">
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
