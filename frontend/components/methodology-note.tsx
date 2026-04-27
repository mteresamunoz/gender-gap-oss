"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Info, X, Heart, ShieldAlert, Scale } from "lucide-react"

const sections = [
  {
    icon: Scale,
    title: "What we measure",
    text: "This study uses statistical inference on first names to detect a structural pattern at scale. It is an analysis of representation — not a classification of individuals. The data is treated as what it is: an imperfect approximation of a real problem.",
  },
  {
    icon: ShieldAlert,
    title: "What we do not measure",
    text: "Gender inference is done via an offline name dictionary (gender-guesser), which only returns 'male' or 'female'. Non-binary, transgender, and gender-diverse people are not represented in this data. This is a limitation of the tool, not an intentional exclusion.",
  },
  {
    icon: Heart,
    title: "A note to trans & non-binary people",
    text: "If you are trans or non-binary and want your profile shown with a different description — or removed entirely — open an issue or a pull request. This project is open precisely for that. We do not want to reduce anyone to a category they do not identify with.",
  },
]

export function MethodologyNote() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [open, setOpen] = useState(false)

  return (
    <section ref={ref} className="py-12 px-4 bg-transparent">
      <div className="max-w-3xl mx-auto">
        {/* Collapsed badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-3 px-6 py-3 glass border border-white/10 rounded-full hover:border-coral/40 hover:bg-coral/5 transition-all group"
          >
            <Info className="w-4 h-4 text-coral group-hover:scale-110 transition-transform" />
            <span className="text-sm text-white/70 group-hover:text-white transition-colors">
              How we measure gender — and what that means
            </span>
            <span className="text-xs text-coral/60 group-hover:text-coral transition-colors">
              Read more
            </span>
          </button>
        </motion.div>

        {/* Expanded panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-8 glass-strong border border-white/10 rounded-2xl p-8 md:p-12 relative"
            >
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full glass border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-coral/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-10">
                <div className="w-14 h-14 rounded-2xl glass-strong border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Scale className="w-7 h-7 text-coral" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl text-white mb-3">
                  A note on methodology
                </h2>
                <p className="text-white/50 text-sm max-w-lg mx-auto">
                  Before you interpret these numbers, here is what they actually mean — and what they cannot mean.
                </p>
              </div>

              <div className="space-y-8">
                {sections.map((section, index) => (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.2 }}
                    className="flex gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <section.icon className="w-5 h-5 text-coral" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-white mb-1">
                        {section.title}
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed">
                        {section.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-10 pt-6 border-t border-white/10 text-center"
              >
                <p className="text-xs text-white/40">
                  Gender inference powered by{" "}
                  <a
                    href="https://github.com/lead-ratings/gender-guesser"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-coral/70 hover:text-coral transition-colors underline underline-offset-2"
                  >
                    gender-guesser
                  </a>
                  . If you spot an error in your classification, use the{" "}
                  <button
                    onClick={() => {
                      const evt = new CustomEvent("open-report-modal")
                      window.dispatchEvent(evt)
                    }}
                    className="text-coral/70 hover:text-coral transition-colors underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer"
                  >
                    report button
                  </button>
                  {" "}in the bottom-right corner.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
