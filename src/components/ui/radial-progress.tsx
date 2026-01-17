import * as React from "react";
import { cn } from "@/lib/utils";

type RadialProgressProps = {
  value: number; // 0..100
  size?: number; // px
  strokeWidth?: number;
  label: string;
  centerText?: string;
  footerText?: string;
  className?: string;
};

export function RadialProgress({
  value,
  size = 128,
  strokeWidth = 10,
  label,
  centerText,
  footerText,
  className,
}: RadialProgressProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-muted"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-primary"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-foreground">
            {centerText ?? `${Math.round(clamped)}%`}
          </div>
          <div className="text-xs text-muted-foreground text-center px-3 leading-tight">{label}</div>
        </div>
      </div>
      {footerText ? <div className="text-xs text-muted-foreground text-center">{footerText}</div> : null}
    </div>
  );
}
