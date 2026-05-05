"use client"

import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import * as d3 from "d3"
import { geoOrthographic, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import type { Topology, GeometryCollection } from "topojson-specification"
import { MapPin, X, ExternalLink, Info, ZoomIn, ZoomOut } from "lucide-react"

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
  isPerCountryData?: boolean
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(n)
}

const COUNTRY_NAME_MAP: Record<string, string> = {
  "United States": "United States of America",
}

export function WorldMapSection({ users, isPerCountryData = false }: WorldMapSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [worldData, setWorldData] = useState<Topology | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  // ── Mutable refs for high-frequency updates (no React re-renders) ──
  const rotationRef = useRef<[number, number]>([0, -20])
  const scaleRef = useRef(280)
  const isDraggingRef = useRef(false)
  const lastPosRef = useRef<[number, number]>([0, 0])
  const isInViewRef = useRef(false)
  const touchStartDistRef = useRef<number | null>(null)
  const globeWrapperRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  // D3 refs — persisted across renders
  const projectionRef = useRef<d3.GeoProjection | null>(null)
  const pathRef = useRef<d3.GeoPath | null>(null)
  const countryPathsRef = useRef<d3.Selection<SVGPathElement, any, SVGGElement, unknown> | null>(null)
  const outlineRef = useRef<d3.Selection<SVGCircleElement, unknown, SVGGElement, unknown> | null>(null)
  const oceanRef = useRef<d3.Selection<SVGCircleElement, unknown, SVGGElement, unknown> | null>(null)
  const sizeRef = useRef({ width: 0, height: 0 })
  const isInitRef = useRef(false)

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

  // ── Initialise D3 globe ONCE when data arrives ──
  useEffect(() => {
    if (!worldData || !svgRef.current || isInitRef.current) return
    isInitRef.current = true

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = svgRef.current.clientWidth || 800
    const height = Math.max(500, width * 0.6)
    sizeRef.current = { width, height }
    svg.attr("width", width).attr("height", height)

    const projection = geoOrthographic()
      .scale(scaleRef.current)
      .translate([width / 2, height / 2])
      .rotate(rotationRef.current)
    projectionRef.current = projection

    const path = geoPath().projection(projection)
    pathRef.current = path

    const countries = feature(
      worldData,
      worldData.objects.countries as GeometryCollection
    ).features

    // Ocean
    oceanRef.current = svg.append("circle")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", scaleRef.current)
      .attr("fill", "rgba(255,255,255,0.08)")
      .attr("stroke", "rgba(255,255,255,0.25)")
      .attr("stroke-width", 1)

    const getColor = (featureName: string) => {
      const ourName = Object.entries(COUNTRY_NAME_MAP).find(
        ([, v]) => v === featureName
      )?.[0] || featureName
      const data = byCountry[ourName]
      if (!data) return "rgba(255,255,255,0.12)"
      if (data.women.length > 0) return "rgba(255,107,107,0.75)"
      if (data.all.some((u) => u.gender === "male")) return "rgba(75,191,160,0.70)"
      return "rgba(255,255,255,0.12)"
    }

    // Country paths — created once, updated later
    countryPathsRef.current = svg.selectAll<SVGPathElement, any>("path.country")
      .data(countries)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", path as any)
      .attr("fill", (d: any) => getColor(d.properties?.name))
      .attr("stroke", "rgba(255,255,255,0.25)")
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
          d3.select(this).attr("stroke", "rgba(255,107,107,0.9)").attr("stroke-width", 1.5)
        }
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "rgba(255,255,255,0.25)").attr("stroke-width", 0.5)
      })

    // Globe outline
    outlineRef.current = svg.append("circle")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", scaleRef.current)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.30)")
      .attr("stroke-width", 1.5)

    // Start the render loop
    startRenderLoop()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldData, byCountry])

  // ── Render loop: rAF, updates projection + paths without React re-render ──
  const startRenderLoop = useCallback(() => {
    const loop = () => {
      const projection = projectionRef.current
      const path = pathRef.current
      const countryPaths = countryPathsRef.current
      const outline = outlineRef.current
      const ocean = oceanRef.current
      const { width, height } = sizeRef.current

      if (!projection || !path || !countryPaths || !outline || !ocean || width === 0) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      // Auto-rotate when not interacting
      if (isInViewRef.current && !isDraggingRef.current) {
        rotationRef.current[0] = (rotationRef.current[0] + 0.15) % 360
      }

      // Update projection
      projection
        .scale(scaleRef.current)
        .rotate(rotationRef.current)

      // Update paths (only the 'd' attribute — no DOM recreation)
      countryPaths.attr("d", path as any)

      // Update outline + ocean circles
      const r = scaleRef.current
      outline.attr("r", r)
      ocean.attr("r", r)

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  // Stop loop on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Resize handler
  const handleResize = useCallback(() => {
    if (!svgRef.current || !projectionRef.current || !outlineRef.current || !oceanRef.current) return
    const width = svgRef.current.clientWidth || 800
    const height = Math.max(500, width * 0.6)
    sizeRef.current = { width, height }
    d3.select(svgRef.current).attr("width", width).attr("height", height)
    projectionRef.current.translate([width / 2, height / 2])
    outlineRef.current.attr("cx", width / 2).attr("cy", height / 2)
    oceanRef.current.attr("cx", width / 2).attr("cy", height / 2)
  }, [])

  useEffect(() => {
    window.addEventListener("resize", handleResize, { passive: true })
    return () => window.removeEventListener("resize", handleResize)
  }, [handleResize])

  // Intersection observer for auto-rotate
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting
      },
      { threshold: 0.1 }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // ── Interaction handlers (write to refs, NOT React state) ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true
    lastPosRef.current = [e.clientX, e.clientY]
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastPosRef.current[0]
    const dy = e.clientY - lastPosRef.current[1]
    rotationRef.current = [
      rotationRef.current[0] + dx * 0.5,
      Math.max(-90, Math.min(90, rotationRef.current[1] - dy * 0.5)),
    ]
    lastPosRef.current = [e.clientX, e.clientY]
  }, [])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Trackpad pinch: only zoom when ctrlKey / metaKey is present
  const handleWheel = useCallback((e: WheelEvent) => {
    const isPinch = e.ctrlKey || e.metaKey
    if (!isPinch) return // let page scroll
    e.preventDefault()
    const delta = e.deltaY > 0 ? -20 : 20
    scaleRef.current = Math.max(150, Math.min(600, scaleRef.current + delta))
  }, [])

  useEffect(() => {
    const el = globeWrapperRef.current
    if (!el) return
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  const zoomIn = useCallback(() => {
    scaleRef.current = Math.min(600, scaleRef.current + 30)
  }, [])

  const zoomOut = useCallback(() => {
    scaleRef.current = Math.max(150, scaleRef.current - 30)
  }, [])

  // Touch: single finger = rotate, two fingers = pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchStartDistRef.current = Math.sqrt(dx * dx + dy * dy)
    } else if (e.touches.length === 1) {
      isDraggingRef.current = true
      lastPosRef.current = [e.touches[0].clientX, e.touches[0].clientY]
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const newDist = Math.sqrt(dx * dx + dy * dy)
      const ratio = newDist / touchStartDistRef.current
      touchStartDistRef.current = newDist
      scaleRef.current = Math.max(150, Math.min(600, scaleRef.current * ratio))
    } else if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - lastPosRef.current[0]
      const dy = e.touches[0].clientY - lastPosRef.current[1]
      rotationRef.current = [
        rotationRef.current[0] + dx * 0.5,
        Math.max(-90, Math.min(90, rotationRef.current[1] - dy * 0.5)),
      ]
      lastPosRef.current = [e.touches[0].clientX, e.touches[0].clientY]
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false
    touchStartDistRef.current = null
  }, [])

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
          <div className="flex items-center justify-center gap-2 mb-3">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">
              By Country
            </h2>
            <div className="relative group">
              <Info className="w-5 h-5 text-white/50 hover:text-white/80 transition cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 p-4 rounded-xl bg-[#1E2130]/95 border border-white/20 text-xs text-white/95 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-medium shadow-2xl backdrop-blur-xl">
                Only users who have a location set on their GitHub profile are shown. Countries are colored based on the gender breakdown of those users{isPerCountryData ? ' in our per-country top 100 sample' : ' within our top 500 sample'}.
              </div>
            </div>
          </div>
          <p className="text-sm text-white/85 max-w-lg mx-auto font-medium">
            Drag or swipe to rotate. Pinch or use the buttons to zoom.
            Click a country to explore.
            <span className="text-coral"> Coral</span> = has women · <span className="text-teal">Teal</span> = only men.
          </p>
          {!isPerCountryData ? (
            <p className="text-xs text-white/85 max-w-lg mx-auto mt-2 font-medium">
              Currently showing top 500 global users filtered by country. <span className="text-coral">Top 100 per country coming soon.</span>
            </p>
          ) : (
            <p className="text-xs text-white/30 max-w-lg mx-auto mt-2">
              Showing top 100 users per country by followers. <span className="text-teal">Data collected via GitHub API.</span>
            </p>
          )}
        </motion.div>

        <div className="relative">
          <div
            ref={globeWrapperRef}
            className="cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <svg ref={svgRef} className="w-full" style={{ minHeight: 500, maxWidth: '100%' }} />
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
            <button
              onClick={zoomIn}
              className="w-10 h-10 rounded-full glass-strong border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition active:scale-95"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={zoomOut}
              className="w-10 h-10 rounded-full glass-strong border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition active:scale-95"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-white/40">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,107,107,0.75)" }} />
            Has women
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(75,191,160,0.70)" }} />
            Only men
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,255,255,0.12)" }} />
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
                        <p className="text-sm text-white/80 mt-1 font-medium">
                          {total} users from {isPerCountryData ? 'top 100 in this country' : 'top 500 with location set'}
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
                        <span className="text-[10px] text-coral font-semibold">women ({womenPct}%)</span>
                      </div>
                      <div className="rounded-xl bg-teal/10 p-3 text-center">
                        <span className="block text-lg font-bold text-teal">{men}</span>
                        <span className="text-[10px] text-teal font-semibold">men ({menPct}%)</span>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                        <span className="block text-lg font-bold text-foreground">{unclass}</span>
                        <span className="text-[10px] text-white/70 font-medium">unclassified</span>
                      </div>
                    </div>

                    {women === 0 ? (
                      <div className="text-center py-8 text-white/70">
                        <p className="text-lg mb-2">No women identified in this sample.</p>
                        <p className="text-sm">This does not mean there are none.</p>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-sm font-semibold text-coral mb-3">Women ({women})</h4>
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
                                  <span className="font-light text-foreground text-sm truncate">{user.name || user.login}</span>
                                  <ExternalLink className="w-3 h-3 text-white/20 opacity-0 group-hover:opacity-100 transition shrink-0" />
                                </div>
                                <span className="text-xs text-coral">@{user.login}</span>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/75 font-medium">
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
