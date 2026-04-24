"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Info, X } from "lucide-react"
import type { YearStats, ContributorYearStats } from "@/lib/queries"

type TimelineVariant = "account_creation" | "contributions"

interface TimelineSectionProps {
  data: YearStats[] | ContributorYearStats[]
  variant?: TimelineVariant
}

export function TimelineSection({ data, variant = "account_creation" }: TimelineSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [showInfo, setShowInfo] = useState(false)

  const isContributions = variant === "contributions"

  const maxTotal = isContributions
    ? 100
    : Math.max(...(data as YearStats[]).map((d) => ("total" in d ? d.total : 0)), 1)

  const title = isContributions
    ? "Are women's contributions growing?"
    : "Has the gap narrowed over time?"

  const subtitle = isContributions
    ? "Percentage of public GitHub commits made by women among contributors to key AI repos."
    : "Each bar is the subset of today's GitHub top 500 whose account was created in that year."

  const footnote = isContributions
    ? "Based on GitHub's contributionsCollection GraphQL API. Data from ~1,700 contributors across 20 curated AI repos."
    : "Year of GitHub account creation, not year of contribution."

  return (
    <section
      ref={ref}
      className="min-h-screen flex items-center justify-center py-24 px-4 bg-transparent"
    >
      <div className="max-w-5xl w-full glass-strong rounded-2xl p-8 md:p-12 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">
              {title}
            </h2>
            <button
              onClick={() => setShowInfo(true)}
              className="p-1.5 rounded-full hover:bg-white/10 transition text-white/40 hover:text-white/70"
              aria-label="How is this measured?"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          <p className="text-white/70 max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>

        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No data yet — run the pipeline in <code>data/</code> first.
          </p>
        ) : (
          <div className="flex items-stretch justify-between gap-2 md:gap-4 h-64 md:h-80 border-b border-white/10 pb-2">
            {data.map((year, index) => {
              const y = year.year

              let female: number
              let male: number
              let unknown: number
              let heightPct: number
              let tooltipFemale: string
              let tooltipMale: string
              let tooltipUnknown: string

              if (isContributions) {
                const d = year as ContributorYearStats
                const fCommit = d.femaleCommitPct ?? 0
                const mCommit = d.maleCommitPct ?? 0
                const uCommit = d.unclassifiedCommitPct ?? 0

                female = Math.round(fCommit)
                male = Math.round(mCommit)
                unknown = Math.round(uCommit)
                // Normalize to ensure sum = 100
                const sum = female + male + unknown
                if (sum > 0 && sum !== 100) {
                  const diff = 100 - sum
                  unknown += diff
                }
                heightPct = 100

                tooltipFemale = `${fCommit.toFixed(1)}% commits by women`
                tooltipMale = `${mCommit.toFixed(1)}% commits by men`
                tooltipUnknown = `${uCommit.toFixed(1)}% commits from unclassified contributors`
              } else {
                const d = year as YearStats
                female = d.female
                male = d.male
                unknown = d.total - d.female - d.male
                heightPct = (d.total / maxTotal) * 100

                tooltipFemale = `${d.female} women`
                tooltipMale = `${d.male} men`
                tooltipUnknown = `${unknown} unclassified`
              }

              return (
                <motion.div
                  key={y}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="flex-1 flex flex-col items-center gap-2 group h-full"
                >
                  <div className="w-full flex flex-col justify-end flex-1 relative">
                    <motion.div
                      className="w-full flex flex-col rounded-t overflow-hidden"
                      initial={{ height: 0 }}
                      animate={isInView ? { height: `${heightPct}%` } : { height: 0 }}
                      transition={{ duration: 1, delay: index * 0.08 + 0.2, ease: "easeOut" }}
                    >
                      {unknown > 0 && (
                        <div
                          className="w-full bg-muted-foreground/30"
                          style={{ flexGrow: unknown }}
                          title={tooltipUnknown}
                        />
                      )}
                      {male > 0 && (
                        <div
                          className="w-full bg-teal"
                          style={{ flexGrow: male }}
                          title={tooltipMale}
                        />
                      )}
                      {female > 0 && (
                        <div
                          className="w-full bg-coral"
                          style={{ flexGrow: female }}
                          title={tooltipFemale}
                        />
                      )}
                    </motion.div>

                    {/* Tooltip on hover */}
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="glass-strong border border-white/10 px-3 py-2 rounded text-xs whitespace-nowrap">
                        <div className="font-serif font-bold text-foreground">{y}</div>
                        <div className="text-coral">{tooltipFemale}</div>
                        <div className="text-teal">{tooltipMale}</div>
                        {unknown > 0 && (
                          <div className="text-muted-foreground">{tooltipUnknown}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-sans text-muted-foreground">{y}</span>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-coral" />
            <span>Women</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-teal" />
            <span>Men</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted-foreground/30" />
            <span>Unclassified</span>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-xs text-muted-foreground/70 mt-6 max-w-xl mx-auto italic"
        >
          {footnote}
        </motion.p>

        {/* Info modal */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              onClick={() => setShowInfo(false)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 glass-strong rounded-2xl p-6 md:p-8 max-w-lg w-full border border-white/10 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-serif text-foreground">How we measure this</h3>
                  <button onClick={() => setShowInfo(false)} className="p-1.5 rounded-full hover:bg-white/10 transition">
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                <div className="space-y-4 text-sm text-white/70">
                  {isContributions ? (
                    <>
                      <p>
                        This chart tracks the <strong>share of public GitHub commits</strong> made by women
                        among the top contributors to 20 influential open-source AI repositories.
                      </p>
                      <p>
                        We selected repos like PyTorch, TensorFlow, Transformers, LangChain, and Llama —
                        the infrastructure that powers modern AI. From each repo we take the top 100 contributors
                        by commit count (~1,700 unique people total).
                      </p>
                      <p>
                        For every contributor, we fetch their yearly public activity via GitHub's API:
                        commits, pull requests, issues, and code reviews. Then we attribute each commit
                        to the gender classification of its author.
                      </p>
                      <p className="text-white/50 italic">
                        "Unclassified" means we couldn't determine gender from the available data
                        (no pronouns, no recognisable first name, or ambiguous name).
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        This chart shows the gender breakdown of the <strong>top 500 GitHub accounts by followers</strong>,
                        grouped by the year each account was created.
                      </p>
                      <p>
                        Each bar represents all accounts from the top 500 that were created in that year.
                        The height shows how many joined, and the colour split shows the gender distribution.
                      </p>
                      <p className="text-white/50 italic">
                        This is not about when people started contributing — it's about when they joined GitHub.
                        The shape is skewed toward older accounts because most top profiles were created in the 2010s.
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
