"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { AnimatedBar } from "./animated-bar"
import type { LanguageStats } from "@/lib/queries"

interface LanguageBreakdownProps {
  data: LanguageStats[]
}

export function LanguageBreakdown({ data }: LanguageBreakdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  // Sort by gap (ascending) so biggest gaps appear first.
  const sorted = [...data]
    .filter((d) => d.total >= 3)
    .sort((a, b) => a.femalePct - b.femalePct)

  const maxValue = Math.max(
    ...sorted.map((d) =>
      Math.max(d.femalePct, 100 - d.femalePct)
    ),
    10
  )

  return (
    <section ref={ref} className="min-h-screen flex items-center justify-center py-24 px-4 bg-transparent">
      <div className="max-w-3xl w-full glass-strong rounded-2xl p-8 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
            Languages &amp; the gap
          </h2>
          <p className="text-white/70 max-w-xl mx-auto">
            Top programming languages among the most-followed GitHub profiles
            — and the representation of women within each.
          </p>
        </motion.div>

        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No language data yet — run the pipeline first.
          </p>
        ) : (
          <div className="space-y-6">
            {sorted.map((item, index) => (
              <motion.div
                key={item.language}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <AnimatedBar
                  label={`${item.language} (${item.total})`}
                  value={item.femalePct}
                  maxValue={maxValue}
                  color="coral"
                  delay={index * 0.1}
                />
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 p-6 glass rounded-lg border border-white/10"
        >
          <p className="text-sm text-white/60">
            Based on the most-used language across each profile&apos;s public repositories.
            Only languages with at least 3 profiles in the top 500 are shown.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
