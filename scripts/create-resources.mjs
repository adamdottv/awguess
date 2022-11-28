import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import { parse } from "svg-parser"
// import fetch from "node-fetch"

const toPascalCase = (words) => {
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const categories = {
  "#C8511B#FF9900": "compute",
  "#C8511B#F90": "compute",
  "#1B660F#6CAE3E": "storage",
  "#2E27AD#527FFF": "database",
  "#B0084D#FF4F8B": "networking",
  "#4D27A8#A166FF": "analytics",
  "#055F4E#56C0A7": "machine-learning",
  "#BD0816#FF5252": "security",
}

const baseDir = "./public/images/original/"
const hashedDir = "./public/images/hashed/"

try {
  await fs.rm(path.join(baseDir, ".DS_Store"))
} catch { }

const files = await fs.readdir(baseDir)

await fs.rm(hashedDir, { recursive: true, force: true })
await fs.mkdir(hashedDir)

const metadata = JSON.parse(await fs.readFile("./data/raw.json"))
// let metadata
// try {
//   const services = await fetch(
//     "https://aws.amazon.com/api/dirs/items/search?item.directoryId=aws-products&sort_by=item.additionalFields.productNameLowercase&sort_order=asc&size=300&item.locale=en_US&tags.id=aws-products%23type%23service&tags.id=!aws-products%23type%23variant"
//   )
//   const json = await services.json()
//
//   metadata = JSON.parse(
//     JSON.stringify(json.items.map((i) => ({ ...i.item }))).replaceAll(
//       "?did=ap_card&trk=ap_card",
//       ""
//     )
//   )
//   await fs.writeFile("./data/raw.json", JSON.stringify(metadata, undefined, 2))
// } catch (error) {
//   console.warning("failed to read metadata from aws url")
// }

const manual = JSON.parse(await fs.readFile("./data/manual.json"))

const promises = []
const lacking = []
const resources = await Promise.all(
  files
    .filter((filename) => filename.indexOf("aws") || filename.indexOf("amazon"))
    .map(async (filename) => {
      const { name: hyphenatedName } = path.parse(filename)
      const [prefix, ...fullName] = hyphenatedName.split("-")
      const formatted = toPascalCase(fullName)
      const hash = crypto.createHash("md5").update(hyphenatedName).digest("hex")
      const oldPath = path.join(baseDir, filename)
      const newPath = path.join(hashedDir, `${hash}.svg`)
      promises.push(fs.copyFile(oldPath, newPath))

      const contents = await fs.readFile(oldPath, { encoding: "utf-8" })
      const parsed = parse(contents)
      const svg = parsed.children[0]
      const defs = svg.children[0]
      const gradient = defs.children[0]
      const [stop1, stop2] = gradient.children
      const stop1Color = stop1.properties["stop-color"]
      const stop2Color = stop2.properties["stop-color"]
      const category = categories[`${stop1Color}${stop2Color}`.toUpperCase()]

      let svgPaths
      if (svg.children[1].tagName !== "g") {
        const [, , ...paths] = svg.children
        svgPaths = paths
      } else {
        const g = svg.children[1]
        const [, ...paths] = g.children
        svgPaths = paths
      }
      const d = svgPaths.map((p) => p.properties.d)[0]

      if (!d) {
        console.log(filename)
        console.log(svg.children)
      }

      const meta = metadata?.find((m) =>
        m.name
          .replaceAll("elastic-file-system-", "")
          .startsWith(
            hyphenatedName
              .replaceAll("location-service", "location")
              .replaceAll("simple-storage-service", "s3")
              .replaceAll("virtual-private-cloud", "vpc")
          )
      )
      if (!meta) lacking.push(hyphenatedName)

      const productName = meta?.additionalFields?.productName
        ?.split(" ")
        .slice(1)
        .join(" ")

      const manualMetadata = manual.find((i) => i.id === hyphenatedName)

      return {
        id: hyphenatedName,
        name: productName ?? formatted,
        category,
        subcategory: meta?.additionalFields?.productCategory,
        url: meta?.additionalFields?.productUrl,
        summary: meta?.additionalFields?.productSummary,
        launchDate: meta?.additionalFields?.launchDate,
        d,
        image: {
          hash,
          hashed: `/images/hashed/${hash}.svg`,
          original: `/images/original/${hyphenatedName}.svg`,
          stop1Color,
          stop2Color,
        },
        prefix,
        ...(manualMetadata ?? {}),
      }
    })
)

await Promise.all(promises)

/* await fs.writeFile( */
/*   "./data/manual.json", */
/*   JSON.stringify( */
/*     lacking.map((l) => ({ id: l, name: "", subcategory: "" })), */
/*     undefined, */
/*     2 */
/*   ) */
/* ) */

await fs.writeFile(
  "./data/resources.json",
  JSON.stringify(resources, undefined, 2)
)
