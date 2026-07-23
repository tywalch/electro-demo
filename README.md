# electrodb-demo

Source for the [ElectroDB](https://github.com/tywalch/electrodb) in-browser playground: https://electrodb.fun

## Architecture

The playground is a React + TypeScript app built with Vite:

- **Editor** — Monaco with full TypeScript language support. Multiple files are supported; each file is its own Monaco model so imports between files are type-checked. The first file (marked ▶) is the program entry point; other files execute when imported.
- **Runtime** — editor files are compiled to CommonJS by the TypeScript worker and executed in-browser against a mocked ElectroDB client (`public/vendor/electrodb-playground.js`, built from the `playground/` directory of the electrodb repo). Generated DynamoDB parameters are captured and rendered in the output pane.
- **Sharing** — the editor state is encoded into the URL hash. Single-file playgrounds use the TypeScript-playground-compatible `#code/<lz-string>` format (existing shared links keep working); multi-file playgrounds use `#files/<lz-string>` containing `{ v: 1, files: [{ name, content }] }`.

## Development

```bash
npm install
npm run dev        # start the Vite dev server
npm run build      # production build to dist/
npm run typecheck  # tsc --noEmit
```

## Upgrading the ElectroDB bundle

`./upgrade.sh` rebuilds the browser bundle from a sibling checkout of the electrodb repo and vendors it (plus the current `index.d.ts` used for editor typings) into this project.
