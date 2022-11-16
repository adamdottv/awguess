import fs from "fs"
import path from "path"
import crypto from "crypto"

const toPascalCase = (words) => {
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export const resources = fs
  .readdirSync("./public/images/original/")
  .filter((filename) => filename.indexOf("aws") || filename.indexOf("amazon"))
  .map((filename) => {
    const { name: hyphenatedName } = path.parse(filename)
    const [prefix, ...fullName] = hyphenatedName.split("-")
    const formatted = toPascalCase(fullName)
    const hash = crypto.createHash("md5").update(hyphenatedName).digest("hex")

    /* export * from "../../public/images/hashed/002a4ccaea69face88e56c45dab1c236.svg" */
    return {
      name: formatted,
      image: {
        hash,
        hashed: `/images/hashed/${hash}.svg`,
        original: `/images/original/${hyphenatedName}.svg`,
      },
      prefix,
    }
  })

fs.writeFileSync(
  "./data/resources.json",
  JSON.stringify(resources, undefined, 2)
)
fs.writeFileSync(
  "./src/utils/icons.ts",
  resources
    .map(
      (r) => `export * from "../../public/images/hashed/${r.image.hash}.svg"`
    )
    .join("\n")
)
