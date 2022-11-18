import fs from "fs/promises"
import crypto from "crypto"
import path from "path"
import { parse } from "svg-parser"

const baseDir = "./public/images/original"
const images = await fs.readdir(baseDir)
const colors = []

for (const image of images) {
  const { name } = path.parse(image)
  const oldPath = path.join(baseDir, image)
  const hash = crypto.createHash("md5").update(name).digest("hex")
  const newPath = path.join("./public/images", "hashed", `${hash}.svg`)

  const contents = await fs.readFile(oldPath, { encoding: "utf-8" })
  const parsed = parse(contents)
  const svg = parsed.children[0]
  const [stop1, stop2] = svg.children[0].children[0].children
  const stop1Color = stop1.properties["stop-color"]
  const stop2Color = stop2.properties["stop-color"]
  const g = svg.children[1]
  const [, ...paths] = g.children
  const dees = paths.map((p) => p.properties.d)

  if (dees.length > 1) {
    console.log(dees)
  }

  /* console.log(stop1Color) */
  colors.push({ color: `${stop1Color} - ${stop2Color}`, service: name })

  /* console.log(JSON.stringify(parsed, undefined, 2)) */
  /* await fs.copyFile(oldPath, newPath) */
}

/* const set = Array.from(new Set(colors.map((c) => c.color))) */
/**/
/* console.log( */
/*   set.map( */
/*     (i) => */
/*       `${i} (${colors */
/*         .filter((c) => c.color === i) */
/*         .slice(0, 4) */
/*         .map((x) => x.service)})` */
/*   ) */
/* ) */

const categories = {
  compute: ["#C8511B", "#FF9900"],
  storage: ["#1B660F", "#6CAE3E"],
  database: ["#2E27AD", "#527FFF"],
  networking: ["#B0084D", "#FF4F8B"],
  analytics: ["#4D27A8", "#A166FF"],
  "machine-learning": ["#055F4E", "#56C0A7"],
  security: ["#BD0816", "#FF5252"],
}

/* [ */
/*   '#B0084D - #FF4F8B (amazon-api-gateway,amazon-appflow,amazon-cloudwatch,amazon-eventbridge)', */
/*   '#C8511B - #F90 (amazon-application-auto-scaling,amazon-braket,amazon-ec2-auto-scaling,amazon-ec2-image-builder)', */
/*   '#055F4E - #56C0A7 (amazon-appstream,amazon-augmented-ai-a2i,amazon-codeguru,amazon-codewhisperer)', */
/*   '#4D27A8 - #A166FF (amazon-athena,amazon-cloudfront,amazon-cloudsearch,amazon-emr)', */
/*   '#2E27AD - #527FFF (amazon-aurora,amazon-corretto,amazon-documentdb,amazon-dynamodb)', */
/*   '#BD0816 - #FF5252 (amazon-chime-sdk,amazon-chime-voice-connector,amazon-chime,amazon-cloud-directory)', */
/*   '#1B660F - #6CAE3E (amazon-efs,amazon-elastic-block-store,amazon-fsx-for-lustre,amazon-fsx-for-netapp-ontap)', */
/* ] */

/* { */
/*   "type": "root", */
/*   "children": [ */
/*     { */
/*       "type": "element", */
/*       "tagName": "svg", */
/*       "properties": { */
/*         "xmlns": "http://www.w3.org/2000/svg", */
/*         "width": 80, */
/*         "height": 80 */
/*       }, */
/*       "children": [ */
/*         { */
/*           "type": "element", */
/*           "tagName": "defs", */
/*           "properties": {}, */
/*           "children": [ */
/*             { */
/*               "type": "element", */
/*               "tagName": "linearGradient", */
/*               "properties": { */
/*                 "id": "a", */
/*                 "x1": "0%", */
/*                 "x2": "100%", */
/*                 "y1": "100%", */
/*                 "y2": "0%" */
/*               }, */
/*               "children": [ */
/*                 { */
/*                   "type": "element", */
/*                   "tagName": "stop", */
/*                   "properties": { */
/*                     "offset": "0%", */
/*                     "stop-color": "#2E27AD" */
/*                   }, */
/*                   "children": [] */
/*                 }, */
/*                 { */
/*                   "type": "element", */
/*                   "tagName": "stop", */
/*                   "properties": { */
/*                     "offset": "100%", */
/*                     "stop-color": "#527FFF" */
/*                   }, */
/*                   "children": [] */
/*                 } */
/*               ] */
/*             } */
/*           ] */
/*         }, */
/*         { */
/*           "type": "element", */
/*           "tagName": "g", */
/*           "properties": { */
/*             "fill": "none", */
/*             "fill-rule": "evenodd" */
/*           }, */
/*           "children": [ */
/*             { */
/*               "type": "element", */
/*               "tagName": "path", */
/*               "properties": { */
/*                 "fill": "url(#a)", */
/*                 "d": "M0 0h80v80H0z" */
/*               }, */
/*               "children": [] */
/*             }, */
/*             { */
/*               "type": "element", */
/*               "tagName": "path", */
/*               "properties": { */
/*                 "fill": "#FFF", */
/*                 "d": "M47.5 42.2h-2v13.883h-4v-9.916h-2v9.916h-4v-6.941h-2v6.94 */
/* 1h-2v1.984h18v-1.984h-2V42.2Zm8 7.438c0-7.929-6.505-14.38-14.5-14.38s-14.5 6.45 */
/* 1-14.5 14.38c0 7.928 6.505 14.379 14.5 14.379s14.5-6.451 14.5-14.38Zm2 0C57.5 5 */
/* 8.66 50.098 66 41 66c-9.098 0-16.5-7.34-16.5-16.362 0-9.022 7.402-16.363 16.5-1 */
/* 6.363 9.098 0 16.5 7.34 16.5 16.363ZM68 38.702c0 5.657-3.132 9.336-8.591 10.092 */
/* l-.277-1.965C62.266 46.396 66 44.634 66 38.702c0-5.568-4.247-7.583-7.809-8.292a */
/* .991.991 0 0 1-.801-.916c-.234-4.073-2.645-5.896-4.932-5.896-1.437 0-2.777.671- */
/* 3.676 1.842-.22.288-.585.433-.943.38a.997.997 0 0 1-.79-.637c-.81-2.168-2.01-4. */
/* 06-3.47-5.469-3.838-3.711-9.09-4.72-14.049-2.695-4.117 1.675-7.342 6.495-7.342  */
/* 10.974 0 .503.031 1.003.091 1.488a.99.99 0 0 1-.752 1.084c-2.437.6-6.527 2.443- */
/* 6.527 8.06 0 .212.011.403.021.604.183 3.292 3.047 6.315 6.966 7.351l-.515 1.916 */
/* c-4.744-1.254-8.218-5.02-8.448-9.16a12.628 12.628 0 0 1-.024-.71c0-6.491 4.538- */
/* 8.898 7.216-9.752a13.569 13.569 0 0 1-.028-.881c0-5.312 3.69-10.817 8.582-12.80 */
/* 8 5.718-2.337 11.778-1.175 16.205 3.11 1.338 1.29 2.481 2.924 3.351 4.778a6.557 */
/*  6.557 0 0 1 4.132-1.459c3.072 0 6.295 2.177 6.862 7.013 5.606 1.35 8.68 4.904  */
/* 8.68 10.075Z" */
/*               }, */
/*               "children": [] */
/*             } */
/*           ] */
/*         } */
/*       ], */
/*       "metadata": "" */
/*     } */
/*   ] */
/* } */
