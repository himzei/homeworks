import { cn } from "@/lib/utils";
import {
  CLASS_OFFICER_ROLE,
  type ClassOfficerRole,
} from "@/lib/class-officers";

type BadgeVariant = "president" | "teamLeader" | "member" | "honor";

type ClassOfficerBadgeProps = {
  classOfficerRole: string | null | undefined;
  teamNumber?: number | null;
  /** 반장이 해당 조의 조장으로 배치된 경우 (조장 배지 추가) */
  isTeamLeader?: boolean;
  /** 명예 배지 라벨 (5월우수 등) */
  honorBadgeLabels?: string[];
  /** false면 조장·조 배지만 숨김 (반장·명예 배지는 표시) */
  showTeamBadges?: boolean;
  className?: string;
};

const variantClassName: Record<BadgeVariant, string> = {
  president:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  teamLeader:
    "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
  member: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  honor:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
};

function SingleBadge({
  label,
  variant,
  className,
}: {
  label: string;
  variant: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] sm:text-xs font-medium shrink-0",
        variantClassName[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

/**
 * 반장·조장·조 배지 (반장은 조에 속하면 반장 + 조/조장 배지 추가)
 */
export default function ClassOfficerBadge({
  classOfficerRole,
  teamNumber = null,
  isTeamLeader = false,
  honorBadgeLabels = [],
  showTeamBadges = true,
  className,
}: ClassOfficerBadgeProps) {
  const role = classOfficerRole as ClassOfficerRole | null;
  const items: Array<{ label: string; variant: BadgeVariant }> = [];

  if (role === CLASS_OFFICER_ROLE.CLASS_PRESIDENT) {
    items.push({ label: "반장", variant: "president" });
    // 반장은 조 편성 비활성화 여부와 관계없이, 조에 속하면 조·조장 배지도 함께 표시
    if (teamNumber) {
      if (isTeamLeader) {
        items.push({
          label: `${teamNumber}조 조장`,
          variant: "teamLeader",
        });
      } else {
        items.push({ label: `${teamNumber}조`, variant: "member" });
      }
    }
  } else if (showTeamBadges && role === CLASS_OFFICER_ROLE.TEAM_LEADER && teamNumber) {
    items.push({ label: `${teamNumber}조 조장`, variant: "teamLeader" });
  } else if (showTeamBadges && teamNumber) {
    items.push({ label: `${teamNumber}조`, variant: "member" });
  }

  for (const label of honorBadgeLabels) {
    const trimmed = label.trim();
    if (trimmed) {
      items.push({ label: trimmed, variant: "honor" });
    }
  }

  if (items.length === 0) return null;

  if (items.length === 1) {
    return (
      <SingleBadge
        label={items[0].label}
        variant={items[0].variant}
        className={className}
      />
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {items.map((item) => (
        <SingleBadge
          key={item.label}
          label={item.label}
          variant={item.variant}
          className={className}
        />
      ))}
    </span>
  );
}
