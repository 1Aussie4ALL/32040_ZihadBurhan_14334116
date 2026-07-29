export default function Disclaimer() {
  return (
    <div className="rounded-card border border-border bg-secondary-light px-4 py-3 text-sm text-text-secondary" role="note">
      <strong className="text-text-primary">Academic prototype — not medical advice.</strong>{" "}
      This software is an academic research prototype. It is not a medical device and has not been clinically
      validated. It must not be used to diagnose, treat, prevent or manage any medical condition, and must not be
      relied upon for real patient triage or emergency decision-making. All outputs require review by appropriately
      qualified healthcare professionals. In a real emergency in Australia, call{" "}
      <strong className="text-text-primary">Triple Zero (000)</strong>.
    </div>
  );
}
