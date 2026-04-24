const fs = require("fs")
const path = require("path")

// This script lives in frontend/scripts/ → go up 2 levels to reach repo root.
const src = path.join(__dirname, "..", "..", "data", "db", "gender_gap.db")
const destDir = path.join(__dirname, "..", "db")
const dest = path.join(destDir, "gender_gap.db")

if (!fs.existsSync(src)) {
  console.error(`Source DB not found: ${src}`)
  process.exit(1)
}

fs.mkdirSync(destDir, { recursive: true })
fs.copyFileSync(src, dest)
console.log(`Copied DB to ${dest}`)
