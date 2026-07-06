export default function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="10" fill="#16a34a" />
      <path
        d="M24 12L12 24H16V36H20V28H28V36H32V24H36L24 12Z"
        fill="white"
      />
      <path
        d="M34 14L38 18"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M38 14L34 18"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
