/* =============== =============== =============== ===============
 * Custom Wikidot-like Parser
 * =============== =============== =============== ===============
 */

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
    }
];