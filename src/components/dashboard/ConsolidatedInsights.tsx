import type { TrainingRecord } from "@/lib/training-types";
import type { FeedbackRecord } from "@/lib/feedback-types";
import type { Identity } from "@/lib/current-user";
import { useState } from "react";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { CategoryChart } from "./Charts";
import { AtRiskTable } from "./AtRiskTable";
import { ForecastTab } from "./ForecastTab";
import { FeedbackTab } from "./FeedbackTab";
import { LeadershipDashboard } from "./LeadershipDashboard";
import { ManagerDrillDown } from "./ManagerDrillDown";
import { CoursesTab } from "./CoursesTab";
import {
  BarChart3,
  Building2,
  AlertTriangle,
  Sparkles,
  MessageSquareHeart,
  UsersRound,
  BookOpen,
} from "lucide-react";

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-start gap-3 border-b border-border/60 pb-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-brand/10 text-accent-brand">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Consolidated Training Insights page for Leadership users. */
export function LeadershipInsightsPage({
  data,
  feedback,
}: {
  data: TrainingRecord[];
  feedback: FeedbackRecord[];
}) {
  const [drillManager, setDrillManager] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-10">
      <Section
        icon={<BarChart3 className="h-4 w-4" />}
        title="Current progress & KPIs"
        description="Organization-wide training performance at a glance."
      >
        <ExecutiveSummary data={data} />
        <CategoryChart data={data} />
      </Section>

      <Section
        icon={<Building2 className="h-4 w-4" />}
        title="Compliance & department insights"
        description="Completion, compliance and overdue trends by department."
      >
        <LeadershipDashboard data={data} />
      </Section>

      <Section
        icon={<UsersRound className="h-4 w-4" />}
        title="Manager & team breakdown"
        description="Compare manager performance and drill into any team."
      >
        <ManagerDrillDown
          data={data}
          drillManager={drillManager}
          setDrillManager={setDrillManager}
        />
      </Section>

      <Section
        icon={<AlertTriangle className="h-4 w-4" />}
        title="At-risk learners"
        description="Employees with overdue mandatory or optional training."
      >
        <AtRiskTable data={data} defaultBucket="all" />
      </Section>

      <Section
        icon={<BookOpen className="h-4 w-4" />}
        title="Completed & course history"
        description="Course-level assignment and completion rates."
      >
        <CoursesTab data={data} />
      </Section>

      <Section
        icon={<Sparkles className="h-4 w-4" />}
        title="Training forecast"
        description="Projected compliance based on current velocity."
      >
        <ForecastTab data={data} />
      </Section>

      <Section
        icon={<MessageSquareHeart className="h-4 w-4" />}
        title="Feedback & learner sentiment"
        description="What learners are saying about recent training."
      >
        <FeedbackTab data={feedback} isUsingMock hideControls />
      </Section>
    </div>
  );
}

/** Consolidated My Team page for Manager users. */
export function ManagerTeamPage({
  data,
  feedback,
  identity,
}: {
  data: TrainingRecord[];
  feedback: FeedbackRecord[];
  identity: Identity;
}) {
  const [drillManager, setDrillManager] = useState<string | null>(
    identity.managerName ?? null,
  );

  return (
    <div className="flex flex-col gap-10">
      <Section
        icon={<BarChart3 className="h-4 w-4" />}
        title="Team overview"
        description="Compliance and completion for your direct and indirect reportees."
      >
        <ExecutiveSummary data={data} />
        <CategoryChart data={data} />
      </Section>

      <Section
        icon={<UsersRound className="h-4 w-4" />}
        title="Team members"
        description="Drill into an individual reportee to see their trainings."
      >
        <ManagerDrillDown
          data={data}
          drillManager={drillManager}
          setDrillManager={setDrillManager}
          identity={identity}
        />
      </Section>

      <Section
        icon={<AlertTriangle className="h-4 w-4" />}
        title="At-risk employees"
        description="Reportees with overdue training needing attention."
      >
        <AtRiskTable data={data} defaultBucket="all" />
      </Section>

      <Section
        icon={<BookOpen className="h-4 w-4" />}
        title="Current & completed training"
        description="Course-level status across your team."
      >
        <CoursesTab data={data} />
      </Section>

      <Section
        icon={<Sparkles className="h-4 w-4" />}
        title="Training forecast"
        description="Projected completion for your team."
      >
        <ForecastTab data={data} />
      </Section>

      <Section
        icon={<MessageSquareHeart className="h-4 w-4" />}
        title="Team feedback"
        description="Feedback from your reportees on recent training."
      >
        <FeedbackTab data={feedback} isUsingMock hideControls />
      </Section>
    </div>
  );
}
