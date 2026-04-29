"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ExternalLink, X, Users } from "lucide-react"

export type CarouselUser = {
  login: string
  name: string | null
  avatar_url: string | null
  followers: number
  top_language: string | null
  company: string | null
  country: string | null
}

interface WomenCarouselProps {
  women: CarouselUser[]
  totalAnalyzed: number
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(n)
}

export function WomenCarousel({ women, totalAnalyzed }: WomenCarouselProps) {
  const [selected, setSelected] = useState<CarouselUser | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const handleCardClick = useCallback((user: CarouselUser) => {
    setSelected(user)
    setIsPaused(true)
  }, [])

  const handleClose = useCallback(() => {
    setSelected(null)
    setIsPaused(false)
  }, [])

  // If no women, show a strong statement instead of empty space.
  if (women.length === 0) {
    return (
      <section className="py-20 px-4 bg-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <Users className="w-8 h-8 text-coral/60 mx-auto mb-4" />
          <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
            Women in the top {totalAnalyzed}
          </h2>
          <p className="text-white/50 text-lg">
            No women identified in this dataset yet.
          </p>
        </div>
      </section>
    )
  }

  // Duplicate items for seamless infinite scroll.
  // If only 1 woman, repeat her 6 times so the track has width to scroll.
  const repeatCount = women.length === 1 ? 6 : women.length < 4 ? 4 : 2
  const trackItems: CarouselUser[] = []
  for (let i = 0; i < repeatCount; i++) {
    trackItems.push(...women)
  }

  const speedSeconds = Math.max(trackItems.length * 4, 20)

  return (
    <section className="py-16 md:py-24 bg-transparent relative overflow-hidden">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 mb-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
              Women in the top {totalAnalyzed}
            </h2>
            <p className="text-sm text-white/50">
              {women.length} {women.length === 1 ? "profile" : "profiles"} identified.{" "}
              <span className="text-coral">Click to pause & explore.</span>
            </p>
          </div>
          <div className="hidden md:block text-right">
            <span className="text-4xl font-serif font-bold text-coral">
              {women.length}
            </span>
            <span className="text-sm text-white/40 block">women</span>
          </div>
        </div>
      </div>

      {/* Marquee track */}
      <div
        className="relative"
        style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
      >
        <div
          ref={trackRef}
          className="flex gap-5 py-4"
          style={{
            animation: `marqueeScroll ${speedSeconds}s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
            width: "max-content",
          }}
        >
          {trackItems.map((user, i) => (
            <button
              key={`${user.login}-${i}`}
              onClick={() => handleCardClick(user)}
              className={`
                group relative flex-shrink-0 flex flex-col items-center
                rounded-2xl p-5 min-w-[140px] md:min-w-[180px]
                border border-coral/20 bg-coral/[0.03]
                hover:border-coral/50 hover:bg-coral/[0.07]
                transition-all duration-300 cursor-pointer
                ${selected?.login === user.login ? "ring-2 ring-coral scale-105" : ""}
              `}
            >
              {/* Avatar */}
              <div className="relative mb-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-coral/30 group-hover:ring-coral/60 transition"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-coral/10 ring-2 ring-coral/30" />
                )}
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-coral border-2 border-[#121212] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#121212]">♀</span>
                </span>
              </div>

              {/* Name */}
              <span className="text-sm font-light text-foreground truncate max-w-[140px]">
                {user.name || user.login}
              </span>
              <span className="text-xs text-coral/80 truncate max-w-[140px]">
                @{user.login}
              </span>

              {/* Stats */}
              <div className="flex items-center gap-2 mt-2 text-[11px] text-white/40">
                <span>{fmtFollowers(user.followers)}</span>
                {user.top_language && (
                  <>
                    <span>·</span>
                    <span>{user.top_language}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected card overlay */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={handleClose}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Expanded card */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 glass-strong rounded-3xl p-8 md:p-10 max-w-sm w-full border border-coral/30"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>

              <div className="flex flex-col items-center text-center">
                {selected.avatar_url ? (
                  <img
                    src={selected.avatar_url}
                    alt={selected.login}
                    className="w-24 h-24 rounded-full object-cover ring-3 ring-coral/40 mb-4"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-coral/10 ring-3 ring-coral/40 mb-4" />
                )}

                <h3 className="text-xl font-serif text-foreground mb-1">
                  {selected.name || selected.login}
                </h3>
                <p className="text-coral font-light mb-4">@{selected.login}</p>

                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <span className="block text-lg font-bold text-foreground">
                      {fmtFollowers(selected.followers)}
                    </span>
                    <span className="text-xs text-white/40">followers</span>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <span className="block text-lg font-bold text-foreground">
                      {selected.top_language || "—"}
                    </span>
                    <span className="text-xs text-white/40">top language</span>
                  </div>
                  {selected.company && (
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <span className="block text-sm font-bold text-foreground truncate">
                        {selected.company}
                      </span>
                      <span className="text-xs text-white/40">company</span>
                    </div>
                  )}
                  {selected.country && (
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <span className="block text-sm font-bold text-foreground truncate">
                        {selected.country}
                      </span>
                      <span className="text-xs text-white/40">country</span>
                    </div>
                  )}
                </div>

                <a
                  href={`https://github.com/${selected.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-coral/20 text-coral hover:bg-coral/30 transition font-light text-sm"
                >
                  View on GitHub
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes marqueeScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  )
}
