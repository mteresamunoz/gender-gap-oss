import { ShaderWallpaper } from "@/components/shader-wallpaper"
import { HeroSection } from "@/components/hero-section"
import { ComparisonSection } from "@/components/comparison-section"
import { TimelineSection } from "@/components/timeline-section"
import { TimelineComingSoon } from "@/components/timeline-coming-soon"
import { MethodologyNote } from "@/components/methodology-note"
import { CategoryBreakdown } from "@/components/category-breakdown"
import { LanguageBreakdown } from "@/components/language-breakdown"
import { WorldMapSection } from "@/components/world-map-section"
import { OrganizationsSection } from "@/components/organizations-section"
import { FooterSection } from "@/components/footer-section"
import {
  getOverallStats,
  getWomenTopUsers,
  getOrganizations,
  getUsersWithCountry,
  getOrgStats,

  getTimelineByYear,
  getContributorTimeline,
  getAllOrgMembers,
} from "@/lib/queries"
import { WomenCarousel } from "@/components/women-carousel"

export const dynamic = "force-static"

export default function HomePage() {
  const stats = getOverallStats()
  const women = getWomenTopUsers()
  const orgs = getOrganizations()
  const usersByCountry = getUsersWithCountry()
  const orgStats = getOrgStats()
  const orgMembers = getAllOrgMembers()
  const classifiedCount = stats.female + stats.male

  // Try real timeline data; fall back to account creation years if no contributor data yet
  const contributorTimeline = getContributorTimeline()
  const accountTimeline = getTimelineByYear()

  const hasContributorData = contributorTimeline.length > 0

  return (
    <main className="min-h-screen relative">
      <ShaderWallpaper />

      <HeroSection
        femalePercent={stats.femalePercent}
        femaleCount={stats.female}
        classifiedCount={classifiedCount}
        totalAnalyzed={stats.total}
      />

      <WomenCarousel women={women} totalAnalyzed={stats.total} />

      <ComparisonSection
        github={{
          name: "GitHub",
          femalePercent: stats.femalePercent,
          description: `Top ${stats.total} by followers · ${stats.female} of ${classifiedCount} identified`,
        }}
        huggingface={null}
      />

      <MethodologyNote />

      {hasContributorData ? (
        <TimelineSection data={contributorTimeline} variant="contributions" />
      ) : accountTimeline.length > 0 ? (
        <TimelineSection data={accountTimeline} variant="account_creation" />
      ) : (
        <TimelineComingSoon />
      )}

      <CategoryBreakdown />

      <WorldMapSection users={usersByCountry} />

      <OrganizationsSection
        orgs={orgs}
        orgStats={orgStats}
        orgMembers={orgMembers}
      />

      <FooterSection totalAnalyzed={stats.total} snapshotDate={stats.snapshotDate} />
    </main>
  )
}
