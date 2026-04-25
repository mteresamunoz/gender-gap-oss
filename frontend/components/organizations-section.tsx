"use client"

import { useRef, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, ExternalLink, X, Users, Search, ChevronDown, Info } from "lucide-react"

export type Org = {
  login: string
  name: string | null
  avatar_url: string | null
  followers: number
}

export type OrgStat = {
  org_login: string
  total_members: number
  female: number
  male: number
  unclassified: number
  female_pct: number
  male_pct: number
  unclassified_pct: number
  has_data: boolean
}

export type OrgMember = {
  member_login: string
  name: string | null
  avatar_url: string | null
  followers: number
  gender: string | null
  gender_source: string | null
}

interface OrganizationsSectionProps {
  orgs: Org[]
  orgStats: OrgStat[]
  orgMembers?: OrgMember[]
  onSelectOrg?: (org: string) => void
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(n)
}

export function OrganizationsSection({ orgs, orgStats, orgMembers = [], onSelectOrg }: OrganizationsSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [viewCount, setViewCount] = useState<number | "all">(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)

  const statsByOrg: Record<string, OrgStat> = {}
  for (const s of orgStats) {
    statsByOrg[s.org_login.toLowerCase()] = s
  }

  const hasOrgData = orgStats.length > 0

  const filteredOrgs = useMemo(() => {
    let list = [...orgs]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (o) =>
          o.login.toLowerCase().includes(q) ||
          (o.name && o.name.toLowerCase().includes(q))
      )
    }
    if (viewCount !== "all") {
      list = list.slice(0, viewCount)
    }
    return list
  }, [orgs, searchQuery, viewCount])

  const selectedMembers = useMemo(() => {
    if (!selectedOrg) return []
    return orgMembers.filter(
      (m) => m.org_login === selectedOrg && (m.gender === "female" || m.gender === "male")
    )
  }, [selectedOrg, orgMembers])

  const womenMembers = selectedMembers.filter((m) => m.gender === "female")
  const menMembers = selectedMembers.filter((m) => m.gender === "male")

  const handleSelectOrg = (org: string) => {
    if (!hasOrgData) return
    setSelectedOrg(org)
    onSelectOrg?.(org)
  }

  return (
    <section ref={containerRef} className="min-h-[70vh] flex items-center justify-center py-20 px-4 bg-transparent">
      <div className="max-w-6xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="w-12 h-12 rounded-xl glass-strong border border-white/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-coral/80" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">
              Organizations in the Top 500
            </h2>
            <div className="relative group">
              <Info className="w-5 h-5 text-white/30 hover:text-white/60 transition cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 rounded-lg glass-strong border border-white/10 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                Only public GitHub organizations with publicly listed members are shown. We fetch member lists via the GitHub API for a curated set of orgs. Private members and orgs not in our list are not included.
              </div>
            </div>
          </div>
          <p className="text-white/50 max-w-xl mx-auto text-sm">
            {orgs.length} organisation accounts with public member data.{" "}
            {hasOrgData && (
              <span className="text-coral">
                Click any org to see gender diversity among their public members.
              </span>
            )}
          </p>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-foreground placeholder:text-white/30 focus:outline-none focus:border-coral/50 transition"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-foreground hover:bg-white/[0.06] transition"
            >
              {viewCount === "all" ? "Show all" : `Top ${viewCount}`}
              <ChevronDown className="w-4 h-4 text-white/40" />
            </button>
            <AnimatePresence>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 z-50 glass-strong border border-white/10 rounded-lg overflow-hidden min-w-[120px]"
                  >
                    {[10, 20, 50, "all" as const].map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setViewCount(n)
                          setShowDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/[0.06] transition ${
                          viewCount === n ? "text-coral" : "text-foreground"
                        }`}
                      >
                        {n === "all" ? "Show all" : `Top ${n}`}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-xs text-white/30 mb-4">
          Showing {filteredOrgs.length} of {orgs.length} organizations
          {searchQuery && ` matching "${searchQuery}"`}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredOrgs.map((org, index) => {
            const stat = statsByOrg[org.login.toLowerCase()]
            const hasWomen = stat && stat.female > 0

            return (
              <motion.button
                key={org.login}
                onClick={() => handleSelectOrg(org.login)}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.5) }}
                className={`
                  group relative flex flex-col items-center rounded-xl p-4
                  border transition-all duration-200
                  ${hasWomen
                    ? "border-coral/30 bg-coral/[0.03] hover:border-coral/50 hover:bg-coral/[0.07]"
                    : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                  }
                  ${hasOrgData ? "cursor-pointer" : "cursor-default"}
                `}
              >
                {hasWomen && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-coral border-2 border-[#121212]" />
                )}

                {org.avatar_url ? (
                  <img
                    src={org.avatar_url}
                    alt={org.login}
                    className="w-12 h-12 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-white/30 transition mb-3"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/5 ring-1 ring-white/10 mb-3" />
                )}

                <span className="text-xs font-light text-foreground text-center truncate w-full">
                  {org.name || org.login}
                </span>
                <span className="text-[10px] text-white/30 text-center">
                  @{org.login}
                </span>

                <div className="flex items-center gap-1 mt-1 text-[10px] text-white/30">
                  <span>{fmtFollowers(org.followers)}</span>
                </div>

                {stat && (
                  <div className="mt-2 text-center">
                    <div className="text-[10px] text-white/40">
                      <Users className="w-3 h-3 inline mr-1" />
                      {stat.total_members} members
                    </div>
                    {stat.female > 0 ? (
                      <div className="text-xs text-coral font-semibold">
                        {stat.female_pct}% women
                      </div>
                    ) : (
                      <div className="text-[10px] text-white/20">No women detected</div>
                    )}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {!hasOrgData && (
          <p className="text-center text-xs text-white/30 mt-6">
            Run <code className="text-coral/60">python scripts/fetch_org_members.py</code> to populate gender diversity stats.
          </p>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedOrg && statsByOrg[selectedOrg.toLowerCase()] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={() => setSelectedOrg(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 glass-strong rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-coral/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-serif text-foreground">@{selectedOrg}</h3>
                  <p className="text-sm text-white/50 mt-1">Public members analyzed</p>
                </div>
                <button onClick={() => setSelectedOrg(null)} className="p-2 rounded-full hover:bg-white/10 transition">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {(() => {
                const stat = statsByOrg[selectedOrg.toLowerCase()]
                const womenPct = stat.female_pct
                const menPct = stat.male_pct
                const unclassPct = stat.unclassified_pct

                return (
                  <>
                    {/* Stats cards */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                        <span className="block text-lg font-bold text-foreground">{stat.total_members}</span>
                        <span className="text-[10px] text-white/40">total</span>
                      </div>
                      <div className="rounded-xl bg-coral/10 p-3 text-center">
                        <span className="block text-lg font-bold text-coral">{stat.female}</span>
                        <span className="text-[10px] text-coral/70">{stat.female_pct.toFixed(1).replace('.', ',')}%</span>
                      </div>
                      <div className="rounded-xl bg-teal/10 p-3 text-center">
                        <span className="block text-lg font-bold text-teal">{stat.male}</span>
                        <span className="text-[10px] text-teal/70">{stat.male_pct.toFixed(1).replace('.', ',')}%</span>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                        <span className="block text-lg font-bold text-foreground">{stat.unclassified}</span>
                        <span className="text-[10px] text-white/40">{stat.unclassified_pct.toFixed(1).replace('.', ',')}%</span>
                      </div>
                    </div>

                    {/* Donut */}
                    {stat.total_members > 0 && (
                      <div className="flex items-center justify-center gap-6 mb-6">
                        <div className="relative w-24 h-24">
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
                            <span className="text-xs font-bold text-foreground">
                              {womenPct.toFixed(1).replace('.', ',')}%<span className="text-[8px] text-white/30 block">women</span>
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded bg-coral" />
                            <span className="text-white/70">Women: {stat.female} ({womenPct.toFixed(1).replace('.', ',')}%)</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded bg-teal" />
                            <span className="text-white/70">Men: {stat.male} ({menPct.toFixed(1).replace('.', ',')}%)</span>
                          </div>
                          {stat.unclassified > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 rounded bg-white/20" />
                              <span className="text-white/40">Unknown: {stat.unclassified} ({unclassPct.toFixed(1).replace('.', ',')}%)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Women list */}
                    {womenMembers.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-coral mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-coral" />
                          Women ({womenMembers.length})
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                          {womenMembers.map((m) => (
                            <a
                              key={m.member_login}
                              href={`https://github.com/${m.member_login}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition"
                            >
                              {m.avatar_url ? (
                                <img src={m.avatar_url} alt={m.member_login} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 ring-1 ring-white/10" />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-light text-foreground truncate">{m.name || m.member_login}</div>
                                <div className="text-[10px] text-white/30 truncate">@{m.member_login}</div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Men list */}
                    {menMembers.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-teal mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal" />
                          Men ({menMembers.length})
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                          {menMembers.map((m) => (
                            <a
                              key={m.member_login}
                              href={`https://github.com/${m.member_login}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition"
                            >
                              {m.avatar_url ? (
                                <img src={m.avatar_url} alt={m.member_login} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 ring-1 ring-white/10" />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-light text-foreground truncate">{m.name || m.member_login}</div>
                                <div className="text-[10px] text-white/30 truncate">@{m.member_login}</div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <a
                      href={`https://github.com/orgs/${selectedOrg}/people`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-coral/20 text-coral hover:bg-coral/30 transition font-light text-sm"
                    >
                      View on GitHub
                      <ExternalLink className="w-4 h-4" />
                    </a>
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
