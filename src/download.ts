import { downloadZip } from 'client-zip'

export interface DownloadOptions {
  projectId: string
  outputPath?: string
  timeout?: number
  maxFileSize?: number
  maxTotalSize?: number
  verbose?: boolean
}

interface StackBlitzProject {
  appFiles: Record<string, {
    name: string
    type: 'file' | 'directory'
    contents: string
    fullPath: string
  }>
}

interface StackBlitzProjectResponse {
  project: StackBlitzProject
}

/**
 * Downloads a StackBlitz project and returns it as a Response (universal)
 *
 * @param options - Configuration options for the download
 * @returns Response containing the zip file
 *
 * @example
 * ```ts
 * import { downloadToResponse } from 'stackblitz-zip'
 *
 * const response = await downloadToResponse({
 *   projectId: 'nuxt-starter-k7spa3r4'
 * })
 * ```
 */
export async function downloadToResponse(options: Omit<DownloadOptions, 'outputPath'>): Promise<Response> {
  const {
    projectId,
    timeout = 30000,
    maxFileSize = 10 * 1024 * 1024, // 10MB per file
    maxTotalSize = 100 * 1024 * 1024, // 100MB total
    verbose = false,
  } = options

  if (!/^[\w-]+$/.test(projectId)) {
    throw new Error('Invalid project ID: must contain only alphanumeric characters, hyphens, and underscores')
  }

  const url = `https://stackblitz.com/api/projects/${projectId}?include_files=true`
  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(`Fetching project: ${url}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`)
    }

    const { project: projectData } = await response.json() as StackBlitzProjectResponse

    if (!projectData || !projectData.appFiles) {
      throw new Error('No files found in project data')
    }

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`Found ${Object.keys(projectData.appFiles).length} files in project`)
    }

    const files: Array<{ name: string, lastModified?: Date, input: string | Uint8Array }> = []
    let totalSize = 0

    // Add all files to the zip
    for (const [filePath, fileData] of Object.entries(projectData.appFiles)) {
      if (filePath.includes('node_modules/') || filePath.includes('.git/')) {
        continue
      }

      // Skip directories
      if (fileData.type !== 'file') {
        continue
      }

      // Sanitize file path to prevent zip slip attacks
      const normalizedPath = normalizePath(filePath)
      if (!normalizedPath || normalizedPath.startsWith('/') || normalizedPath.includes('..')) {
        if (verbose) {
          console.warn(`Skipping suspicious file path: ${filePath}`)
        }
        continue
      }

      // Check file size (using TextEncoder for accurate byte length)
      const encoder = new TextEncoder()
      const fileBytes = encoder.encode(fileData.contents)
      const fileSize = fileBytes.length

      if (fileSize > maxFileSize) {
        throw new Error(`File ${normalizedPath} exceeds maximum size of ${maxFileSize} bytes`)
      }

      totalSize += fileSize
      if (totalSize > maxTotalSize) {
        throw new Error(`Total project size exceeds maximum of ${maxTotalSize} bytes`)
      }

      if (verbose) {
        // eslint-disable-next-line no-console
        console.log(`Adding file: ${normalizedPath}`)
      }
      files.push({ name: normalizedPath, input: fileData.contents })
    }

    return downloadZip(files)
  }
  catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`)
    }
    throw error
  }
}

/**
 * Normalize a file path to prevent directory traversal (Web API compatible)
 */
function normalizePath(path: string): string {
  // Remove leading/trailing slashes and dots
  const parts = path.split('/').filter(part => part && part !== '.')

  // Build normalized path, removing any '..' segments
  const normalized: string[] = []
  for (const part of parts) {
    if (part === '..') {
      // Remove parent if exists, otherwise skip
      if (normalized.length > 0) {
        normalized.pop()
      }
    }
    else {
      normalized.push(part)
    }
  }

  return normalized.join('/')
}

/**
 * Downloads a StackBlitz project as a zip file (Node.js only)
 *
 * @param options - Configuration options for the download
 * @returns Path to the downloaded zip file
 *
 * @example
 * ```ts
 * import { downloadToFile } from 'stackblitz-zip'
 *
 * await downloadToFile({
 *   projectId: 'nuxt-starter-k7spa3r4',
 *   outputPath: './my-project.zip'
 * })
 * ```
 */
export async function downloadToFile(options: DownloadOptions): Promise<string> {
  const { projectId, outputPath, verbose = false } = options

  const zipResponse = await downloadToResponse(options)

  // Dynamically import Node.js modules
  const { resolve } = await import('node:path')
  const { writeFile } = await import('node:fs/promises')
  const { Buffer } = await import('node:buffer')
  const process = await import('node:process')

  // Determine output path
  const finalOutputPath = outputPath || resolve(process.cwd(), `${projectId}.zip`)

  // Generate and write the zip file
  const blob = await zipResponse.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  await writeFile(finalOutputPath, buffer)

  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(`✅ Project downloaded to: ${finalOutputPath}`)
  }

  return finalOutputPath
}

export interface CloneOptions {
  projectId: string
  outputPath?: string
  timeout?: number
  maxFileSize?: number
  maxTotalSize?: number
  verbose?: boolean
}

/**
 * Clones a StackBlitz project by creating all files in a target directory (Node.js only)
 *
 * @param options - Configuration options for cloning
 * @returns Path to the created directory
 *
 * @example
 * ```ts
 * import { cloneProject } from 'stackblitz-zip'
 *
 * await cloneProject({
 *   projectId: 'nuxt-starter-k7spa3r4',
 *   outputPath: './my-project'
 * })
 * ```
 */
export async function cloneProject(options: CloneOptions): Promise<string> {
  const {
    projectId,
    outputPath,
    timeout = 30000,
    maxFileSize = 10 * 1024 * 1024, // 10MB per file
    maxTotalSize = 100 * 1024 * 1024, // 100MB total
    verbose = false,
  } = options

  if (!/^[\w-]+$/.test(projectId)) {
    throw new Error('Invalid project ID: must contain only alphanumeric characters, hyphens, and underscores')
  }

  // Dynamically import Node.js modules
  const { resolve, join, dirname } = await import('node:path')
  const { writeFile, mkdir } = await import('node:fs/promises')
  const process = await import('node:process')

  // Determine output path
  const finalOutputPath = outputPath || resolve(process.cwd(), projectId)

  const url = `https://stackblitz.com/api/projects/${projectId}?include_files=true`
  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(`Fetching project: ${url}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`)
    }

    const { project: projectData } = await response.json() as StackBlitzProjectResponse

    if (!projectData || !projectData.appFiles) {
      throw new Error('No files found in project data')
    }

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`Found ${Object.keys(projectData.appFiles).length} files in project`)
    }

    let totalSize = 0
    let fileCount = 0

    // Create the output directory
    await mkdir(finalOutputPath, { recursive: true })

    // Write all files to the target directory
    for (const [filePath, fileData] of Object.entries(projectData.appFiles)) {
      if (filePath.includes('node_modules/') || filePath.includes('.git/')) {
        continue
      }

      // Skip directories
      if (fileData.type !== 'file') {
        continue
      }

      // Sanitize file path to prevent directory traversal
      const normalizedPath = normalizePath(filePath)
      if (!normalizedPath || normalizedPath.startsWith('/') || normalizedPath.includes('..')) {
        if (verbose) {
          console.warn(`Skipping suspicious file path: ${filePath}`)
        }
        continue
      }

      // Check file size
      const encoder = new TextEncoder()
      const fileBytes = encoder.encode(fileData.contents)
      const fileSize = fileBytes.length

      if (fileSize > maxFileSize) {
        throw new Error(`File ${normalizedPath} exceeds maximum size of ${maxFileSize} bytes`)
      }

      totalSize += fileSize
      if (totalSize > maxTotalSize) {
        throw new Error(`Total project size exceeds maximum of ${maxTotalSize} bytes`)
      }

      // Create file path and ensure parent directories exist
      const fullFilePath = join(finalOutputPath, normalizedPath)
      const fileDir = dirname(fullFilePath)
      await mkdir(fileDir, { recursive: true })

      // Write the file
      await writeFile(fullFilePath, fileData.contents, 'utf-8')
      fileCount++

      if (verbose) {
        // eslint-disable-next-line no-console
        console.log(`Created file: ${normalizedPath}`)
      }
    }

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`✅ Project cloned to: ${finalOutputPath} (${fileCount} files)`)
    }

    return finalOutputPath
  }
  catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`)
    }
    throw error
  }
}

/**
 * Downloads a StackBlitz project and returns it as an ArrayBuffer (universal)
 *
 * @param options - Configuration options for the download
 * @returns ArrayBuffer containing the zip file
 */
export async function downloadToBuffer(options: Omit<DownloadOptions, 'outputPath'>): Promise<ArrayBuffer> {
  const zipResponse = await downloadToResponse(options)
  const blob = await zipResponse.blob()
  return blob.arrayBuffer()
}

/**
 * Downloads a StackBlitz project and returns it as a Blob (browser-friendly)
 *
 * @param options - Configuration options for the download
 * @returns Blob containing the zip file
 */
export async function downloadToBlob(options: Omit<DownloadOptions, 'outputPath'>): Promise<Blob> {
  const zipResponse = await downloadToResponse(options)
  return zipResponse.blob()
}

/**
 * Parse a StackBlitz URL and extract the project ID
 *
 * @param url - Full StackBlitz URL (e.g., https://stackblitz.com/edit/project-id)
 * @returns The project ID
 *
 * @example
 * ```ts
 * import { parseUrl } from 'stackblitz-zip'
 *
 * const projectId = parseUrl('https://stackblitz.com/edit/nuxt-starter-k7spa3r4')
 * // => 'nuxt-starter-k7spa3r4'
 *
 * // Also works with tilde URLs
 * const projectId2 = parseUrl('https://stackblitz.com/~/edit/nuxt-starter-k7spa3r4')
 * // => 'nuxt-starter-k7spa3r4'
 * ```
 */
export function parseUrl(url: string): string {
  const match = url.match(/stackblitz\.com\/(?:~\/)?edit\/([^/?#]+)/)

  if (!match || !match[1]) {
    throw new Error(`Invalid StackBlitz URL: ${url}`)
  }

  return match[1]
}
