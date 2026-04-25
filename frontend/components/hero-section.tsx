"use client"

import { motion } from "framer-motion"
import { AnimatedNumber } from "./animated-number"
import { ChevronDown } from "lucide-react"

interface HeroSectionProps {
  femalePercent: number
  femaleCount: number
  classifiedCount: number
  totalAnalyzed: number
}

export function HeroSection({
  femalePercent,
  femaleCount,
  classifiedCount,
  totalAnalyzed,
}: HeroSectionProps) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative px-4 bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-center"
      >
        <h1 className="sr-only">Where Are The Women? Gender Gap in Open Source AI</h1>

        <div className="mb-6">
          <AnimatedNumber
            value={femalePercent}
            suffix="%"
            className="font-serif text-coral text-8xl md:text-[120px] lg:text-[150px] font-bold tracking-tight"
            duration={2}
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="font-sans text-lg md:text-xl text-white/80 max-w-xl mx-auto leading-relaxed"
        >
          are women among the{" "}
          <span className="text-foreground font-light">top {totalAnalyzed} most followed</span>{" "}
          profiles on GitHub.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.7 }}
          className="font-sans text-sm text-white/60 mt-3 max-w-md mx-auto"
        >
          {femaleCount} of {classifiedCount} profiles identified as individual people. The remaining{" "}
          {totalAnalyzed - classifiedCount}{" "}are organisation accounts or profiles whose name
          couldn&apos;t be classified.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2 }}
          className="mt-8"
        >
          <span className="inline-block px-4 py-1.5 text-xs font-sans uppercase tracking-widest text-muted-foreground border border-white/10 rounded-full glass">
            Where are the women?
          </span>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.5 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs font-sans uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.div>
    </section>
  )
}
