# CAPA Engine
CAPA Engine is a proof-of-concept engine that generates static web pages from Wikidot backup source files (.txt). Repository is named after my http://capa.wikidot.com since it is used as base.

## Requirements
* [Node.js](https://nodejs.org/) 18 or newer
* npm (included with Node.js)
* Basic HTML and CSS knowledge

## Usage
1. Clone or download the repository.
  * Please be aware that the source text files (`contents/*.txt`) are under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License (CC BY-NC-ND 4.0).
  * Downloading and using them for testing is allowed, but publishing is not allowed. See License for details.
2. Change website URL in `build.js`, line `const SITE_URL = "";` to the address of the future website.
3. Run `npm run build` on the root folder to start building the pages.

## Documentation
### Engine Workflow
1. All pages must be sourced from `contents/` folder.
2. Source file name structure is unchanged from Wikidot backups (From Wikidot Admin Panel => Security => Backup)
  * Example: `category_page-name.txt` = individual page
  * Example: `category__template.txt` = category template page
  * New Feature: `_index.txt` = homepage
  * New Feature: `category__index.txt` = category landing page (optional)
  * Meta: Source files can have the following metas `@title: Page Title`, `@author: Page Author`, `@updated: 2026-01-01`. If no metas are assigned, default meta will be given from `build.js`. See **Customizable Files #9** below.
3. If there's a `_template`, e.g. `category__template.txt` (note the double underscore), then pages of that category will be wrapped in the `_template` first. The template is optional.
4. All source will be wrapped by `_layout.html` inside `contents/` folder. Thus the flow is:
  * `category_page-name.txt` wrapped by `category__template.txt` (if present), and finally wrapped by `_layout.html`.
5. Generated HTML in `dist/` will turn categories into folders, e.g. `category_page-name.txt` into `category/page-name/index.html`.
6. `assets/` contains the files that should be **manually structured** like the `dist/`
  * For example: `category_page-name.txt` will be generated into `category/page-name/index.html`, and by default will take assets from `assets/category/page-name/`.
7. Run `npm run build` on the root folder to start building the pages. Pages not found in `contents/` folder will be purged from `/dist`.
8. `dist/sitemap.xml` will be generated automatically from the pages found in `contents/`.
9. `dist/_listPage.json`  will be generated automatically and will be used as a reference for ListPages.

### Engine Files
The workflow uses 3 active javascript files + 1 pending deletion:
1. `build.js`, the main file for running the entire conversion engine.
2. `assets/scripts/parser-wikidot.js`, the main parser that handles the syntax listed below.
3. `assets/scripts/parser-custom.js`, the custom parser called by `assets/scripts/parser-wikidot.js`.
4. `assets/scripts/template.js`, a legacy template renderer from an earlier version of the engine.

### Available Syntax
1. General in-line syntax: `**bold**`, `//italic//`, `__underline__`, `--strikethrough--`, `{{monospaced}}`, `^^superscript ^^`, `,,subscript,,`.
2. HTML syntax: `[[div]]`, `[[/div]]`, `[[span]]`. Currently both only accepts `class=""` parameter.
3. Headings from + to ++++
4. Tables, using `|| ||` for table data and and `||~ ||` for Table Heading.
5. Unnumbered and Ordered List, starting line with `*` and `#`.
6. Horizontal Rule / line, `----`
7. Block quote, starting line with `>`
8. Table of Contents `[[toc]]`, customizable via `contents/_toc.html`
9. ListPages `[[module ListPages]]`, as detailed below
10. Include `[[include category:name]]`, as detailed below

### ListPages Syntax
1. ListPages is available in **1 line only start** using `[[module ListPages parameters=""]]`
2. ListPages is closed using `[[/module]]`
3. Anything between the lines are treated like template for the ListPages.
4. Available commands example:
  * `category=""`: Filter by category. Using double `""` will use all categories
  * `order="title"`: Sort result by alphabetical, ascending
  * `order="title desc"`: Sort result by Alphabetical descending
  * `order="updated_at desc"`: Sort result by most recently updated first
  * `order="updated_at asc"`: Sort result by oldest update first
  * `limit="10"`: Return at most 10 results

#### ListPages Example
```
[[module ListPages category="example" limit="10"]]
++ %%title%%
[[/module]]
```
#### ListPages Workflow
1. On generating the pages, `dist/_listPage.json` is created and used as a reference for ListPages.
2. Page category and slug is based on its file name, while update and title is based on the `@updated:` and `@title:`
3. If meta is not found, a default value will be assigned based on const `default_xxx` on the top of `build.js`.

### Include Syntax and Workflow
1. Using `[[include category:page-name]]` will take all the contents of `category:page-name.txt`, strip the `@meta`, and put it on the page that uses the include.
2. Includes can be nested between `[[module ListPages]]` and `[[/module]]`

### Custom Syntax
1. Link `[[link /sample | caption | class]]`.
2. Image `[[image sample.png | caption | class]]`, by default uses the `assets/category/page-name/` structure as mentioned in Workflow #6.
3. Youtube `[[youtube id]]`, customizable via `contents/_youtube.html`

### Customizable Files
1. Page layout is customizable via `contents/_layout.html`.
2. Nav is customizable via `contents/_nav.html`. Currently, there's only one navigation element.
3. Table of Contents / ToC, as mentioned before, is customizable via `contents/_toc.html`
4. Homepage is customizable via `contents/_index.txt`. This follows Wikidot syntax.
5. CSS is customizable via `assets/css/site.css`. This is a regular CSS files.
6. Favicon, by default is stored in `assets/css/favicon.png`.
7. Category templates are customizable via `contents/category__template.txt.` These follow Wikidot syntax and may contain the `%%content%%` placeholder where the page content is inserted. Other usable variable is `%%created_by_linked%%` (displays author name, but will not link, sadly) and `%%created_at%%`.
8. Website's URL needs to be changed in `build.js`, line `const SITE_URL = "";`
9. Default meta can be changed in `build.js`, line `const default_title = "";`, `const default_author = "";`, `const default_updated = "";`

### Additional Scripts and CSS Files
These files are independent of the CAPA engine and not required outside the CAPA website itself.
1. Bootstrap is provided by `assets/css/bootstrap.min.css`, and `assets/scripts/bootstrap.bundle.min.js`. Both are loaded by `contents/_layout.html`.
2. Font Awesome is provided by `assets/css/fontawesome-all.min.css`, and 4 font files under `assets/webfonts/fa-....woff2`. The CSS is loaded by `contents/_layout.html`.
3. CAPA's custom move ToC to Nav is provided by `assets/scripts/capa-move-toc-to-nav.js`. Loaded by `contents/_layout.html`.
4. CAPA's custom drawer navigation is provided by `assets/scripts/capa-nav-drawer.js`. Loaded by `contents/_layout.html`.
5. CAPA's custom controller CSS is provided by `assets/css/capa-controller.css`, and 2 font files under `assets/webfonts/capa-controller-ps4.otf` and `assets/webfonts/capa-controller.ttf`

## Default HTML for _layout.html
The following is the base HTML for `<body>` on `_layout.html`
```
<body>
  <header>
      {{NAV}}
  </header>
  <main>
      {{BODY}}
  </main>
  <footer>
  </footer>
</body>
```

## Default HTML for _nav.html
The following is the base HTML for `<nav>` on `_nav.html`
```
<nav>
</nav>
```