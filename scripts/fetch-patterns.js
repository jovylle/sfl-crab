// @ts-nocheck
// scripts/fetch-patterns.js

import fs from 'fs/promises'
import path from 'path'
import fetch from 'node-fetch'
import { Project } from 'ts-morph'
import prettier from 'prettier'

const REMOTE_TS_URL =
  'https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/features/game/types/desert.ts'
const GENERATED_DIR = path.resolve(process.cwd(), 'src/generated')

async function run () {
  // 1) fetch remote TS
  const res = await fetch(REMOTE_TS_URL)
  if (!res.ok) throw new Error(`Failed to fetch desert.ts: ${res.status}`)
  const tsText = await res.text()

  // 2) parse with ts-morph
  const project = new Project({ useInMemoryFileSystem: true })
  const srcFile = project.createSourceFile('desert.ts', tsText)

  const seasonalDecl = srcFile.getVariableDeclaration('SEASONAL_ARTEFACT')
  const diggingDecl = srcFile.getVariableDeclaration('DIGGING_FORMATIONS')
  if (!seasonalDecl || !diggingDecl) {
    throw new Error('Missing expected exports in desert.ts')
  }

  const tasks = [
    { decl: diggingDecl, name: 'diggingFormations' },
    { decl: seasonalDecl, name: 'seasonalArtefacts' },
  ]

  await fs.mkdir(GENERATED_DIR, { recursive: true })

  for (const { decl, name } of tasks) {
    const init = decl.getInitializer()
    if (!init) throw new Error(`No initializer for ${name}`)
    const literalText = init.getText()
    const moduleSrc = `
/** AUTO-GENERATED — DO NOT EDIT */
export const ${name} = ${literalText} as const;
`
    const formatted = await prettier.format(moduleSrc, { parser: 'typescript' })
    const outPath = path.join(GENERATED_DIR, `${name}.ts`)
    await fs.writeFile(outPath, formatted, { encoding: 'utf-8' })

    console.log(`✔ Generated ${outPath}`)
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
