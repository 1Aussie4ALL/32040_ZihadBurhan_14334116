export type IconName = "stethoscope" | "heart" | "child" | "heart-pulse" | "mind" | "activity" | "skin" | "siren";

const PATHS: Record<IconName, string> = {
  stethoscope: "M6 3v6a4 4 0 008 0V3M10 13v3a5 5 0 005 5 5 5 0 005-5v-1M18 15a2 2 0 100-4 2 2 0 000 4z",
  heart: "M12 20s-7-4.35-9.5-8.5C.83 8.1 2.2 4.5 5.8 4.5c2 0 3.3 1.2 4.2 2.4.9-1.2 2.2-2.4 4.2-2.4 3.6 0 5 3.6 3.3 7C19 15.65 12 20 12 20z",
  child: "M12 3a3 3 0 100 6 3 3 0 000-6zM6 21v-3a6 6 0 0112 0v3",
  "heart-pulse": "M3 12h4l2-4 3 8 2-6 2 2h5M12 20s-7-4.35-9.5-8.5C.83 8.1 2.2 4.5 5.8 4.5c2 0 3.3 1.2 4.2 2.4.9-1.2 2.2-2.4 4.2-2.4 3.6 0 5 3.6 3.3 7C19 15.65 12 20 12 20z",
  mind: "M9 3a5 5 0 00-5 5c0 1.5.6 2.4 1.3 3.3.5.6.7 1 .7 1.7v3a2 2 0 002 2h4a2 2 0 002-2v-3c0-.7.2-1.1.7-1.7C15.4 10.4 16 9.5 16 8a5 5 0 00-5-5H9zM10 21h4",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  skin: "M12 3c4 2 7 5.5 7 9.5a7 7 0 11-14 0C5 8.5 8 5 12 3z",
  siren: "M12 2a5 5 0 00-5 5v6a5 5 0 0010 0V7a5 5 0 00-5-5zM4 22a8 8 0 0116 0M12 2v2",
};

export default function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d={PATHS[name]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
