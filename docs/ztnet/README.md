# Website

This website is built using [Docusaurus 2](https://docusaurus.io/), a modern static website generator.

### Installation

```
npm install
```

### Local Development

```
npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.


# API docs
Api is built on OpenAPI and the source needs to be built before it can be used by the website.

### Build
```
npx docusaurus gen-api-docs all
```

### Clean
```
npx docusaurus clean-api-docs all
```

### Combined
```
npx docusaurus clean-api-docs all && npx docusaurus gen-api-docs all
```