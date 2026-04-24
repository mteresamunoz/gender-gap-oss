"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"

const countries = [
  { code: "all", name: "All Countries" },
  { code: "us", name: "United States" },
  { code: "cn", name: "China" },
  { code: "in", name: "India" },
  { code: "de", name: "Germany" },
  { code: "uk", name: "United Kingdom" },
  { code: "fr", name: "France" },
  { code: "jp", name: "Japan" },
  { code: "br", name: "Brazil" },
]

const categories = ["All", "NLP", "Vision", "Audio", "Multimodal", "RL", "Tabular"]

const years = [2020, 2021, 2022, 2023, 2024, 2025]

// Mock data generator based on filters
function getMockData(platform: string, country: string, category: string, yearStart: number, yearEnd: number) {
  const baseValues: Record<string, Record<string, number>> = {
    github: {
      all: 3.2, us: 4.1, cn: 2.8, in: 2.1, de: 5.2, uk: 4.8, fr: 5.5, jp: 1.9, br: 3.4,
    },
    huggingface: {
      all: 5.1, us: 6.2, cn: 4.1, in: 3.5, de: 7.1, uk: 6.8, fr: 7.5, jp: 3.2, br: 4.8,
    },
  }

  const categoryModifiers: Record<string, number> = {
    All: 1, NLP: 1.15, Vision: 0.95, Audio: 1.2, Multimodal: 0.9, RL: 0.7, Tabular: 1.05,
  }

  const yearTrend = 1 + ((yearEnd - 2020) * 0.02)
  const base = baseValues[platform.toLowerCase()]?.[country] || 3.5
  const modifier = categoryModifiers[category] || 1
  
  return Math.min(Number((base * modifier * yearTrend).toFixed(1)), 15)
}

