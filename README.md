# Corrective and Preventive Action / CAPA
This is a proof-of-concept of converting Wikidot source files (.txt) into a static web pages. Repository is called CAPA because it uses my http://capa.wikidot.com as base.

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
5. Category templates are customizable via `contents\category__template.txt.` These follow Wikidot syntax and may contain the %%content%% placeholder where the page content is inserted.