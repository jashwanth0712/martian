import { execSync } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const BUCKET = 's3://martian-assets-public'
const PROFILE = 'promptli'

const folders = ['static', 'resources']

for (const folder of folders) {
    const localPath = resolve(root, folder)
    const hasContent = existsSync(localPath) && readdirSync(localPath).length > 0

    if (hasContent) {
        console.log(`✓ ${folder}/ already exists, skipping download`)
        continue
    }

    console.log(`Downloading ${folder}/ from S3...`)
    try {
        execSync(`aws s3 sync ${BUCKET}/${folder}/ ${localPath}/ --profile ${PROFILE}`, {
            stdio: 'inherit',
        })
        console.log(`✓ ${folder}/ downloaded`)
    } catch (e) {
        console.error(`✗ Failed to download ${folder}/. Make sure AWS CLI is installed and the '${PROFILE}' profile is configured.`)
        process.exit(1)
    }
}
