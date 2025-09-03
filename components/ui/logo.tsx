export function TalkTalkLogo({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        {/* Chat bubble 1 */}
        <path
          d="M8 12C8 9.79086 9.79086 8 12 8H20C22.2091 8 24 9.79086 24 12V16C24 18.2091 22.2091 20 20 20H14L10 24V20H12C9.79086 20 8 18.2091 8 16V12Z"
          fill="currentColor"
          opacity="0.8"
        />
        {/* Chat bubble 2 */}
        <path
          d="M16 20C16 17.7909 17.7909 16 20 16H28C30.2091 16 32 17.7909 32 20V24C32 26.2091 30.2091 28 28 28H22L18 32V28H20C17.7909 28 16 26.2091 16 24V20Z"
          fill="currentColor"
        />
        {/* Connection dots */}
        <circle cx="14" cy="14" r="1.5" fill="currentColor" />
        <circle cx="18" cy="14" r="1.5" fill="currentColor" />
        <circle cx="22" cy="22" r="1.5" fill="currentColor" />
        <circle cx="26" cy="22" r="1.5" fill="currentColor" />
      </svg>
      <span className="font-bold text-xl tracking-tight">TalkTalk</span>
    </div>
  )
}
