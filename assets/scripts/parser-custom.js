/* =============== =============== =============== ===============
 * Custom Wikidot-like Parser
 * =============== =============== =============== ===============
 */
import fs from "fs";

export const customInlineParsers = [
/* 
 * =============== =============== =============== ===============
 * Links [[link url]] [[link url | custom text]] [[link url | custom text | class]]
 * =============== =============== =============== ===============
 */
    {
        name: "link",
        regex: /^\[\[link\s+(.+?)\]\]/,
        render: (
            match,
            { parseInline, escapeHtml }
        ) => {
            const content = match[1];
            const parts = content
                .split("|")
                .map(part => part.trim());

            const url = parts[0];
            const text = parts[1] ?? url;
            const className = parts[2] ?? "";

            const classAttribute = className
                ? ` class="${escapeHtml(className)}"`
                : "";

            return `<a href="${escapeHtml(url)}"${classAttribute}>${parseInline(text)}</a>`;
        }
    },
    {
        name: "custom-anchor-target",
        regex: /^\[\[#([a-zA-Z0-9_-]+)\]\]/,

        render: (match) => {
            return `<span class="a-target" id="${match[1]}"></span>`;
        }
    },
    {
        name: "icon",
        regex: /^\[\[i(?:\s*\|\s*([^\]]*?))?\]\]/,

        render: (match) => {
            const classes = (match[1] || "").trim();

            if (!classes) {
                return "<i></i>";
            }

            const escaped = classes
                .replaceAll("&", "&amp;")
                .replaceAll('"', "&quot;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;");

            return `<i class="${escaped}"></i>`;
        }
    }
];


/*
 * =============== =============== =============== ===============
 * YouTube [[youtube id]]
 * =============== =============== =============== ===============
 */

export function parseYoutube(line) {
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
        videoId
    );
}

