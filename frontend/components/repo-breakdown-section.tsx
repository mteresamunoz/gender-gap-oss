"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  GitFork,
  X,
  Layers,
  BrainCircuit,
  MessageSquare,
  Eye,
  Database,
  Server,
  Music,
  ExternalLink,
  Search,
  Info,
} from "lucide-react"
import type { RepoStat, RepoYearStat, RepoContributor } from "@/lib/queries"

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  framework: <Layers className="w-3.5 h-3.5" />,
  ml: <BrainCircuit className="w-3.5 h-3.5" />,
  llm: <MessageSquare className="w-3.5 h-3.5" />,
  vision: <Eye className="w-3.5 h-3.5" />,
  data: <Database className="w-3.5 h-3.5" />,
  infra: <Server className="w-3.5 h-3.5" />,
  audio: <Music className="w-3.5 h-3.5" />,
}

const CATEGORY_LABEL: Record<string, string> = {
  framework: "Framework",
  ml: "ML",
  llm: "LLM",
  vision: "Vision",
  data: "Data",
  infra: "Infra",
  audio: "Audio",
}

interface RepoBreakdownSectionProps {
  repoStats: RepoStat[]
  repoTimelines: Record<string, RepoYearStat[]>
  repoWomen: Record<string, RepoContributor[]>
}

function repoName(repo: string) {
  return repo.split("/")[1] || repo
}

function repoOwner(repo: string) {
  return repo.split("/")[0] || repo
}

function MiniDonut({ pct, size = 40 }: { pct: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="-rotate-90">
      <path
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="4"
      />
      <path
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="#F97B6B"
        strokeWidth="4"
        strokeDasharray={`${Math.max(pct, 0.5)}, 100`}
      />
    </svg>
  )
}

