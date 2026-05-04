import { LEADERSHIP_IDENTITY, type Identity } from "@/lib/current-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  identity: Identity;
  identities: Identity[];
  onChange: (i: Identity) => void;
}

export function IdentitySwitcher({ identity, identities, onChange }: Props) {
  const isLeadership = identity.role === "leadership";
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-sm pl-2.5 pr-1.5 py-1">
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
          isLeadership
            ? "bg-accent-brand/30 text-primary-foreground"
            : "bg-success/30 text-primary-foreground",
        )}
      >
        {isLeadership ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserCircle2 className="h-3.5 w-3.5" />}
      </div>
      <div className="flex flex-col leading-tight pr-1">
        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-primary-foreground/55">
          Signed in · RLS
        </span>
        <Select
          value={identity.id}
          onValueChange={(id) => {
            const next = identities.find((i) => i.id === id) ?? LEADERSHIP_IDENTITY;
            onChange(next);
          }}
        >
          <SelectTrigger className="h-6 border-0 bg-transparent text-xs font-semibold text-primary-foreground p-0 gap-1.5 hover:text-primary-foreground/80 focus:ring-0 shadow-none [&>svg]:opacity-70">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {identities.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.role === "leadership" ? "👑 " : ""}
                {i.name}
                {i.department && (
                  <span className="text-muted-foreground"> · {i.department}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
