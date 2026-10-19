/* =============== =============== =============== ===============
 * The Great Wikidot Parser
 * =============== =============== =============== ===============
 */
import path from "path";
import fs from "fs";
import { customInlineParsers } from "./parser-custom.js";

export function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}


const wikidotInlineParsers = [
    /*
     * Span [[span]]text[[/span]] [[span class="foo"]]text[[/span]]
     */
    {
        name: "span",
        regex: /^\[\[span(?:\s+class="([^"]+)")?\]\]([\s\S]*?)\[\[\/span\]\]/,

        render: (match, { parseInline, escapeHtml }) => {
            const className = match[1];
            const content = match[2];
            const classAttribute = className
                ? ` class="${escapeHtml(className)}"`
                : "";
            return `<span${classAttribute}>${parseInline(content)}</span>`;
        }
    },

    /*
     * Bold **text**
     */
    {
        name: "bold",
        regex: /^\*\*([\s\S]*?)\*\*/,

        render: (match, { parseInline }) => {
            const content = match[1];
            return `<strong>${parseInline(content)}</strong>`;
        }
    },

    /*
     * Italic //text//
     */
    {
        name: "italic",
        regex: /^\/\/([\s\S]*?)\/\//,

        render: (match, { parseInline }) => {
            const content = match[1];
            return `<em>${parseInline(content)}</em>`;
        }
    },

    /*
     * Underline __text__
     */
    {
        name: "underline",
        regex: /^__([\s\S]*?)__/,

        render: (match, { parseInline }) => {
            return `<u>${parseInline(match[1])}</u>`;
        }
    },

    /*
     * Strikethrough --text--
     */
    {
        name: "strikethrough",
        regex: /^--([\s\S]*?)--/,

        render: (match, { parseInline }) => {
            return `<del>${parseInline(match[1])}</del>`;
        }
    },

    /*
     * Monospaced {{text}}
     */
    {
        name: "monospace",
        regex: /^\{\{([\s\S]*?)\}\}/,

        render: (match) => {
            return `<code>${escapeHtml(match[1])}</code>`;
        }
    },

    /*
     * Superscript ^^text^^
     */
    {
        name: "superscript",
        regex: /^\^\^([\s\S]*?)\^\^/,

        render: (match, { parseInline }) => {
            return `<sup>${parseInline(match[1])}</sup>`;
        }
    },

    /*
     * Subscript ,,text,,
     */
    {
        name: "subscript",
        regex: /^,,([\s\S]*?),,/,

        render: (match, { parseInline }) => {
            return `<sub>${parseInline(match[1])}</sub>`;
        }
    }
];


export function parseInline(text) {
    let result = "";
    let remaining = text;

    while (remaining.length > 0) {
        let matched = false;

        /*
         * ----------------------------------------------------
         * Wikidot inline syntax
         * ----------------------------------------------------
         */

        for (const parser of wikidotInlineParsers) {
            const match = remaining.match(parser.regex);

            if (!match) {
                continue;
            }

            result += parser.render(
                match,
                {
                    parseInline,
                    escapeHtml
                }
            );

            remaining = remaining.slice(match[0].length);

            matched = true;
            break;
        }

        if (matched) {
            continue;
        }


        /*
         * ----------------------------------------------------
         * Custom inline syntax
         * ----------------------------------------------------
         */

        for (const parser of customInlineParsers) {
            const match = remaining.match(parser.regex);

            if (!match) {
                continue;
            }

            result += parser.render(
                match, 
                {
                    parseInline,
                    escapeHtml
                }
            );

            remaining = remaining.slice(match[0].length);

            matched = true;
            break;
        }

        if (matched) {
            continue;
        }


        /*
         * ----------------------------------------------------
         * Plain text
         * ----------------------------------------------------
         *
         * Consume one character.
         *
         * This guarantees that syntax appearing later in the
         * string can still be detected.
         */

        result += escapeHtml(remaining[0]);
        remaining = remaining.slice(1);
    }

    return result;
}



/* 
 * =============== =============== =============== ===============
 * Headings: H1 to H4
 * =============== =============== =============== ===============
 */

let headingIdCounter = 0;

function createHeadingId() {
    headingIdCounter++;
    return `heading-${headingIdCounter}`;
}

function parseHeading(line, customInlineParsers) {
    const match = line.match(/^(\++)\s+(.+)$/);

    if (!match) {
        return null;
    }

    const level = match[1].length;
    const rawText = match[2];
    const text = parseInline(match[2], customInlineParsers);
    const id = createHeadingId();

    return {
        html: `<h${level} id="${id}">${text}</h${level}>`,
        level,
        id,
        text: rawText
    };
}


/* 
 * =============== =============== =============== ===============
 * Tables
 * =============== =============== =============== ===============
 */

function isTableLine(line) {
    return line.trim().startsWith("||") &&
           line.trim().endsWith("||");
}


function parseTable(lines, startIndex, customInlineParsers) {
    const rows = [];
    let index = startIndex;

    while (index < lines.length && isTableLine(lines[index])) {
        const line = lines[index].trim();

        const inner = line.slice(2, -2);
        const cells = inner.split("||");

        rows.push(
            cells.map(cell => {
                const trimmed = cell.trim();

                const isHeader = trimmed.startsWith("~");
                const content = isHeader
                    ? trimmed.slice(1).trim()
                    : trimmed;

                return {
                    isHeader,
                    content: parseInline(content, customInlineParsers)
                };
            })
        );

        index++;
    }

    let html = "<table>\n";

    for (const row of rows) {
        html += "    <tr>\n";

        for (const cell of row) {
            const tag = cell.isHeader ? "th" : "td";

            html += `        <${tag}>${cell.content}</${tag}>\n`;
        }

        html += "    </tr>\n";
    }

    html += "</table>";

    return {
        html,
        nextIndex: index
    };
}


/* 
 * =============== =============== =============== ===============
 * Lists
 * =============== =============== =============== ===============
 */

function parseList(lines, startIndex, customInlineParsers) {
    const root = [];
    const stack = [];

    let index = startIndex;

    while (index < lines.length) {
        const line = lines[index];

        const match = line.match(/^(\s*)([*#])\s+(.+)$/);

        if (!match) {
            break;
        }

        const indent = match[1].length;
        const type = match[2];
        const content = match[3];
        
        const item = {
            indent,
            type,
            content,
            children: []
        };

        while (
            stack.length > 0 &&
            indent <= stack[stack.length - 1].indent
        ) {
            stack.pop();
        }

        if (stack.length === 0) {
            root.push(item);
        } else {
            stack[stack.length - 1].children.push(item);
        }

        stack.push(item);

        index++;
    }

    function renderItems(items) {
        const tag = items[0].type === "#"
            ? "ol"
            : "ul";

        let html = `<${tag}>\n`;

        for (const item of items) {
            html += `    <li>${parseInline(item.content, customInlineParsers)}`;

            if (item.children.length > 0) {
                html += "\n";
                html += renderItems(item.children);
                html += "    ";
            }

            html += "</li>\n";
        }

        html += `</${tag}>\n`;

        return html;
    }

    return {
        html: renderItems(root),
        nextIndex: index
    };
}


/* 
 * =============== =============== =============== ===============
 * Images [[image | title | class]]
 * =============== =============== =============== ===============
 */

function parseImage(line, sourceName) {
    const match = line.match(
        /^\[\[image\s+(.+?)\]\]$/
    );

    if (!match) {
        return null;
    }

    const parts = match[1]
        .split("|")
        .map(part => part.trim());

    const filename = parts[0];
    const title = parts[1] ?? "";
    const className = parts[2] ?? "";
    const [category, slug] = sourceName.split("_", 2);

    let src;

    if (/^https?:\/\//i.test(filename)) {
        // External image URL
        src = filename;
    } else if (filename.startsWith("/")) {
        // Root-relative to the assets directory
        src = `/assets${filename}`;
    } else {
        // Relative to the current page's asset directory
        src = `/assets/${category}/${slug}/${filename}`;
    }

    const classAttribute = className
        ? `${escapeHtml(className)}`
        : "";

    const alt = title || filename.split("/").pop();
    const img = `<img class="img-fluid ${classAttribute}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`;

    if (!title) {
        return img;
    }

    return `<figure class="img-container">
        ${img}
        <figcaption>${escapeHtml(title)}</figcaption>
    </figure>`;
}

/*
 * =============== =============== =============== ===============
 * YouTube [[youtube id]]
 * =============== =============== =============== ===============
 */
function parseYoutube(line) {
    const match = line.trim().match(
        /^\[\[youtube\s+([A-Za-z0-9_-]+)\]\]$/
    );

    if (!match) {
        return null;
    }

    const videoId = match[1];
    const templatePath = "./contents/_youtube.html";

    if (!fs.existsSync(templatePath)) {
        throw new Error(
            `YouTube template not found: ${templatePath}`
        );
    }

    const template = fs.readFileSync(
        templatePath,
        "utf8"
    );

    return template.replaceAll(
        "{{YOUTUBE_ID}}",
        escapeHtml(videoId)
    );
}

/* 
 * =============== =============== =============== ===============
 * Parse Div [[div]] [[/div]]
 * =============== =============== =============== ===============
 */
function parseDivStart(line) {
    const match = line.trim().match(
        /^\[\[div(?:\s+class="([^"]*)")?(?:\s+style="([^"]*)")?\]\]$/
    );

    if (!match) {
        return null;
    }

    const className = match[1] ?? "";
    const style = match[2] ?? "";

    const classAttribute = className
        ? ` class="${escapeHtml(className)}"`
        : "";

    const styleAttribute = match[2] !== undefined
        ? ` style="${escapeHtml(style)}"`
        : "";

    return `<div${classAttribute}${styleAttribute}>`;
}

function parseDivEnd(line) {
    if (line.trim() !== "[[/div]]") {
        return null;
    }

    return "</div>";
}


/* 
 * =============== =============== =============== ===============
 * Horizontal Rule ----
 * =============== =============== =============== ===============
 */

function parseHorizontalRule(line) {
    if (!/^----\s*$/.test(line)) {
        return null;
    }

    return "<hr>";
}

/* 
 * =============== =============== =============== ===============
 * Blockquote >
 * =============== =============== =============== ===============
 */

function parseBlockquote(lines, startIndex) {
    const content = [];
    let index = startIndex;

    while (index < lines.length) {
        const match = lines[index].match(/^>\s?(.*)$/);

        if (!match) {
            break;
        }

        content.push(match[1]);
        index++;
    }

    return {
        html: `<blockquote>\n${content
            .map(line => `    <p>${parseInline(line)}</p>`)
            .join("\n")}\n</blockquote>`,
        nextIndex: index
    };
}

/* 
 * =============== =============== =============== ===============
 * Table of Contents [[toc]]
 * =============== =============== =============== ===============
 */

export function renderToc(toc) {
    const tocPath = "./contents/_toc.html";

    const template = fs.readFileSync(
        tocPath,
        "utf8"
    );

    const links = toc.map(item =>
        `<a href="#${item.id}" class="toc-h${item.level}">${escapeHtml(item.text)}</a>`
    ).join("\n");

    return template.replaceAll(
        "{{TOC}}",
        links
    );
}


/*
 * ============================================================
 * ListPages Module
 * ============================================================
 */

function parseListPagesAttributes(line) {
    const match = line.match(
        /^\[\[module\s+ListPages\b([\s\S]*?)\]\]\s*$/i
    );

    if (!match) {
        return null;
    }

    const attributes = {};

    for (const attribute of match[1].matchAll(
        /([a-zA-Z_]\w*)="([^"]*)"/g
    )) {
        attributes[attribute[1].toLowerCase()] = attribute[2];
    }

    return attributes;
}

function renderListPages(attributes, body, sourceName) {
    const inventoryPath = "./dist/_listPage.json";

    if (!fs.existsSync(inventoryPath)) {
        throw new Error(
            `ListPages inventory not found: ${inventoryPath}`
        );
    }

    let pages = JSON.parse(
        fs.readFileSync(inventoryPath, "utf8")
    );

    // Category filter. An empty category matches all categories.
    if (attributes.category) {
        pages = pages.filter(
            page => page.category === attributes.category
        );
    }

    // WIP pages are excluded by default.
    pages = pages.filter(page => page.wip !== true);

    // Sorting.
    const order = (attributes.order || "updated_at desc")
        .trim()
        .toLowerCase();

    const descending = order.endsWith(" desc");
    const sortField = order
        .replace(/\s+(asc|desc)$/, "")
        .trim();

    if (sortField === "title" || sortField === "updated_at") {
        pages.sort((a, b) => {
            const aValue = sortField === "title"
                ? (a.title || "").toLowerCase()
                : (a.updated || "");

            const bValue = sortField === "title"
                ? (b.title || "").toLowerCase()
                : (b.updated || "");

            const comparison = aValue.localeCompare(bValue);

            return descending ? -comparison : comparison;
        });
    }

    // Limit is applied after filtering and sorting.
    const total = pages.length;
    const limit = Number.parseInt(attributes.limit, 10);

    if (Number.isFinite(limit) && limit > 0) {
        pages = pages.slice(0, limit);
    }

    return pages.map((page, index) => {
        const fullname = page.category
            ? `${page.category}/${page.slug}`
            : page.slug;

        const title = page.title || page.slug;
        const link = page.url || "/";

        const variables = {
            "title": title,
            "title_linked": `[[link ${fullname} | ${title}]]`,
            "name": page.slug,
            "category": page.category,
            "fullname": fullname,
            "link": link,
            "created_by": page.author || "",
            "updated_at": page.updated || "",
            "index": String(index + 1),
            "total": String(total),
            "limit": attributes.limit || ""
        };

        let expanded = body;

        for (const [key, value] of Object.entries(variables)) {
            expanded = expanded.replaceAll(
                `%%${key}%%`,
                String(value ?? "")
            );
        }

        return parseWikidot(
            expanded,
            page.sourceName || sourceName
        ).html;
    }).join("\n");
}

/*
 * ============================================================
 * Include Module
* [[include component:list-page-item | title=Example]]
 * resolves to:
 * contents/component_list-page-item.txt
 * ============================================================
 */

function stripIncludeMetadata(source) {
    const lines = source.split(/\r?\n/);
    let index = 0;

    while (index < lines.length) {
        const line = lines[index].trim();

        if (!line.startsWith("@")) {
            break;
        }

        // Match the same leading metadata syntax as build.js.
        const match = line.match(/^@(\w+):\s*(.*)$/);

        if (!match) {
            break;
        }

        // Metadata lines are discarded, whether the field is known or not.
        index++;
    }

    return lines.slice(index).join("\n");
}

function parseIncludeParameters(includeContent) {
    const sections = includeContent.split("|");
    const pageSpec = sections.shift().trim();

    // The target is the first word in the initial section.
    const [target, ...inlineParameters] = pageSpec.split(/\s+/);

    const parameters = {};

    function addParameter(parameterText) {
        const equalsIndex = parameterText.indexOf("=");

        if (equalsIndex === -1) {
            return;
        }

        const name = parameterText.slice(0, equalsIndex).trim();
        const value = parameterText.slice(equalsIndex + 1).trim();

        if (name) {
            parameters[name] = value;
        }
    }

    // Also accept parameters written beside the target.
    for (const parameter of inlineParameters) {
        addParameter(parameter);
    }

    // Wikidot-style pipe-separated parameters, including multiline ones.
    for (const section of sections) {
        addParameter(section);
    }

    return { target, parameters };
}

function resolveIncludePath(target) {
    // category:slug becomes category_slug.txt.
    // A category-less target remains page-name.txt.
    const sourceName = target.includes(":")
        ? target.replaceAll(":", "_")
        : target;

    if (
        !sourceName ||
        sourceName.includes("..") ||
        path.isAbsolute(sourceName) ||
        sourceName.includes("/") ||
        sourceName.includes("\\")
    ) {
        throw new Error(`Invalid include target: ${target}`);
    }

    const contentsDirectory = path.resolve("contents");
    const includePath = path.resolve(
        contentsDirectory,
        `${sourceName}.txt`
    );

    if (!includePath.startsWith(contentsDirectory + path.sep)) {
        throw new Error(`Invalid include path: ${target}`);
    }

    return { sourceName, includePath };
}

function expandIncludes(source, includeStack = []) {
    const includePattern =
        /(^|\n)([ \t]*)(\[\[include\b[\s\S]*?\]\])[ \t]*(?=\n|$)/gi;

    return source.replace(
        includePattern,
        (wholeMatch, lineBreak, indentation, includeTag) => {
            // Like Wikidot, a leading space prevents include processing.
            if (indentation.length > 0) {
                return wholeMatch;
            }

            const includeContent = includeTag
                .slice("[[include".length, -2)
                .trim();

            const { target, parameters } =
                parseIncludeParameters(includeContent);

            if (!target) {
                throw new Error("Include tag is missing its target");
            }

            const { sourceName, includePath } =
                resolveIncludePath(target);

            if (includeStack.includes(sourceName)) {
                const chain = [...includeStack, sourceName].join(" -> ");

                throw new Error(`Include cycle detected: ${chain}`);
            }

            if (!fs.existsSync(includePath)) {
                console.warn(
                    `[Wikidot] Include not found: ${includePath}`
                );

                return (
                    lineBreak +
                    `Include <${sourceName}.txt> was not found!`
                );
            }

            let includedSource = fs.readFileSync(
                includePath,
                "utf8"
            );

            // Remove the component's leading @metadata block.
            includedSource = stripIncludeMetadata(includedSource);

            // Substitute {$parameter} placeholders.
            // Wikidot parameter names may contain hyphens.
            includedSource = includedSource.replace(
                /\{\$([A-Za-z_][\w-]*)\}/g,
                (placeholder, name) => parameters[name] ?? ""
            );

            // Expand nested includes before returning the inserted source.
            includedSource = expandIncludes(
                includedSource,
                [...includeStack, sourceName]
            );

            // Preserve the newline that preceded the include tag.
            return lineBreak + includedSource;
        }
    );
}

/* 
 * =============== =============== =============== ===============
 * Main Wikidot Document Parser
 * =============== =============== =============== ===============
 */

export function parseWikidot(source, sourceName, customInlineParsers = [], tocOverride = null) {
    source = expandIncludes(source);
    
    headingIdCounter = 0;
    const lines = source.split(/\r?\n/);
    const output = [];
    const toc = [];

    let paragraph = [];

    function flushParagraph() {
        if (paragraph.length === 0) {
            return;
        }

        const text = paragraph.join(" ");
        const parsed = parseInline(text, customInlineParsers);

        // Skip paragraphs that contain no meaningful content.
        if (parsed.trim() === "") {
            paragraph = [];
            return;
        }

        output.push(`<p>${parsed}</p>`);

        paragraph = [];
    }

    let index = 0;

    while (index < lines.length) {
        const line = lines[index];

        /*
         * Blank line
         */
        if (line.trim() === "") {
            flushParagraph();
            index++;
            continue;
        }

        
        /*
         * ListPages module
         */
        const listPagesAttributes = parseListPagesAttributes(
            line.trim()
        );

        if (listPagesAttributes !== null) {
            flushParagraph();

            let endIndex = index + 1;

            while (
                endIndex < lines.length &&
                lines[endIndex].trim().toLowerCase() !== "[[/module]]"
            ) {
                endIndex++;
            }

            if (endIndex >= lines.length) {
                throw new Error(
                    `Unclosed ListPages module in ${sourceName}`
                );
            }

            const moduleBody = lines
                .slice(index + 1, endIndex)
                .join("\n");

            output.push(
                renderListPages(
                    listPagesAttributes,
                    moduleBody,
                    sourceName
                )
            );

            index = endIndex + 1;
            continue;
        }
        
        /*
         * YouTube
         */
        const youtube = parseYoutube(line);

        if (youtube !== null) {
            flushParagraph();
            output.push(youtube);
            index++;
            continue;
        }


        /*
         * Div start
         */

        const divStart = parseDivStart(line);

        if (divStart !== null) {
            flushParagraph();
            output.push(divStart);
            index++;
            continue;
        }

        /*
         * Div end
         */

        const divEnd = parseDivEnd(line);

        if (divEnd !== null) {
            flushParagraph();
            output.push(divEnd);
            index++;
            continue;
        }

        /*
         * Toc end
         */
        if (line.trim() === "[[toc]]") {
            flushParagraph();

            const finalToc = tocOverride ?? toc;

            output.push(renderToc(finalToc));

            index++;
            continue;
        }

        /*
         * Heading
         */
        const heading = parseHeading(
            line,
            customInlineParsers
        );

        if (heading !== null) {
            flushParagraph();
            output.push(heading.html);
            toc.push({
                level: heading.level,
                id: heading.id,
                text: heading.text
            });
            index++;
            continue;
        }

        /*
         * Horizontal rule
         */
        const horizontalRule = parseHorizontalRule(line);

        if (horizontalRule !== null) {
            flushParagraph();
            output.push(horizontalRule);
            index++;
            continue;
        }

        /*
         * Image
         */
        const image = parseImage(line, sourceName);

        if (image !== null) {
            flushParagraph();
            output.push(image);
            index++;
            continue;
        }

        /*
         * Blockquote
         */

        if (/^>\s?/.test(line)) {
            flushParagraph();

            const blockquote = parseBlockquote(lines, index);

            output.push(blockquote.html);

            index = blockquote.nextIndex;
            continue;
        }

        /*
         * Table
         */
        if (isTableLine(line)) {
            flushParagraph();

            const table = parseTable(
                lines,
                index,
                customInlineParsers
            );

            output.push(table.html);

            index = table.nextIndex;
            continue;
        }

        /*
         * List
         */
        if (/^\s*[*#]\s+/.test(line)) {
            flushParagraph();

            const list = parseList(
                lines,
                index,
                customInlineParsers
            );

            output.push(list.html);

            index = list.nextIndex;
            continue;
        }

        /*
         * Normal paragraph
         */
        paragraph.push(line.trim());

        index++;
    }

    flushParagraph();

    const html = output.join("\n");
    const finalToc = tocOverride ?? toc;

    return {
        html: html.replaceAll(
            "%%toc%%",
            renderToc(finalToc)
        ),
        toc
    };

}