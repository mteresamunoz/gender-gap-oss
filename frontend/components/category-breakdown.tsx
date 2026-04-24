"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Clock, BarChart3 } from "lucide-react"

const categories = [
  "NLP",
  "Computer Vision",
  "Audio",
  "Multimodal",
  "Reinforcement Learning",
  "Tabular",
]

export function CategoryBreakdown() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="min-h-screen flex items-center justify-center py-24 px-4 bg-transparent">
      <div className="max-w-3xl w-full glass-strong rounded-2xl p-8 md:p-12 relative">
        {/* Coming Soon badge — top right */}
        <div className="absolute top-6 right-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-coral/30">
            <Clock className="w-3 h-3 text-coral" />
            <span className="text-xs uppercase tracking-widest text-coral font-medium">
              Coming Soon
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="w-12 h-12 rounded-xl glass-strong border border-white/10 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6 text-coral/80" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
            Where is the gap biggest?
          </h2>
          <p className="text-white/70 max-w-xl mx-auto">
            Breaking down gender representation across AI categories on Hugging Face.
          </p>
        </motion.div>

        {/* Bars visible but empty — design shown, no data */}
        <div className="space-y-6">
          {categories.map((name, index) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-sans text-white/60 uppercase tracking-wider">
                  {name}
                </span>
                <span className="font-serif text-lg text-white/30">—%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-coral/20 rounded-full"
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${15 + (index % 4) * 12}%` } : { width: 0 }}
                  transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 p-6 glass rounded-lg border border-white/10"
        >
          <p className="text-sm text-white/50">
            Based on Hugging Face model pipeline tags. Data collection in progress.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