export function RepoBreakdownSection({
  repoStats,
  repoTimelines,
  repoWomen,
}: RepoBreakdownSectionProps) {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showByCommits, setShowByCommits] = useState(false)

  const hasData = repoStats.length > 0

  const filteredRepos = useMemo(() => {
    let list = [...repoStats]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (r) =>
          r.repo.toLowerCase().includes(q) ||
          repoName(r.repo).toLowerCase().includes(q)
      )
    }
    return list
  }, [repoStats, searchQuery])

  const selectedTimeline = selectedRepo ? repoTimelines[selectedRepo] || [] : []
  const selectedWomen = selectedRepo ? repoWomen[selectedRepo] || [] : []

  return (
    <section className="min-h-[70vh] flex items-center justify-center py-20 px-4 bg-transparent">
      <div className="max-w-6xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="w-12 h-12 rounded-xl glass-strong border border-white/10 flex items-center justify-center mx-auto mb-4">
            <GitFork className="w-6 h-6 text-coral/80" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">
              Gender by Repository
            </h2>
            <div className="relative group">
              <Info className="w-5 h-5 text-white/50 hover:text-white/80 transition cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-4 rounded-xl bg-[#1E2130]/95 border border-white/20 text-xs text-white/95 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-medium shadow-2xl backdrop-blur-xl">
                Based on commit history from the top contributors of 20 curated open-source AI repositories. Click any repo to see the yearly breakdown.
              </div>
            </div>
          </div>
          <p className="text-white/85 max-w-xl mx-auto text-sm font-medium">
            {hasData
              ? `${repoStats.length} repositories analyzed. `
              : "Repository data is being collected. "}
            <span className="text-coral">
              {hasData ? "Click any repo to see the gender timeline." : ""}
            </span>
          </p>
        </motion.div>

        {!hasData ? (
          <p className="text-center text-xs text-white/30 py-12">
            Run <code className="text-coral/60">python scripts/fetch_repo_yearly.py</code> to populate per-repo stats.
          </p>
        ) : (
          <>
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-foreground placeholder:text-white/30 focus:outline-none focus:border-coral/50 transition"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Show:</span>
                <button
                  onClick={() => setShowByCommits(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition border ${
                    !showByCommits
                      ? "bg-coral/20 border-coral/40 text-coral"
                      : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06]"
                  }`}
                >
                  By people
                </button>
                <button
                  onClick={() => setShowByCommits(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition border ${
                    showByCommits
                      ? "bg-coral/20 border-coral/40 text-coral"
                      : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06]"
                  }`}
                >
                  By commits
                </button>
                <div className="relative group">
                  <Info className="w-4 h-4 text-white/50 hover:text-white/80 transition cursor-help" />
                  <div className="absolute right-0 bottom-full mb-2 w-64 p-3 rounded-xl bg-[#1E2130]/95 border border-white/20 text-xs text-white/95 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-medium shadow-2xl backdrop-blur-xl">
                    <span className="text-coral font-semibold">By people</span> counts each contributor once, regardless of how much they coded.<br /><br />
                    <span className="text-coral font-semibold">By commits</span> weights each person by their actual commit volume.
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-white/30 mb-4">
              Showing {filteredRepos.length} of {repoStats.length} repositories
              {searchQuery && ` matching "${searchQuery}"`}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredRepos.map((stat, index) => {
                const womenPct = showByCommits
                  ? stat.female_commit_pct
                  : stat.female_pct
                const hasWomen = stat.female > 0
                const category = stat.category || "unknown"

                return (
                  <motion.button
                    key={stat.repo}
                    onClick={() => setSelectedRepo(stat.repo)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.5) }}
                    className={`
                      group relative flex flex-col items-center rounded-xl p-4
                      border transition-all duration-200
                      ${hasWomen
                        ? "border-coral/35 bg-coral/[0.10] hover:border-coral/55 hover:bg-coral/[0.15]"
                        : "border-white/15 bg-white/[0.08] hover:border-white/30 hover:bg-white/[0.12]"
                      }
                      cursor-pointer
                    `}
                  >
                    {hasWomen && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-coral border-2 border-[#121212]" />
                    )}

                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-semibold text-foreground text-center truncate max-w-[140px]">
                        {repoName(stat.repo)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mb-2">
                      {CATEGORY_ICON[category] || null}
                      <span className="text-[10px] text-white/70 font-medium">
                        {CATEGORY_LABEL[category] || category}
                      </span>
                    </div>

                    <div className="mb-2">
                      <MiniDonut pct={womenPct || 0} size={44} />
                      <div className="text-center -mt-6 mb-1">
                        <span className="text-[10px] font-bold text-foreground">
                          {(womenPct || 0).toFixed(1).replace(".", ",")}%
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-white/75 text-center font-medium">
                      {stat.total_contributors} contributors
                    </div>
                    {stat.female > 0 ? (
                      <div className="text-[10px] text-coral font-bold">
                        {stat.female} women
                      </div>
                    ) : (
                      <div className="text-[10px] text-white/60 font-medium">No women detected</div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedRepo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={() => setSelectedRepo(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 glass-strong rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-coral/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-serif text-foreground">{repoName(selectedRepo)}</h3>
                  <p className="text-sm text-white/50 mt-1">
                    {repoOwner(selectedRepo)} / {repoName(selectedRepo)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://github.com/${selectedRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-white/10 transition"
                  >
                    <ExternalLink className="w-4 h-4 text-white/50" />
                  </a>
                  <button
                    onClick={() => setSelectedRepo(null)}
                    className="p-2 rounded-full hover:bg-white/10 transition"
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>
              </div>

              {(() => {
                const stat = repoStats.find((r) => r.repo === selectedRepo)
                if (!stat) return null

                const womenPct = showByCommits
                  ? stat.female_commit_pct
                  : stat.female_pct
                const menPct = showByCommits
                  ? stat.male_commit_pct
                  : stat.male_pct
                const unclassPct = showByCommits
                  ? stat.unclassified_commit_pct
                  : Math.max(0, 100 - womenPct - menPct)

                return (
                  <>
                    {/* Donut */}
                    <div className="flex items-center justify-center gap-6 mb-8">
                      <div className="relative w-28 h-28">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#F97B6B"
                            strokeWidth="3"
                            strokeDasharray={`${womenPct}, 100`}
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#4BBFA0"
                            strokeWidth="3"
                            strokeDasharray={`${menPct}, 100`}
                            strokeDashoffset={`-${womenPct}`}
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="3"
                            strokeDasharray={`${unclassPct}, 100`}
                            strokeDashoffset={`-${womenPct + menPct}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-foreground">
                            {womenPct.toFixed(1).replace(".", ",")}%
                            <span className="text-[8px] text-white/30 block">women</span>
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded bg-coral" />
                          <span className="text-white/70">
                            Women: {stat.female} ({stat.female_pct.toFixed(1).replace(".", ",")}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded bg-teal" />
                          <span className="text-white/70">
                            Men: {stat.male} ({stat.male_pct.toFixed(1).replace(".", ",")}%)
                          </span>
                        </div>
                        {stat.unknown > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded bg-white/20" />
                            <span className="text-white/40">
                              Unknown: {stat.unknown} ({((stat.unknown / stat.total_contributors) * 100).toFixed(1).replace(".", ",")}%)
                            </span>
                          </div>
                        )}
                        <div className="pt-1 text-[10px] text-white/30">
                          {showByCommits ? "By commit volume" : "By unique contributors"}
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    {selectedTimeline.length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-sm font-semibold text-foreground mb-4">
                          Yearly commit share
                        </h4>
                        <div className="flex items-stretch justify-between gap-2 md:gap-3 h-48 border-b border-white/10 pb-2">
                          {selectedTimeline.map((year) => {
                            const fCommit = year.female_commit_pct ?? 0
                            const mCommit = year.male_commit_pct ?? 0
                            const uCommit = year.unclassified_commit_pct ?? 0

                            let female = Math.round(fCommit)
                            let male = Math.round(mCommit)
                            let unknown = Math.round(uCommit)
                            const sum = female + male + unknown
                            if (sum > 0 && sum !== 100) {
                              unknown += 100 - sum
                            }

                            return (
                              <div
                                key={year.year}
                                className="flex-1 flex flex-col items-center gap-1.5 group h-full"
                              >
                                <div className="w-full flex flex-col justify-end flex-1 relative">
                                  <div className="w-full flex flex-col rounded-t overflow-hidden h-full">
                                    {unknown > 0 && (
                                      <div
                                        className="w-full bg-muted-foreground/30"
                                        style={{ flexGrow: unknown }}
                                        title={`${uCommit.toFixed(1)}% unclassified`}
                                      />
                                    )}
                                    {male > 0 && (
                                      <div
                                        className="w-full bg-teal"
                                        style={{ flexGrow: male }}
                                        title={`${mCommit.toFixed(1)}% men`}
                                      />
                                    )}
                                    {female > 0 && (
                                      <div
                                        className="w-full bg-coral"
                                        style={{ flexGrow: female }}
                                        title={`${fCommit.toFixed(1)}% women`}
                                      />
                                    )}
                                  </div>

                                  {/* Tooltip */}
                                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <div className="bg-[#1E2130]/95 border border-white/20 px-4 py-3 rounded-xl text-xs whitespace-nowrap shadow-2xl backdrop-blur-xl">
                                      <div className="font-serif font-bold text-white">{year.year}</div>
                                      <div className="text-coral font-semibold">{fCommit.toFixed(1)}% women</div>
                                      <div className="text-teal font-semibold">{mCommit.toFixed(1)}% men</div>
                                      {uCommit > 0 && (
                                        <div className="text-white/80 font-medium">{uCommit.toFixed(1)}% unclassified</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-sans text-muted-foreground">{year.year}</span>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded bg-coral" />
                            <span>Women</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded bg-teal" />
                            <span>Men</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded bg-muted-foreground/30" />
                            <span>Unclassified</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Women list */}
                    {selectedWomen.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-coral mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-coral" />
                          Women contributors ({selectedWomen.length})
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                          {selectedWomen.map((w) => (
                            <a
                              key={w.login}
                              href={`https://github.com/${w.login}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition"
                            >
                              {w.avatar_url ? (
                                <img
                                  src={w.avatar_url}
                                  alt={w.login}
                                  className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 ring-1 ring-white/10" />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-light text-foreground truncate">
                                  {w.name || w.login}
                                </div>
                                <div className="text-[10px] text-white/30 truncate">
                                  @{w.login}
                                </div>
                                <div className="text-[10px] text-coral/60">
                                  {w.total_commits} commits
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
