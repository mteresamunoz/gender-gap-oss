"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Clock, TrendingUp } from "lucide-react"

const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

export function TimelineComingSoon() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section
      ref={ref}
      className="min-h-screen flex items-center justify-center py-24 px-4 bg-transparent"
    >
      <div className="max-w-5xl w-full glass-strong rounded-2xl p-8 md:p-12 relative">
        {/* Coming Soon badge — top right, subtle */}
        <div className="absolute top-6 right-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-coral/30">
            <Clock className="w-3 h-3 text-coral" />
            <span className="text-xs uppercase tracking-widest text-coral font-semibold">
              Coming Soon
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="w-12 h-12 rounded-xl glass-strong border border-white/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-coral/80" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
            Has the gap narrowed over time?
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            Year-by-year breakdown of actual GitHub contributions from contributors to key AI repositories.
          </p>
        </motion.div>

        {/* Chart with empty bars — design visible, no data yet */}
        <div className="flex items-stretch justify-between gap-2 md:gap-4 h-64 md:h-80 border-b border-white/10 pb-2">
          {YEARS.map((year, index) => (
            <motion.div
              key={year}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="flex-1 flex flex-col items-center gap-2 group h-full"
            >
              <div className="w-full flex flex-col justify-end flex-1 relative">
                <motion.div
                  className="w-full flex flex-col rounded-t overflow-hidden"
                  initial={{ height: 0 }}
                  animate={isInView ? { height: `${20 + (index % 3) * 15}%` } : { height: 0 }}
                  transition={{ duration: 1, delay: index * 0.08 + 0.2, ease: "easeOut" }}
                >
                  {/* Empty placeholder segments */}
                  <div className="w-full bg-coral/10" style={{ flexGrow: 1 }} title="Women" />
                  <div className="w-full bg-teal/10" style={{ flexGrow: 2 }} title="Men" />
                  <div className="w-full bg-white/5" style={{ flexGrow: 1 }} title="Unclassified" />
                </motion.div>

                {/* Hover tooltip with dashes */}
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="glass-strong border border-white/10 px-3 py-2 rounded text-xs whitespace-nowrap">
                    <div className="font-serif font-bold text-white">{year}</div>
                    <div className="text-coral">Women: —%</div>
                    <div className="text-teal">Men: —%</div>
                    <div className="text-white/50">Unclassified: —</div>
                  </div>
                </div>
              </div>
              <span className="text-xs font-sans text-white/50">{year}</span>
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-8 text-xs text-white/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-coral/30" />
            <span>Women</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-teal/30" />
            <span>Men</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-white/10" />
            <span>Unclassified</span>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-xs text-white/40 mt-6 max-w-xl mx-auto italic"
        >
          Based on GitHub&apos;s contributionsCollection GraphQL API. Data loading in progress.
        </motion.p>
      </div>
    </section>
  )
}
