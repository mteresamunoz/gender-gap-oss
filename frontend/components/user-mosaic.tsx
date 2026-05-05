"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Users, ExternalLink } from "lucide-react"

export type MosaicUser = {
  login: string
  name: string | null
  avatar_url: string | null
  followers: number
  top_language: string | null
  company: string | null
  gender: string | null
  isWoman: number
}

interface UserMosaicProps {
  users: MosaicUser[]
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(n)
}

export function UserMosaic({ users }: UserMosaicProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  const womenCount = users.filter((u) => u.isWoman).length

  return (
    <section
      ref={ref}
      className="min-h-[60vh] flex items-center justify-center py-20 px-4 bg-transparent"
    >
      <div className="max-w-6xl w-full glass-strong rounded-2xl p-6 md:p-10 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-start justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-coral/80" />
              <h2 className="font-serif text-2xl md:text-3xl text-white">
                The Top 500
              </h2>
            </div>
            <p className="text-sm text-white/60 max-w-lg">
              Every profile ranked by GitHub followers.{" "}
              <span className="text-coral font-light">{womenCount} women</span>{" "}
              out of {users.length} total.
            </p>
          </div>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-coral" />
              Woman
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/20" />
              Other / unknown
            </span>
          </div>
        </motion.div>

        {/* Scrollable grid container with fade masks */}
        <div className="relative">
          {/* Top fade */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[rgba(18,18,18,0.6)] to-transparent z-10 rounded-t-lg" />

          <div className="max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {users.map((user, i) => (
                <motion.a
                  key={user.login}
                  href={`https://github.com/${user.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={
                    isInView
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.95 }
                  }
                  transition={{ duration: 0.3, delay: Math.min(i * 0.008, 0.4) }}
                  className={`
                    group relative flex items-center gap-3 rounded-xl p-3
                    border transition-all duration-200
                    ${
                      user.isWoman
                        ? "border-coral/30 hover:border-coral/60 bg-coral/[0.04]"
                        : "border-white/5 hover:border-white/20 bg-white/[0.02]"
                    }
                    hover:bg-white/[0.06]
                  `}
                >
                  {/* Woman indicator dot */}
                  {user.isWoman ? (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-coral border-2 border-[#121212]" />
                  ) : null}

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.login}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-white/30 transition"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/5 ring-1 ring-white/10" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-sm font-light truncate ${
                          user.isWoman ? "text-coral" : "text-foreground"
                        }`}
                      >
                        @{user.login}
                      </span>
                      <ExternalLink className="w-3 h-3 text-white/20 opacity-0 group-hover:opacity-100 transition shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                      <span>{fmtFollowers(user.followers)} followers</span>
                      {user.top_language ? (
                        <>
                          <span className="text-white/10">·</span>
                          <span className="truncate max-w-[60px]">
                            {user.top_language}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Bottom fade */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[rgba(18,18,18,0.7)] to-transparent z-10 rounded-b-lg" />
        </div>

        {/* Mobile legend */}
        <div className="flex sm:hidden items-center gap-3 text-xs text-white/50 mt-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-coral" />
            Woman
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white/20" />
            Other / unknown
          </span>
        </div>
      </div>
    </section>
  )
}
