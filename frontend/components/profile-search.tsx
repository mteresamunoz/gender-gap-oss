"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Search, Github, User } from "lucide-react"

// Mock profile data
const mockProfiles: Record<string, {
  name: string
  username: string
  avatar: string
  platform: "github" | "huggingface"
  country: string
  isWoman: boolean
  followers: number
  rank: number
}> = {
  "torvalds": {
    name: "Linus Torvalds",
    username: "torvalds",
    avatar: "https://avatars.githubusercontent.com/u/1024025",
    platform: "github",
    country: "Finland",
    isWoman: false,
    followers: 195000,
    rank: 1,
  },
  "juliasilge": {
    name: "Julia Silge",
    username: "juliasilge",
    avatar: "https://avatars.githubusercontent.com/u/12505835",
    platform: "github",
    country: "United States",
    isWoman: true,
    followers: 12500,
    rank: 156,
  },
  "hadley": {
    name: "Hadley Wickham",
    username: "hadley",
    avatar: "https://avatars.githubusercontent.com/u/4196",
    platform: "github",
    country: "United States",
    isWoman: false,
    followers: 25000,
    rank: 45,
  },
}

// Mock stats
const mockStats = {
  totalWomenGithub: 16,
  totalWomenHuggingface: 26,
  topCountryWomen: { country: "France", percentage: 7.5 },
}

export function ProfileSearch() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResult, setSearchResult] = useState<typeof mockProfiles[string] | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setNotFound(false)
    setSearchResult(null)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))

    const normalizedQuery = searchQuery.toLowerCase().trim()
    const profile = mockProfiles[normalizedQuery]

    if (profile) {
      setSearchResult(profile)
    } else {
      setNotFound(true)
    }
    setIsSearching(false)
  }

  return (
    <section ref={ref} className="min-h-screen flex items-center justify-center py-24 px-4 bg-transparent">
      <div className="max-w-2xl w-full glass-strong rounded-2xl p-8 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
            Profile Lookup
          </h2>
          <p className="text-muted-foreground">
            Search any GitHub or Hugging Face username to see their context in the data.
          </p>
        </motion.div>

        {/* Search form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onSubmit={handleSearch}
          className="mb-12"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any GitHub or Hugging Face username..."
              className="w-full pl-12 pr-4 py-4 glass border border-white/10 rounded-lg text-foreground font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-coral text-primary-foreground font-sans text-sm rounded-md hover:bg-coral/90 transition-colors disabled:opacity-50"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Try: torvalds, juliasilge, hadley
          </p>
        </motion.form>

        {/* Results */}
        <AnimatePresence mode="wait">
          {searchResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="glass border border-white/10 rounded-lg p-6 md:p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
                  {searchResult.avatar ? (
                    <img
                      src={searchResult.avatar}
                      alt={searchResult.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-xl text-foreground">{searchResult.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Github className="w-4 h-4" />
                    <span>@{searchResult.username}</span>
                    <span>·</span>
                    <span>{searchResult.country}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {searchResult.isWoman ? (
                  <>
                    <div className="p-4 bg-coral/10 border border-coral/20 rounded-lg">
                      <p className="text-foreground">
                        You are one of{" "}
                        <span className="font-serif text-coral text-2xl font-bold">
                          {searchResult.platform === "github"
                            ? mockStats.totalWomenGithub
                            : mockStats.totalWomenHuggingface}
                        </span>{" "}
                        women in the top 500 on{" "}
                        {searchResult.platform === "github" ? "GitHub" : "Hugging Face"}.
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-muted-foreground text-sm">
                        <span className="text-foreground font-light">
                          {mockStats.topCountryWomen.percentage}%
                        </span>{" "}
                        of profiles from {mockStats.topCountryWomen.country} are women —
                        the highest representation globally.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-muted-foreground">
                      Ranked <span className="text-foreground font-light">#{searchResult.rank}</span> on{" "}
                      {searchResult.platform === "github" ? "GitHub" : "Hugging Face"} with{" "}
                      <span className="text-foreground font-light">
                        {searchResult.followers.toLocaleString("en-US")}
                      </span>{" "}
                      followers.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Only{" "}
                      <span className="text-coral font-light">
                        {searchResult.platform === "github" ? "3.2%" : "5.1%"}
                      </span>{" "}
                      of the top 500 are women.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {notFound && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="glass border border-white/10 rounded-lg p-8 text-center"
            >
              <p className="text-muted-foreground mb-2">
                No profile found for &quot;{searchQuery}&quot;
              </p>
              <p className="text-sm text-muted-foreground">
                This is mock data. Try: torvalds, juliasilge, or hadley
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
