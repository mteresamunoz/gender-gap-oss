"use client"

import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import * as d3 from "d3"
import { geoOrthographic, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import type { Topology, GeometryCollection } from "topojson-specification"
import { MapPin, X, ExternalLink } from "lucide-react"

export type UserWithCountry = {
  login: string
  name: string | null
  avatar_url: string | null
  followers: number
  country: string
  gender: string | null
  top_language: string | null
}

interface WorldMapSectionProps {
  users: UserWithCountry[]
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(n)
}

const COUNTRY_NAME_MAP: Record<string, string> = {
  "United States": "United States of America",
}

export function WorldMapSection({ users }: WorldMapSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [worldData, setWorldData] = useState<Topology | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [rotation, setRotation] = useState<[number, number]>([0, -20])
  const [scale, setScale] = useState(280)
  const isDragging = useRef(false)
  const lastPos = useRef<[number, number]>([0, 0])
  const isInView = useRef(false)

  const byCountry = useMemo(() => {
    const map: Record<string, { all: UserWithCountry[]; women: UserWithCountry[] }> = {}
    for (const u of users) {
      if (!map[u.country]) map[u.country] = { all: [], women: [] }
      map[u.country].all.push(u)
      if (u.gender === "female") map[u.country].women.push(u)
    }
    return map
  }, [users])

  // Fetch topojson
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then(setWorldData)
      .catch(console.error)
  }, [])

  // Auto-rotate when not interacting
  useEffect(() => {
    if (!isInView.current || isDragging.current) return
    const interval = setInterval(() => {
      setRotation((prev) => [(prev[0] + 0.15) % 360, prev[1]])
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // Intersection observer for auto-rotate
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInView.current = entry.isIntersecting
      },
      { threshold: 0.1 }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    lastPos.current = [e.clientX, e.clientY]
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastPos.current[0]
    const dy = e.clientY - lastPos.current[1]
    setRotation((prev) => [prev[0] + dx * 0.5, Math.max(-90, Math.min(90, prev[1] - dy * 0.5))])
    lastPos.current = [e.clientX, e.clientY]
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale((prev) => Math.max(150, Math.min(600, prev - e.deltaY * 0.5)))
  }, [])

  // Render globe
  useEffect(() => {
    if (!worldData || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = svgRef.current.clientWidth
    const height = Math.max(500, width * 0.6)
    svg.attr("width", width).attr("height", height)

    const projection = geoOrthographic()
      .scale(scale)
      .translate([width / 2, height / 2])
      .rotate(rotation)
    const path = geoPath().projection(projection)

    const countries = feature(
      worldData,
      worldData.objects.countries as GeometryCollection
    ).features

    // Ocean background
    svg.append("circle")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", scale)
      .attr("fill", "rgba(255,255,255,0.02)")
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-width", 1)

    const getColor = (featureName: string) => {
      const ourName = Object.entries(COUNTRY_NAME_MAP).find(
        ([, v]) => v === featureName
      )?.[0] || featureName
      const data = byCountry[ourName]
      if (!data) return "rgba(255,255,255,0.03)"
      if (data.women.length > 0) return "rgba(255,107,107,0.5)"
      if (data.all.some((u) => u.gender === "male")) return "rgba(75,191,160,0.45)"
      return "rgba(255,255,255,0.03)"
    }

    svg.selectAll("path.country")
      .data(countries)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", path as any)
      .attr("fill", (d: any) => getColor(d.properties?.name))
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-width", 0.5)
      .style("cursor", (d: any) => {
        const ourName = Object.entries(COUNTRY_NAME_MAP).find(
          ([, v]) => v === d.properties?.name
        )?.[0] || d.properties?.name
        return byCountry[ourName] ? "pointer" : "default"
      })
      .on("click", (_event: any, d: any) => {
        const ourName = Object.entries(COUNTRY_NAME_MAP).find(
          ([, v]) => v === d.properties?.name
        )?.[0] || d.properties?.name
        if (byCountry[ourName]) setSelectedCountry(ourName)
      })
      .on("mouseover", function (_event: any, d: any) {
        const ourName = Object.entries(COUNTRY_NAME_MAP).find(
          ([, v]) => v === d.properties?.name
        )?.[0] || d.properties?.name
        if (byCountry[ourName]) {
          d3.select(this).attr("stroke", "rgba(255,107,107,0.8)").attr("stroke-width", 1.5)
        }
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "rgba(255,255,255,0.1)").attr("stroke-width", 0.5)
      })

    // Globe outline
    svg.append("circle")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", scale)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", 1.5)
  }, [worldData, rotation, scale, byCountry])

  const selectedData = selectedCountry ? byCountry[selectedCountry] : null

  return (
    <section
      ref={containerRef}
      className="min-h-screen flex flex-col items-center justify-center py-20 px-4 bg-transparent relative"
    >
      <div className="max-w-5xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="w-12 h-12 rounded-xl glass-strong border border-white/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-6 h-6 text-coral/80" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
            By Country
          </h2>
          <p className="text-sm text-white/50 max-w-lg mx-auto">
            Drag to rotate the globe. Click a country to see women in the top GitHub users from that region.
            Coral = has women · Teal = only men. Data shows top 100 GitHub users per country.
          </p>
        </motion.div>

        <div
          className="rounded-2xl overflow-hidden border border-white/5 bg-white/[0.01] cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg ref={svgRef} className="w-full" style={{ minHeight: 500 }} />
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-white/40">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,107,107,0.5)" }} />
            Has women
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(75,191,160,0.45)" }} />
            Only men
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,255,255,0.03)" }} />
            No data
          </span>
        </div>
      </div>

      {/* Country panel */}
      <AnimatePresence>
        {selectedCountry && selectedData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={() => setSelectedCountry(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 glass-strong rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-coral/20"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const total = selectedData.all.length
                const women = selectedData.women.length
                const men = selectedData.all.filter((u) => u.gender === "male").length
                const unclass = total - women - men
                const classified = women + men
                const womenPct = classified > 0 ? Math.round((women / classified) * 100) : 0
                const menPct = classified > 0 ? Math.round((men / classified) * 100) : 0

                return (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-serif text-foreground">{selectedCountry}</h3>
                        <p className="text-sm text-white/50 mt-1">
                          Top {total} GitHub users from this country
                        </p>
                      </div>
                      <button onClick={() => setSelectedCountry(null)} className="p-2 rounded-full hover:bg-white/10 transition">
                        <X className="w-5 h-5 text-white/60" />
                      </button>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="rounded-xl bg-coral/10 p-3 text-center">
                        <span className="block text-lg font-bold text-coral">{women}</span>
                        <span className="text-[10px] text-coral/70">women ({womenPct}%)</span>
                      </div>
                      <div className="rounded-xl bg-teal/10 p-3 text-center">
                        <span className="block text-lg font-bold text-teal">{men}</span>
                        <span className="text-[10px] text-teal/70">men ({menPct}%)</span>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                        <span className="block text-lg font-bold text-foreground">{unclass}</span>
                        <span className="text-[10px] text-white/40">unclassified</span>
                      </div>
                    </div>

                    {women === 0 ? (
                      <div className="text-center py-8 text-white/40">
                        <p className="text-lg mb-2">No women identified in this sample.</p>
                        <p className="text-sm">This does not mean there are none.</p>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-sm font-medium text-coral mb-3">Women ({women})</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          {selectedData.women.map((user) => (
                            <a
                              key={user.login}
                              href={`https://github.com/${user.login}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-xl p-3 border border-coral/20 bg-coral/[0.03] hover:bg-coral/[0.07] transition group"
                            >
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.login} className="w-10 h-10 rounded-full object-cover ring-2 ring-coral/30" loading="lazy" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-coral/10 ring-2 ring-coral/30" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-foreground text-sm truncate">{user.name || user.login}</span>
                                  <ExternalLink className="w-3 h-3 text-white/20 opacity-0 group-hover:opacity-100 transition shrink-0" />
                                </div>
                                <span className="text-xs text-coral">@{user.login}</span>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/40">
                                  <span>{fmtFollowers(user.followers)} followers</span>
                                  {user.top_language && <><span>·</span><span>{user.top_language}</span></>}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </>
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