// Liquid Gauge Component with SVG animation
function LiquidGauge({ value, maxValue = 20, size = 200, color = "coral" }: { value: number; maxValue?: number; size?: number; color?: "coral" | "teal" }) {
  const percentage = (value / maxValue) * 100
  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const colorClass = color === "coral" ? "text-coral" : "text-teal"
  const fillColor = color === "coral" ? "var(--coral)" : "var(--teal)"
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div 
        className="absolute inset-0 rounded-full opacity-20 blur-xl"
        style={{ background: fillColor }}
      />
      
      {/* Container */}
      <div className="absolute inset-0 rounded-full bg-card border border-border shadow-2xl" />
      
      {/* SVG gauge */}
      <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        
        {/* Animated progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
        
        {/* Liquid wave effect */}
        <defs>
          <clipPath id={`liquidClip-${size}`}>
            <motion.rect
              x="0"
              initial={{ y: size }}
              animate={{ y: size - (percentage / 100) * size }}
              transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
              width={size}
              height={size}
            />
          </clipPath>
          <linearGradient id={`liquidGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        
        <g clipPath={`url(#liquidClip-${size})`}>
          <motion.path
            d={`M 0 ${size / 2} Q ${size / 4} ${size / 2 - 15}, ${size / 2} ${size / 2} T ${size} ${size / 2} V ${size} H 0 Z`}
            fill={`url(#liquidGradient-${color})`}
            animate={{
              d: [
                `M 0 ${size / 2} Q ${size / 4} ${size / 2 - 15}, ${size / 2} ${size / 2} T ${size} ${size / 2} V ${size} H 0 Z`,
                `M 0 ${size / 2} Q ${size / 4} ${size / 2 + 15}, ${size / 2} ${size / 2} T ${size} ${size / 2} V ${size} H 0 Z`,
                `M 0 ${size / 2} Q ${size / 4} ${size / 2 - 15}, ${size / 2} ${size / 2} T ${size} ${size / 2} V ${size} H 0 Z`,
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>
      </svg>
      
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={value}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`font-serif text-4xl md:text-5xl font-bold ${colorClass}`}
        >
          {value}%
        </motion.span>
        <span className="text-xs text-muted-foreground mt-1">representation</span>
      </div>
    </div>
  )
}

// Floating stat card component
function FloatingStatCard({ 
  label, 
  value, 
  icon, 
  delay = 0,
  color = "coral" 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  delay?: number;
  color?: "coral" | "teal";
}) {
  const colorClass = color === "coral" ? "text-coral" : "text-teal"
  const borderColor = color === "coral" ? "border-coral/20" : "border-teal/20"
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative group cursor-default`}
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color === "coral" ? "from-coral/20 to-transparent" : "from-teal/20 to-transparent"} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`} />
      
      {/* Card */}
      <div className={`relative p-6 rounded-2xl bg-card border ${borderColor} shadow-2xl`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
            {icon}
          </div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        <motion.div
          key={value}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`font-serif text-3xl font-bold ${colorClass}`}
        >
          {value}
        </motion.div>
      </div>
    </motion.div>
  )
}

// Animated horizontal bar with liquid effect
function LiquidBar({ 
  label, 
  value, 
  maxValue = 20, 
  delay = 0 
}: { 
  label: string; 
  value: number; 
  maxValue?: number; 
  delay?: number;
}) {
  const percentage = (value / maxValue) * 100
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay }}
      className="group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-foreground">{label}</span>
        <motion.span
          key={value}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-serif text-lg text-coral font-semibold"
        >
          {value}%
        </motion.span>
      </div>
      
      <div className="relative h-3 rounded-full overflow-hidden bg-muted border border-border">
        {/* Animated fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--coral), var(--teal))",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, delay: delay + 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ["-100%", "500%"] }}
          transition={{ duration: 2, delay: delay + 1, repeat: Infinity, repeatDelay: 3 }}
        />
        
        {/* Floating particles */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/60 rounded-full"
            style={{ left: `${(i + 1) * 25}%` }}
            animate={{
              y: [-2, 2, -2],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 2,
              delay: delay + i * 0.3,
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

// Modern glass button component
function GlassButton({ 
  children, 
  active = false, 
  onClick,
  color = "coral"
}: { 
  children: React.ReactNode; 
  active?: boolean; 
  onClick?: () => void;
  color?: "coral" | "teal";
}) {
  const activeClass = color === "coral" 
    ? "bg-coral/20 border-coral/50 text-coral shadow-coral/20" 
    : "bg-teal/20 border-teal/50 text-teal shadow-teal/20"
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative px-5 py-2.5 rounded-xl text-sm font-sans font-medium
        border transition-all duration-300
        ${active 
          ? `${activeClass} shadow-lg` 
          : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-foreground/20"
        }
      `}
    >
      {/* Glow effect for active state */}
      {active && (
        <motion.div
          layoutId="activeGlow"
          className={`absolute inset-0 rounded-xl ${color === "coral" ? "bg-coral/10" : "bg-teal/10"} blur-xl`}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

// Glass select component
function GlassSelect({ 
  value, 
  onChange, 
  options,
  label
}: { 
  value: string; 
  onChange: (value: string) => void; 
  options: { value: string; label: string }[];
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        className="w-full px-4 py-3 rounded-xl text-left text-sm font-sans
          bg-muted border border-border
          hover:bg-muted/80 hover:border-foreground/20 transition-all duration-300
          flex items-center justify-between gap-2"
      >
        <span className="text-foreground">
          {options.find(o => o.value === value)?.label || label}
        </span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="w-4 h-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 py-2 rounded-xl
              bg-card border border-border shadow-2xl"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-2.5 text-left text-sm font-sans
                  hover:bg-muted transition-colors
                  ${value === option.value ? "text-coral" : "text-foreground"}`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Year range slider with glass effect
function GlassYearSlider({
  range,
  onChange,
  years
}: {
  range: [number, number];
  onChange: (range: [number, number]) => void;
  years: number[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">From</span>
        <span className="font-serif text-lg text-coral">{range[0]}</span>
        <span className="text-sm text-muted-foreground">To</span>
        <span className="font-serif text-lg text-teal">{range[1]}</span>
      </div>
      
      <div className="flex gap-3">
        {years.map((year) => {
          const isInRange = year >= range[0] && year <= range[1]
          const isStart = year === range[0]
          const isEnd = year === range[1]
          
          return (
            <motion.button
              key={year}
              onClick={() => {
                if (year <= range[1]) {
                  onChange([year, range[1]])
                }
                if (year >= range[0]) {
                  onChange([range[0], year])
                }
              }}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex-1 py-2 rounded-lg text-xs font-sans font-medium
                border transition-all duration-300
                ${isStart 
                  ? "bg-coral/20 border-coral/50 text-coral" 
                  : isEnd 
                    ? "bg-teal/20 border-teal/50 text-teal"
                    : isInRange 
                      ? "bg-muted border-border text-foreground"
                      : "bg-card border-border text-muted-foreground"
                }
              `}
            >
              {year.toString().slice(-2)}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export function FilterSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [platform, setPlatform] = useState(searchParams.get("platform") || "github")
  const [country, setCountry] = useState(searchParams.get("country") || "all")
  const [category, setCategory] = useState(searchParams.get("category") || "All")
  const [yearRange, setYearRange] = useState<[number, number]>([
    Number(searchParams.get("yearStart")) || 2020,
    Number(searchParams.get("yearEnd")) || 2025,
  ])

  const [displayValue, setDisplayValue] = useState(3.2)

  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    params.set("platform", platform)
    params.set("country", country)
    params.set("category", category)
    params.set("yearStart", yearRange[0].toString())
    params.set("yearEnd", yearRange[1].toString())
    router.push(`?${params.toString()}`, { scroll: false })
  }, [platform, country, category, yearRange, router])

  useEffect(() => {
    const newValue = getMockData(platform, country, category, yearRange[0], yearRange[1])
    setDisplayValue(newValue)
    updateURL()
  }, [platform, country, category, yearRange, updateURL])

  // Calculate additional stats
  const totalContributors = Math.floor(displayValue * 156.25)
  const globalAvg = 4.2
  const trend = displayValue > globalAvg ? "above" : "below"
  const trendDiff = Math.abs(displayValue - globalAvg).toFixed(1)

  return (
    <section ref={ref} className="min-h-screen py-24 px-4 relative overflow-hidden bg-transparent">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, var(--coral) 0%, transparent 70%)", opacity: 0.05 }}
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, var(--teal) 0%, transparent 70%)", opacity: 0.05 }}
          animate={{ scale: [1.2, 1, 1.2], x: [0, -40, 0], y: [0, 40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            Explore the Data
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Dive deep into the numbers. Filter, analyze, and discover patterns.
          </p>
        </motion.div>

        {/* Main glass container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          {/* Outer glow */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-coral/20 via-transparent to-teal/20 blur-xl opacity-50" />
          
          {/* Main panel */}
          <div className="relative rounded-3xl bg-card border border-border shadow-2xl p-8 md:p-12">
            {/* Filter controls */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Platform */}
              <div>
                <label className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-3 block">
                  Platform
                </label>
                <div className="flex gap-2">
                  <GlassButton active={platform === "github"} onClick={() => setPlatform("github")} color="coral">
                    GitHub
                  </GlassButton>
                  <GlassButton active={platform === "huggingface"} onClick={() => setPlatform("huggingface")} color="teal">
                    Hugging Face
                  </GlassButton>
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-3 block">
                  Country
                </label>
                <GlassSelect
                  value={country}
                  onChange={setCountry}
                  options={countries.map(c => ({ value: c.code, label: c.name }))}
                  label="Select country"
                />
              </div>

              {/* Category */}
              <div className="lg:col-span-2">
                <label className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-3 block">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <GlassButton
                      key={cat}
                      active={category === cat}
                      onClick={() => setCategory(cat)}
                      color={category === cat ? "teal" : "coral"}
                    >
                      {cat}
                    </GlassButton>
                  ))}
                </div>
              </div>
            </div>

            {/* Year range */}
            <div className="mb-12">
              <label className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-4 block">
                Year Range
              </label>
              <GlassYearSlider range={yearRange} onChange={setYearRange} years={years} />
            </div>

            {/* Results visualization */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Liquid gauge */}
              <div className="flex justify-center">
                <LiquidGauge 
                  value={displayValue} 
                  size={280} 
                  color={platform === "github" ? "coral" : "teal"} 
                />
              </div>

              {/* Stats and bars */}
              <div className="space-y-8">
                {/* Floating stat cards */}
                <div className="grid grid-cols-2 gap-4">
                  <FloatingStatCard
                    label="Contributors"
                    value={totalContributors}
                    delay={0.2}
                    color="coral"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    }
                  />
                  <FloatingStatCard
                    label={`${trend} avg`}
                    value={`${trend === "above" ? "+" : "-"}${trendDiff}%`}
                    delay={0.3}
                    color={trend === "above" ? "teal" : "coral"}
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend === "above" ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"} />
                      </svg>
                    }
                  />
                </div>

                {/* Category breakdown bars */}
                <div className="space-y-4">
                  <h4 className="text-sm uppercase tracking-widest text-muted-foreground">By Category</h4>
                  {categories.filter(c => c !== "All").slice(0, 4).map((cat, i) => (
                    <LiquidBar
                      key={cat}
                      label={cat}
                      value={getMockData(platform, country, cat, yearRange[0], yearRange[1])}
                      delay={i * 0.1}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Context label */}
            <motion.p
              key={`${platform}-${country}-${category}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-12 text-sm text-muted-foreground"
            >
              Showing women representation on{" "}
              <span className="text-foreground font-medium">{platform === "github" ? "GitHub" : "Hugging Face"}</span>
              {country !== "all" && (
                <>
                  {" "}in{" "}
                  <span className="text-foreground font-medium">
                    {countries.find((c) => c.code === country)?.name}
                  </span>
                </>
              )}
              {category !== "All" && (
                <>
                  {" "}for{" "}
                  <span className="text-foreground font-medium">{category}</span>
                </>
              )}
              {" "}({yearRange[0]}-{yearRange[1]})
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
