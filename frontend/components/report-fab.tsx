"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flag, X, CheckCircle, Loader2 } from "lucide-react"

const FORMSPREE_URL = "https://formspree.io/f/mgorbrlw"

const reportOptions = [
  {
    id: "gender_wrong",
    label: "My gender is wrong",
    description: "I am shown as male/female but I identify differently.",
  },
  {
    id: "not_listed",
    label: "I am not on the site",
    description: "My GitHub profile should be included in the data.",
  },
  {
    id: "remove_me",
    label: "Remove my profile",
    description: "I do not want to appear on this site.",
  },
  {
    id: "suggestion",
    label: "Suggestion or bug",
    description: "Feature ideas, data corrections, or technical issues.",
  },
]

type ReportType = (typeof reportOptions)[number]["id"] | null

export function ReportFAB() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedType, setSelectedType] = useState<ReportType>(null)
  const [formData, setFormData] = useState({
    githubUsername: "",
    currentGender: "",
    correctGender: "",
    description: "",
    email: "",
  })
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle")

  // Listen for global "open-report-modal" event from footer / other buttons
  useEffect(() => {
    const handler = () => {
      setOpen(true)
      setStep(1)
      setSelectedType(null)
    }
    window.addEventListener("open-report-modal", handler)
    return () => window.removeEventListener("open-report-modal", handler)
  }, [])

  const reset = useCallback(() => {
    setOpen(false)
    setStep(1)
    setSelectedType(null)
    setFormData({
      githubUsername: "",
      currentGender: "",
      correctGender: "",
      description: "",
      email: "",
    })
    setStatus("idle")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("submitting")

    const payload = new FormData()
    payload.append("report_type", selectedType || "")
    payload.append("github_username", formData.githubUsername)
    payload.append("description", formData.description)
    if (formData.currentGender) payload.append("current_gender", formData.currentGender)
    if (formData.correctGender) payload.append("correct_gender", formData.correctGender)
    if (formData.email) payload.append("reply_email", formData.email)

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        body: payload,
        headers: { Accept: "application/json" },
      })
      if (res.ok) {
        setStatus("success")
      } else {
        throw new Error("Submit failed")
      }
    } catch {
      setStatus("idle")
      alert("Something went wrong. Please try again or email us directly at gendergapintech@gmail.com")
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-coral text-primary-foreground shadow-lg shadow-coral/30 flex items-center justify-center hover:bg-coral/90 transition-colors"
        aria-label="Report an issue or suggestion"
      >
        <Flag className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={reset}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 glass-strong rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto border border-coral/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={reset}
                className="absolute top-4 right-4 w-8 h-8 rounded-full glass border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {status === "success" ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-coral mx-auto mb-4" />
                  <h3 className="font-serif text-xl text-foreground mb-2">Thank you!</h3>
                  <p className="text-sm text-white/60 mb-6">
                    We have received your message. We review every submission and will update the data accordingly.
                  </p>
                  <button
                    onClick={reset}
                    className="px-6 py-2 rounded-full bg-coral/20 text-coral text-sm font-medium hover:bg-coral/30 transition"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-6">
                    <h3 className="font-serif text-xl text-foreground mb-1">
                      {step === 1 ? "Report or Suggest" : "Tell us more"}
                    </h3>
                    <p className="text-xs text-white/50">
                      {step === 1
                        ? "What would you like to tell us?"
                        : "Help us understand so we can fix it."}
                    </p>
                  </div>

                  {/* Step 1 — Pick type */}
                  {step === 1 && (
                    <div className="space-y-3">
                      {reportOptions.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setSelectedType(opt.id)
                            setStep(2)
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            selectedType === opt.id
                              ? "border-coral/50 bg-coral/10"
                              : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="block text-sm font-semibold text-foreground">
                            {opt.label}
                          </span>
                          <span className="block text-xs text-white/75 mt-0.5 font-medium">
                            {opt.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Step 2 — Form */}
                  {step === 2 && selectedType && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* GitHub username */}
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-white/80 mb-1.5 font-semibold">
                          GitHub username
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="@username"
                          value={formData.githubUsername}
                          onChange={(e) => setFormData((p) => ({ ...p, githubUsername: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-coral/50 transition"
                        />
                      </div>

                      {/* Gender wrong → extra fields */}
                      {selectedType === "gender_wrong" && (
                        <>
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-white/80 mb-1.5 font-semibold">
                              Currently shown as
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. male"
                              value={formData.currentGender}
                              onChange={(e) => setFormData((p) => ({ ...p, currentGender: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-coral/50 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-white/40 mb-1.5">
                              Correct gender
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. female, non-binary, prefer not to say..."
                              value={formData.correctGender}
                              onChange={(e) => setFormData((p) => ({ ...p, correctGender: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-coral/50 transition"
                            />
                          </div>
                        </>
                      )}

                      {/* Description */}
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-white/40 mb-1.5">
                          Details
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Anything else we should know..."
                          value={formData.description}
                          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-coral/50 transition resize-none"
                        />
                      </div>

                      {/* Email (optional) */}
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-white/40 mb-1.5">
                          Your email <span className="text-white/20">(optional)</span>
                        </label>
                        <input
                          type="email"
                          placeholder="If you want a reply"
                          value={formData.email}
                          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-coral/50 transition"
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="px-4 py-2.5 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/[0.04] transition"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={status === "submitting"}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-coral text-primary-foreground text-sm font-medium hover:bg-coral/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {status === "submitting" && <Loader2 className="w-4 h-4 animate-spin" />}
                          {status === "submitting" ? "Sending..." : "Send report"}
                        </button>
                      </div>

                      <p className="text-[10px] text-white/60 text-center font-medium">
                        Or email us directly at{" "}
                        <a href="mailto:gendergapintech@gmail.com" className="text-coral/60 hover:text-coral transition">
                          gendergapintech@gmail.com
                        </a>
                      </p>
                    </form>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
