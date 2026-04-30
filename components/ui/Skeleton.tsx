type SkeletonProps = {
  className?: string;
};

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-[rgba(255,255,255,0.08)] ${className}`}
    >
      <span className="sr-only">Loading</span>
    </div>
  );
}
