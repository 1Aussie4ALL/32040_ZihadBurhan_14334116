export default function Disclaimer() {
  return (
    <div className="rounded-card border border-border bg-secondary-light px-4 py-3 text-sm text-text-secondary" role="note">
      <strong className="text-text-primary">Academic prototype — not clinically validated.</strong>{" "}
      All rules and AI outputs shown here are for synthetic academic evaluation only. Every recommendation requires
      human review and approval before any action is taken on a real request.
    </div>
  );
}
