"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Clock, MapPin, Building2, BarChart3 } from "lucide-react"

interface ComingSoonSectionProps {
  title: string
  subtitle: string
  phase: string
  icon: "map" | "building" | "chart"
}

const iconMap = {
  map: MapPin,
  building: Building2,
  chart: BarChart3,
}

export function ComingSoonSection({
  title,
  subtitle,
  phase,
  icon,
}: ComingSoonSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const Icon = iconMap[icon]

  return (
    <section
      ref={ref}
      className="min-h-screen flex items-center justify-center py-24 px-4 bg-transparent"
    >
      <div className="max-w-3xl w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          {/* Phase badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-white/10 mb-8">
            <Clock className="w-3.5 h-3.5 text-coral" />
            <span className="text-xs uppercase tracking-widest text-white/60">
              {phase}
            </span>
          </div>

          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl glass-strong border border-white/10 flex items-center justify-center mx-auto mb-8">
            <Icon className="w-10 h-10 text-coral/80" />
          </div>

          {/* Title */}
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-6">
            {title}
          </h2>

          {/* Subtitle */}
          <p className="text-white/70 text-lg max-w-xl mx-auto leading-relaxed mb-8">
            {subtitle}
          </p>

          {/* Estimate */}
          <div className="inline-flex items-center gap-3 px-6 py-3 glass-strong border border-white/10 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
            <span className="text-sm text-white/80 font-medium">
              Coming Soon
            </span>
          </div>

          {/* Mini roadmap teaser */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto"
          >
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-coral/20 flex items-center justify-center mx-auto mb-2">
                <span className="text-xs font-bold text-coral">1</span>
              </div>
              <p className="text-xs text-white/40">GitHub Top 500</p>
              <div className="w-1.5 h-1.5 rounded-full bg-coral mx-auto mt-2" />
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-xs font-bold text-white/40">2</span>
              </div>
              <p className="text-xs text-white/40">Global Map</p>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 mx-auto mt-2" />
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-xs font-bold text-white/40">3</span>
              </div>
              <p className="text-xs text-white/40">Hugging Face</p>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 mx-auto mt-2" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
