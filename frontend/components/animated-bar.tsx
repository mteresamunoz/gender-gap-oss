"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

interface AnimatedBarProps {
  value: number
  maxValue?: number
  label: string
  color?: "coral" | "teal"
  delay?: number
}

export function AnimatedBar({
  value,
  maxValue = 100,
  label,
  color = "coral",
  delay = 0,
}: AnimatedBarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const percentage = (value / maxValue) * 100
  const bgColor = color === "coral" ? "bg-coral" : "bg-teal"

  return (
    <div ref={ref} className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-sans text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="font-serif text-lg text-foreground">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-track rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${bgColor} rounded-full`}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
          transition={{
            duration: 1,
            delay: delay,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        />
      </div>
    </div>
  )
}
