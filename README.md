# Sketch to 3D

AI-powered web app that transforms freehand sketches or uploaded images into photorealistic 3D renders using [fal.ai](https://fal.ai).

## Features

- **Drawing Canvas** — Freehand sketch with mouse or touch input
- **Brush Controls** — Adjustable size, multiple colors, eraser tool
- **Image Upload** — Upload PNG/JPG instead of drawing
- **AI 3D Generation** — Converts sketches to photorealistic 3D renders via fal.ai
- **Custom Prompts** — Guide the style (e.g. "Pixar 3D character", "sci-fi metal")
- **Side-by-Side Comparison** — View original sketch next to the 3D result
- **Download** — Save generated images locally
- **Dark UI** — Dark theme with green accents

## Tech Stack

- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **@fal-ai/client**
- **Vercel** (deployment)

## Getting Started

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd sketch-to-3d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and add your fal.ai API key:

```bash
cp .env.example .env.local
```

Edit `.env.local` and replace `PASTE_YOUR_KEY_HERE` with your actual fal.ai API key.

You can get a key at [fal.ai/dashboard](https://fal.ai/dashboard).

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploying to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. **Add the environment variable** `FAL_KEY` in the Vercel dashboard under **Settings > Environment Variables**
4. Deploy!

> **Important:** The `FAL_KEY` environment variable must be set in the Vercel dashboard. It is not committed to the repository.

## Project Structure

```
src/
├── app/
│   ├── api/generate/route.ts   # Server-side fal.ai proxy
│   ├── globals.css              # Dark theme styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main page with canvas + results
├── components/
│   └── DrawingCanvas.tsx        # Canvas drawing component
```

## License

MIT
