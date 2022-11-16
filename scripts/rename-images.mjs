import fs from "fs/promises"
import crypto from "crypto"
import path from "path"

const baseDir = "./public/images/original"
const images = await fs.readdir(baseDir)

for (const image of images) {
  const { name } = path.parse(image)
  const oldPath = path.join(baseDir, image)
  const hash = crypto.createHash("md5").update(name).digest("hex")
  const newPath = path.join("./public/images", "hashed", `${hash}.svg`)
  await fs.copyFile(oldPath, newPath)
}
