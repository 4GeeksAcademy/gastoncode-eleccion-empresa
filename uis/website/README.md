# Brasaland public website

Public-facing Brasaland website built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and the App Router.

## Run locally

From the repository root:

```bash
npm install
npm run dev:website
```

The website is served at <http://localhost:3006>. To build, lint, or start the production build:

```bash
npm run build -w brasaland-website
npm run lint -w brasaland-website
npm run start -w brasaland-website
```

## Routes

- `/` — home page with the company introduction, benefits, and contact section.
- `/application` — interest form.

The form validates fields in the browser and displays the same local confirmation as the former static prototype. It does not persist or transmit submissions.
