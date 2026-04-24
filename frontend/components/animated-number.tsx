"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useSpring, useTransform } from "framer-motion"

interface AnimatedNumberProps {
  value: number
  suffix?: string
  className?: string
  duration?: number
  delay?: number
  triggerOnce?: boolean
}

export function AnimatedNumber({
  value,
  suffix = "%",
  className = "",
  duration = 1.5,
  delay = 0,
  triggerOnce = true,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: triggerOnce, margin: "-100px" })
  const [hasAnimated, setHasAnimated] = useState(false)

  const spring = useSpring(0, {
    damping: 30,
    stiffness: 100,
    duration: duration * 1000,
  })

  const display = useTransform(spring, (current) => {
    if (value < 10) {
      return current.toFixed(1)
    }
    return Math.round(current).toString()
  })

  useEffect(() => {
    if (isInView && !hasAnimated) {
      const timer = setTimeout(() => {
        spring.set(value)
        setHasAnimated(true)
      }, delay * 1000)
      return () => clearTimeout(timer)
    }
  }, [isInView, value, spring, delay, hasAnimated])

  // Reset animation when value changes
  useEffect(() => {
    if (hasAnimated) {
      spring.set(value)
    }
  }, [value, spring, hasAnimated])

  return (
    <span ref={ref} className={className}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}
