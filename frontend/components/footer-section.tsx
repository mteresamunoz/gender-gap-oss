"use client"

import { motion } from "framer-motion"

interface FooterSectionProps {
  totalAnalyzed?: number
  snapshotDate?: string
}

export function FooterSection({ totalAnalyzed, snapshotDate }: FooterSectionProps) {
  const now = new Date()
  const monthYear = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const displayDate = snapshotDate
    ? new Date(snapshotDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : monthYear

  return (
    <footer className="py-16 px-4 border-t border-white/10 bg-transparent">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-4">
            Where Are The Women?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            A data journalism project exploring gender representation in open source AI.
            Data sourced from GitHub and Hugging Face APIs.
          </p>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground mb-12">
            <div>
              <span className="block text-xs uppercase tracking-widest mb-1">Data Updated</span>
              <span className="text-foreground">{displayDate}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-widest mb-1">Profiles Analyzed</span>
              <span className="text-foreground">{totalAnalyzed ?? "—"}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-widest mb-1">Platforms</span>
              <span className="text-foreground">GitHub, Hugging Face</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <span className="inline-block w-3 h-3 rounded-full bg-coral" />
            <span className="text-xs text-muted-foreground">
              Coral = women
            </span>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <span className="inline-block w-3 h-3 rounded-full bg-teal" />
            <span className="text-xs text-muted-foreground">
              Teal = men
            </span>
          </div>
        </motion.div>

        <div className="mt-12 pt-8 border-t border-border text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Built by{" "}
            <a
              href="https://github.com/mteresamunoz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-coral/70 hover:text-coral transition-colors underline underline-offset-2"
            >
              @mteresamunoz
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
