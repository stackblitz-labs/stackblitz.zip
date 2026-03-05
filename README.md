# stackblitz-zip

> Download [StackBlitz](https://stackblitz.com/) projects programmatically

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

## ❓ Why?

While [StackBlitz](https://stackblitz.com/) provides an API to fetch project data, there's no built-in way to download projects as zip files programmatically. This tool makes it easy to download reproductions for issues quickly.

> [!IMPORTANT]
> This project is not affiliated with or endorsed by StackBlitz in any way. Users are responsible for ensuring their use of this tool complies with [StackBlitz's Terms of Service](https://stackblitz.com/terms-of-service). Please review their terms before using this tool.

## 🌐 stackblitz.zip

The easiest way to download a StackBlitz project is at **[stackblitz.zip](https://stackblitz.zip)**

Simply replace `stackblitz.com` with `stackblitz.zip` in any StackBlitz edit URL:

```
Original:  https://stackblitz.com/edit/nuxt-starter-k7spa3r4
Download:  https://stackblitz.zip/edit/nuxt-starter-k7spa3r4
```

### Features

- 🔓 No authentication or API keys required!
- ⚗️ Built on [Nitro](https://nitro.build/)
- ▲ Deployed on [Vercel](http://vercel.com)

👉 [see source](https://github.com/stackblitz-labs/stackblitz.zip/tree/main/app/)

## CLI

```bash
# download a project as a zip file
npx stackblitz-zip https://stackblitz.com/edit/nuxt-starter-k7spa3r4

# specify output path for zip
npx stackblitz-zip https://stackblitz.com/edit/nuxt-starter-k7spa3r4 my-project.zip

# clone project to a directory
npx stackblitz-clone https://stackblitz.com/edit/nuxt-starter-k7spa3r4

# clone to a specific directory
npx stackblitz-clone https://stackblitz.com/edit/nuxt-starter-k7spa3r4 ./my-project
```

## Programmatic Usage

Install the package:

```bash
npm install stackblitz-zip
```

### Node.js

```typescript
import { cloneProject, downloadToFile, parseUrl } from 'stackblitz-zip'

// download from a URL as a zip file
const projectId = parseUrl('https://stackblitz.com/edit/nuxt-starter-k7spa3r4')
await downloadToFile({ projectId, outputPath: './output.zip' })

// download by project ID
await downloadToFile({
  projectId: 'nuxt-starter-k7spa3r4',
  outputPath: './my-project.zip',
})

// clone project to a directory
await cloneProject({
  projectId: 'nuxt-starter-k7spa3r4',
  outputPath: './my-project',
})
```

### Web APIs

```typescript
import { downloadToBlob, downloadToResponse, parseUrl } from 'stackblitz-zip'

// download as Web Response (edge runtimes, servers)
const projectId = parseUrl('https://stackblitz.com/edit/nuxt-starter-k7spa3r4')
const response = await downloadToResponse({ projectId })
// response can be returned directly from edge functions

// or download as Blob (browser-friendly)
const blob = await downloadToBlob({ projectId })

// trigger browser download
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `${projectId}.zip`
a.click()
URL.revokeObjectURL(url)
```

> [!NOTE]
> Direct browser usage may be blocked by CORS when fetching from stackblitz.com.

## Features

- **Universal** - works in Node.js, browsers, and edge runtimes
- Built with [tsdown](https://tsdown.dev) and [client-zip](https://github.com/Touffy/client-zip)
- [Nitro](https://nitro.build) web service at [stackblitz.zip](https://stackblitz.zip)
- Fetches project data directly from StackBlitz API
- Zip slip protection and security validations
- Configurable size limits and timeouts
- Web API streaming (Response/ArrayBuffer/Blob)

> [!NOTE]
> The APIs use Web standards (fetch, ArrayBuffer, Blob) but direct fetching from stackblitz.com may be blocked by CORS.

## Security

- ✅ Zip slip protection - file paths are sanitized to prevent directory traversal
- ✅ Size limits - configurable limits on file size (10MB) and total size (100MB)
- ✅ Request timeout - prevents hanging requests (30s default)
- ✅ Project ID validation - only alphanumeric, hyphens, and underscores
- ✅ Memory efficient - streaming support with no temporary files

## Self-Hosting

Self-host the web service using the included [Nitro](https://nitro.build) app:

```bash
cd app
pnpm install
pnpm build
pnpm preview
```

Deploy to any platform using [Nitro's deployment presets](https://nitro.build/deploy) - supports Vercel, Netlify, Cloudflare Pages, AWS, Azure, Node.js, and many more.

## API

### `downloadToFile(options: DownloadOptions): Promise<string>`

Downloads a StackBlitz project and returns the path to the created zip file.

**Options:**
- `projectId` (string, required): The StackBlitz project ID
- `outputPath` (string, optional): Path where the zip file should be saved. Defaults to `<project-id>.zip`
- `timeout` (number, optional): Timeout in milliseconds for loading the project. Defaults to `30000` (30 seconds)
- `maxFileSize` (number, optional): Maximum size per file in bytes. Defaults to `10485760` (10MB)
- `maxTotalSize` (number, optional): Maximum total project size in bytes. Defaults to `104857600` (100MB)
- `verbose` (boolean, optional): Enable console logging. Defaults to `false`

### `cloneProject(options: CloneOptions): Promise<string>`

Clones a StackBlitz project by creating all files in a target directory.

**Options:**
- `projectId` (string, required): The StackBlitz project ID
- `outputPath` (string, optional): Path where the project directory should be created. Defaults to `<project-id>/`
- `timeout` (number, optional): Timeout in milliseconds for loading the project. Defaults to `30000` (30 seconds)
- `maxFileSize` (number, optional): Maximum size per file in bytes. Defaults to `10485760` (10MB)
- `maxTotalSize` (number, optional): Maximum total project size in bytes. Defaults to `104857600` (100MB)
- `verbose` (boolean, optional): Enable console logging. Defaults to `false`

**Returns:** Path to the created directory

### `downloadToResponse(options): Promise<Response>`

Downloads a StackBlitz project and returns it as a Web Response (universal).

**Options:** Same as `downloadToFile` except `outputPath`

**Returns:** A Response object containing the zip file stream

### `downloadToBuffer(options): Promise<ArrayBuffer>`

Downloads a StackBlitz project and returns it as an ArrayBuffer (universal).

**Options:** Same as `downloadToFile` except `outputPath`

### `downloadToBlob(options): Promise<Blob>`

Downloads a StackBlitz project and returns it as a Blob (browser-friendly).

**Options:** Same as `downloadToFile` except `outputPath`

### `parseUrl(url: string): string`

Parse a StackBlitz URL and extract the project ID.

**Parameters:**
- `url` (string, required): Full StackBlitz project URL (e.g., `https://stackblitz.com/edit/project-id`)

**Returns:** The project ID

## Development

```bash
# clone this repository
git clone https://github.com/stackblitz-labs/stackblitz.zip

# install dependencies
corepack enable
pnpm install

# run interactive tests
pnpm dev

# build for production
pnpm build
```

## License

Made with ❤️

Published under [MIT License](./LICENCE).

<!-- Badges -->

[npm-version-src]: https://npmx.dev/api/registry/badge/version/stackblitz-zip
[npm-version-href]: https://npmx.dev/package/stackblitz-zip
[npm-downloads-src]: https://npmx.dev/api/registry/badge/downloads/stackblitz-zip
[npm-downloads-href]: https://npm.chart.dev/stackblitz-zip
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stackblitz-labs/stackblitz.zip/ci.yml?branch=main&style=flat-square
[github-actions-href]: https://github.com/stackblitz-labs/stackblitz.zip/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/stackblitz-labs/stackblitz.zip/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stackblitz-labs/stackblitz.zip
