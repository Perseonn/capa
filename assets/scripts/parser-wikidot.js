/* =============== =============== =============== ===============
 * The Great Wikidot Parser
 * =============== =============== =============== ===============
 */

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

    const classAttribute = className
        ? ` class="${escapeHtml(className)}"`
        : "";

    return `<figure${classAttribute}>
    <img src="/assets/${escapeHtml(category)}/${escapeHtml(slug)}/${escapeHtml(filename)}" alt="${escapeHtml(title)}">
    ${title ? `<figcaption>${escapeHtml(title)}</figcaption>` : ""}
</figure>`;
}

/* 
 * =============== =============== =============== ===============
 * Parse Div [[div]] [[/div]]
 * =============== =============== =============== ===============
 */
function parseDivStart(line) {
    const match = line.trim().match(
        /^\[\[div(?:\s+class="([^"]+)")?\]\]$/
    );

    if (!match) {
        return null;
    }

    const className = match[1] ?? "";

    const classAttribute = className
        ? ` class="${escapeHtml(className)}"`
        : "";

    return `<div${classAttribute}>`;
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
        `<a href="#${item.id}">${escapeHtml(item.text)}</a>`
    ).join("\n");

    return template.replaceAll(
        "{{TOC}}",
        links
    );
}


/* 
 * =============== =============== =============== ===============
 * Main Wikidot Document Parser
 * =============== =============== =============== ===============
 */

export function parseWikidot(source, sourceName, customInlineParsers = [], tocOverride = null) {
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

        output.push(
            `<p>${parseInline(text, customInlineParsers)}</p>`
        );

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