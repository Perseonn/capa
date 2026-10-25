# CAPA Engine
CAPA Engine is a proof-of-concept engine that generates static web pages from Wikidot backup source files (.txt). Repository is named after my https://capa.wikidot.com since it is used as base.

## Result
Visit https://capa.asoh.xyz for the conversion result. It's hosted on Github Pages.

## Requirements
* [Node.js](https://nodejs.org/) 18 or newer
* npm (included with Node.js)
* Basic HTML and CSS knowledge

## Usage
1. Clone or download the repository.
2. Change website URL in `config.js`, line `const SITE_URL = "";` to the address of the future website.
3. Run `npm run build` on the root folder to start building the pages into `/dist` folder.

### Usage Notes on CAPA Source files
* Please be aware that the source text files (`contents/*.txt`) are licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License (CC BY-NC-ND 4.0).
* You may download and use these files for testing. However, redistribution must comply with the license terms. See the License section for details.
* CAPA Engine can be used with your own Wikidot backup files. The licensing restrictions above apply to the included CAPA source content, not automatically to content you supply yourself.

## Documentation
### Engine Workflow
1. All pages must be sourced from `contents/` folder.
2. Source file name structure is unchanged from Wikidot backups (From Wikidot Admin Panel => Security => Backup)
  * Example: `category_page-name.txt` = individual page
  * Example: `category__template.txt` = category template page
  * New Feature: `_index.txt` = homepage
  * New Feature: `category__index.txt` = category landing page (optional)
  * Meta: Source files can have few metas see **Custom Meta** below.
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
The workflow uses 4 active javascript files:
1. `build.js`, the main file for running the entire conversion engine.
2. `config.js`, the configuration files for certain variables.
3. `assets/scripts/parser-wikidot.js`, the main parser that handles the syntax listed below.
4. `assets/scripts/parser-custom.js`, the custom parser called by `assets/scripts/parser-wikidot.js`.

### Available Syntax
1. General in-line syntax: `**bold**`, `//italic//`, `__underline__`, `--strikethrough--`, `{{monospaced}}`, `^^superscript^^`, `,,subscript,,`, `##f0f0f0 | hex-only colors##`.
2. HTML syntax: `[[div]] [[/div]]`, `[[div_]] [[/div]]` (disables `<p>` wrappers), `[[a]] [[/a]]`, `[[span]] [[/span]]`. Currently only accepts `class=""` parameter.
3. Headings from + to ++++
4. Tables, using `|| ||` for table data and and `||~ ||` for Table Heading.
5. Unnumbered and Ordered List, starting line with `*` and `#`.
6. Horizontal Rule / line, `----`
7. Block quote, starting line with `>`
8. Table of Contents `[[toc]]`, customizable via `contents/_toc.html`. Currently H4 above will not show on Table of Contents. You can change in the line .`filter(item => item.level < 4)` to `.filter(item => item.level < 7)` in `parser-wikidot.js` if you want to include H4 and above.
9. ListPages `[[module ListPages]]`, as detailed below
10. Include `[[include category:name]]`, as detailed below
11. Comments, open with `[!--` and close with `--]`

### ListPages Syntax
1. ListPages is available in **1 line only start** using `[[module ListPages parameters=""]]`. Using multiple lines will not work.
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
3. If meta is not found, a default value will be assigned based on `const default_xxx` on `config.js`.

### Include Syntax and Workflow
1. Using `[[include category:page-name]]` will take all the contents of `category:page-name.txt`, strip the `@meta`, and put it on the page that uses the include.
2. Includes can be nested between `[[module ListPages]]` and `[[/module]]`
3. Triple bracket include `[[[include category:page-name]]]` is provided for people who want to use double-bracket functions like `[[span]]` inside the include.

### Custom Syntax
1. Link `[[link /sample | caption | class]]`.
2. Image `[[image sample.png | caption | class]]`, by default uses the `assets/category/page-name/` structure as mentioned in Workflow #6. Image changes behavior when used as block or inline. If you use images at a start of a line, it will be considered block image and if there's caption, will be contained in a `<figure>`. If you use images in a middle of a line, including `[[a]]` it will be considered inline image, and no `<figure>` will be generated if using caption. Despite having a custom implementation, image codes are located in `scripts/parse-wikidot.js`
3. Youtube `[[youtube id]]`, customizable via `contents/_youtube.html`
4. Anchor Target `[[#go-to-here]]` that generates empty `<span id="go-to-here"></span>` that can be followed to using `[[a href="#go-to-here"]][[/a]]`, to reduce dependency to the ToC.
5. Icon `[[i | class]]` that generates `<i class="class"></i>`. Use with CSS `i{font-style: normal;}` to prevent italics.


### Custom Meta
Source files can have custom metas. If no metas are assigned, default meta will be given from `config.js`. See **Customizable Files #9** below.
* `@title: Page Title`: Page Title. Will also be used as HTM meta `<title>` and its related entries
* `@author: Page Author`: Page Author.
* `@updated: 2026-01-01`: Update date.
* `@wip`: Sources with `@wip` will be rendered, but not included in ListPages.
* `@description: something`: Overrides HTML meta `<meta name="description">` and its related entries. If not used, it will take first 100 characters from the page after meta.

### Customizable Files
1. Page layout is customizable via `contents/_layout.html`.
2. Nav is customizable via `contents/_nav.html`. Currently, there's only one navigation element.
3. Table of Contents / ToC, as mentioned before, is customizable via `contents/_toc.html`
4. Homepage is customizable via `contents/_index.txt`. This follows Wikidot syntax.
5. CSS is customizable via `assets/css/site.css`. This is a regular CSS files.
6. Favicon, by default is stored in `assets/css/favicon.png`.
7. Category templates are customizable via `contents/category__template.txt.` These follow Wikidot syntax and may contain the `%%content%%` placeholder where the page content is inserted. Other usable variable is `%%created_by%%` and `%%updated_at%%`.
8. Website's URL needs to be changed in `config.js`, line `const SITE_URL = "";`
9. Default meta can be changed in `config.js`, line `const default_title = "";`, `const default_author = "";`, `const default_updated = "";`

### Additional Files
These files are independent of the CAPA engine and not required outside the CAPA website itself.
1. Bootstrap is provided by `assets/css/bootstrap.min.css`, and `assets/scripts/bootstrap.bundle.min.js`. Both are loaded by `contents/_layout.html`.
2. Font Awesome is provided by `assets/css/fontawesome-all.min.css`, and 4 font files under `assets/webfonts/fa-....woff2`. The CSS is loaded by `contents/_layout.html`.
3. CAPA's custom move ToC to Nav is provided by `assets/scripts/capa-move-toc-to-nav.js`. Loaded by `contents/_layout.html`.
4. CAPA's custom drawer navigation is provided by `assets/scripts/capa-nav-drawer.js`. Loaded by `contents/_layout.html`.
5. CAPA's custom controller CSS is provided by `assets/css/capa-controller.css`, and 2 font files under `assets/webfonts/capa-controller-ps4.otf` and `assets/webfonts/capa-controller.ttf`
6. `dist\google....html` is CAPA's Google Search Console files. Please remove it if you are using your own Google Search method.

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

## Default Syntax for Linking Image
```
[[a href="/{$link}"]][[image /{$image} | | {$image-class}]][[/a]]
```