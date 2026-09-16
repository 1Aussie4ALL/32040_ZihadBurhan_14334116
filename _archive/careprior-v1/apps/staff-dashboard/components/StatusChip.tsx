const STYLES: Record<string, { bg: string; text: string; label: string }> = {
  "Routine Review": { bg: "bg-status-routine-bg", text: "text-status-routine", label: "Routine review" },
  "Priority Review": { bg: "bg-status-priority-bg", text: "text-status-priority", label: "Priority review" },
  "Immediate Human Review": { bg: "bg-status-immediate-bg", text: "text-status-immediate", label: "Immediate human review" },
  "Insufficient Information": { bg: "bg-status-insufficient-bg", text: "text-status-insufficient", label: "Insufficient information" },
  "Manual Review Required": { bg: "bg-status-manual-bg", text: "text-status-manual", label: "Manual review required" },
};

export default function StatusChip({ category }: { category: string | null | undefined }) {
  const style = (category && STYLES[category]) || { bg: "bg-bg-secondary", text: "text-text-muted", label: category || "Pending" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
      <span aria-hidden="true">●</span>
      {style.label}
    </span>
  );
}
