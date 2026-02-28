#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

// Find all files containing "체키"
const files = execSync('grep -rl "체키" src --include="*.tsx" --include="*.ts" --include="*.json"', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean)

let totalReplacements = 0

files.forEach(file => {
  try {
    const content = readFileSync(file, 'utf-8')
    const newContent = content.replace(/체키/g, '체크인')

    if (content !== newContent) {
      const count = (content.match(/체키/g) || []).length
      writeFileSync(file, newContent, 'utf-8')
      console.log(`✓ ${file}: ${count}개 변경`)
      totalReplacements += count
    }
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`)
  }
})

console.log(`\n총 ${totalReplacements}개의 "체키"를 "체크인"으로 변경했습니다.`)
