# CAPA Engine
This is a proof-of-concept of converting Wikidot source files (.txt) into a static web pages. Repository named after my http://capa.wikidot.com since it is used as base.

## Requirements
* [Node.js](https://nodejs.org/) 18 or newer
* npm (included with Node.js)

## Usage
1. Clone or download the repository. Please be aware that the source files are under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License (CC BY-NC-ND 4.0).
2. Change website URL in `build.js`, line `const SITE_URL = "";` to the address of the future website.
3. Run `npm run build` on the root folder to start building the pages.

## Workflow
1. All pages must be sourced from `contents\` folder.
2. Source file name structure is unchanged from Wikidot backups:
 * `_index.txt` = homepage
 * `category__index.txt` = category index
 * `category_page-name.txt` = individual page
3. If there's a `_template`, e.g. `category__template` (note the double underscore), then pages of that category will be wrapped in the `_template` first. The template is optional.
4. All source will be wrapped by `_layout.html` inside `contents\` folder. Thus the flow is:
 * `category_page-name.txt` wrapped by `category__template` (if present), and finally wrapped by `_layout.html`.
5. Generated HTML in `dist\` will turn categories into folders, e.g. `category_page-name.txt` into `category\page-name\index.html`.
6. `assets\` contains the files that should be **manually structured** like the `dist\`
 * For example: `category_page-name.txt` will be generated into `category\page-name\index.html`, and by default will take assets from `assets\category\page-name\`.
7. Run `npm run build` on the root folder to start building the pages. Pages not found in `contents\` folder will be purged from `\dist`
8. `dist\sitemap.xml` will be generated automatically from the pages found in `contents\`.

## Engine Files
The workflow uses 3 active javascript files + 1 pending deletion:
1. `build.js`, the main file for running the entire conversion engine.
2. `assets\scripts\parser-wikidot.js`, the main parser that handles the syntax listed below.
3. `assets\scripts\parser-custom.js`, the custom parser called by `assets\scripts\parser-wikidot.js`.
4. `assets\scripts\template.js`, a legacy template renderer from an earlier version of the engine.

## Available Syntax
1. General in-line syntax: `**bold**`, `//italic//`, `__underline__`, `--strikethrough--`, `{{monospaced}}`, `^^superscript ^^`, `,,subscript,,`.
2. HTML syntax: `[[div]]`, `[[/div]]`, `[[span]]`. Currently both only accepts `class=""` parameter.
3. Headings from + to ++++
4. Tables, using `|| ||` for table data and and `||~ ||` for Table Heading.
5. Unnumbered and Ordered List, starting line with `*` and `#`.
6. Horizontal Rule / line, `----`
7. Block quote, starting line with `>`
8. Table of Contents `[[toc]]`, customizable via `contents\_toc.html`

## Custom Syntax
1. Link `[[link | caption | class]]`, for example `[[/category | Category Name]]`
2. Image `[[image | caption | class]]`, by default uses the `assets\category\page-name\` structure as mentioned in Workflow #6.

## Customizable Files
1. Page layout is customizable via `contents\_layout.html`.
2. Nav is customizable via `contents\_nav.html`. Currently, there's only one navigation element.
3. Table of Contents / ToC, as mentioned before, is customizable via `contents\_toc.html`
4. Homepage is customizable via `contents\_index.txt`. This follows Wikidot syntax.
5. CSS is customizable via `assets\css\site.css`. This is a regular CSS files.
6. Favicon, by default is stored in `assets\css\favicon.png`.
7. Category templates are customizable via `contents\category__template.txt.` These follow Wikidot syntax and may contain the %%content%% placeholder where the page content is inserted.
8. Website's URL needs to be changed in `build.js`, line `const SITE_URL = "";`

## Additional Files
1. Bootstrap is provided by `assets\css\bootstrap.min.css`, and `assets\scripts\bootstrap.bundle.min.js`. Both are loaded by `contents\_layout.html`.
2. Font Awesome s provided by `assets\css\fontawesome-all.min.css`, and 4 font files under `assets\fonts\fa-....woff2`. The CSS is loaded by `contents\_layout.html`.