import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import { parse } from "svg-parser"

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

const files = await fs.readdir("./public/images/original/")

const resources = await Promise.all(
  files
    .filter((filename) => filename.indexOf("aws") || filename.indexOf("amazon"))
    .map(async (filename) => {
      const { name: hyphenatedName } = path.parse(filename)
      const [prefix, ...fullName] = hyphenatedName.split("-")
      const formatted = toPascalCase(fullName)
      const hash = crypto.createHash("md5").update(hyphenatedName).digest("hex")

      const contents = await fs.readFile(
        path.join("./public/images/original/", filename),
        { encoding: "utf-8" }
      )
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

      return {
        name: formatted,
        category,
        d,
        image: {
          hash,
          hashed: `/images/hashed/${hash}.svg`,
          original: `/images/original/${hyphenatedName}.svg`,
          stop1Color,
          stop2Color,
        },
        prefix,
      }
    })
)

await fs.writeFile(
  "./data/resources.json",
  JSON.stringify(resources, undefined, 2)
)
