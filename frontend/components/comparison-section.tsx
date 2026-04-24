"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { AnimatedNumber } from "./animated-number"

interface PlatformStats {
  name: string
  femalePercent: number
  description: string
}

interface ComparisonSectionProps {
  github: PlatformStats
  huggingface: PlatformStats | null
}

export function ComparisonSection({ github, huggingface }: ComparisonSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const platforms: Array<PlatformStats | { placeholder: true; name: string }> =
    huggingface ? [github, huggingface] : [github, { placeholder: true, name: "Hugging Face" }]

  return (
    <section ref={ref} className="min-h-screen flex items-center justify-center py-24 px-4 bg-transparent">
      <div className="max-w-5xl w-full glass-strong rounded-2xl p-8 md:p-12">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="font-serif text-3xl md:text-4xl text-center mb-16 text-foreground"
        >
          The Platform Divide
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="text-center"
            >
              <span className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-4 block">
                {platform.name}
              </span>

              {"placeholder" in platform ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <span className="font-serif text-5xl md:text-6xl text-muted-foreground/40 font-bold">
                    —
                  </span>
                  <span className="inline-block px-3 py-1 text-xs font-sans uppercase tracking-widest text-muted-foreground border border-white/10 rounded-full glass">
                    Coming soon
                  </span>
                  <p className="text-sm text-white/60 max-w-xs mx-auto">
                    Hugging Face data will be added in a later phase of the project.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <AnimatedNumber
                      value={platform.femalePercent}
                      suffix="%"
                      className="font-serif text-6xl md:text-7xl text-coral font-bold"
                      duration={1.5}
                      delay={0.3 + index * 0.2}
                    />
                  </div>

                  <p className="text-sm text-white/70 mb-8">{platform.description}</p>

                  <div className="max-w-xs mx-auto">
                    <div className="h-3 bg-track rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-coral rounded-full"
                        initial={{ width: 0 }}
                        animate={
                          isInView
                            ? { width: `${platform.femalePercent}%` }
                            : { width: 0 }
                        }
                        transition={{
                          duration: 1.2,
                          delay: 0.5 + index * 0.2,
                          ease: [0.25, 0.1, 0.25, 1],
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-muted-foreground mt-16 max-w-2xl mx-auto"
        >
          {huggingface
            ? "Both platforms reveal a significant gender imbalance in the most-followed open source accounts."
            : "GitHub already shows a stark gap in its top 500. Hugging Face will join this view when its data lands."}
        </motion.p>
      </div>
    </section>
  )
}
