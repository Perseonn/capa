import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


import { parseWikidot, escapeHtml } from "./assets/scripts/parser-wikidot.js";
import {
    renderArticlePage,
    renderListingPage,
    renderHomePage
} from "./assets/scripts/template.js";

const CONTENT_DIR = "./contents";
const DIST_DIR = "./dist";
const SITE_URL = "https://capa.asoh.xyz";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/*
 * ============================================================
 * Page Discovery
 * ============================================================
 */

function discoverPages() {
    const files = fs.readdirSync(CONTENT_DIR)
        .filter(file =>
            file.endsWith(".txt") &&
            !file.endsWith("__template.txt")
        );

    return files.map(file => {
        const sourceName = path.basename(file, ".txt");

        let type;
        let slug;

        if (sourceName === "_index") {
            type = "";
            slug = "";
        } else {
            const indexMatch = sourceName.match(/^(.+)__index$/);

            if (indexMatch) {
                type = indexMatch[1];
                slug = "";
            } else {
                const pageMatch = sourceName.match(/^(.+)_(.+)$/);

                if (!pageMatch) {
                    throw new Error(
                        `Invalid content filename: ${file}`
                    );
                }

                type = pageMatch[1];
                slug = pageMatch[2];
            }
        }

        const sourcePath = path.join(
            CONTENT_DIR,
            file
        );

        const source = fs.readFileSync(
            sourcePath,
            "utf8"
        );

        const { metadata } = parseMetadata(source);

        validateMetadata(
            metadata,
            sourcePath
        );

        return {
            type,
            slug,
            sourceName,
            sourcePath,
            metadata
        };
    });
}


/*
 * ============================================================
 * Purge Stale Pages
 * ============================================================
 */

const DIST_EXCEPTIONS = [
    // Directories inside dist that should never be removed.
    // Example:
    // "assets"
];

function purgeStalePages(pages) {
    if (!fs.existsSync(DIST_DIR)) {
        return;
    }

    const validPaths = new Set(
        pages.map(page =>
            path.join(page.type, page.slug)
        )
    );

    const entries = fs.readdirSync(DIST_DIR, {
        withFileTypes: true
    });

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }

        const typeDir = entry.name;

        if (DIST_EXCEPTIONS.includes(typeDir)) {
            continue;
        }

        const typePath = path.join(DIST_DIR, typeDir);

        const pageEntries = fs.readdirSync(typePath, {
            withFileTypes: true
        });

        for (const pageEntry of pageEntries) {
            if (!pageEntry.isDirectory()) {
                continue;
            }

            const relativePath = path.join(
                typeDir,
                pageEntry.name
            );

            if (DIST_EXCEPTIONS.includes(relativePath)) {
                continue;
            }

            if (!validPaths.has(relativePath)) {
                const stalePath = path.join(
                    DIST_DIR,
                    relativePath
                );

                fs.rmSync(stalePath, {
                    recursive: true,
                    force: true
                });

                console.log(`Removed stale page: ${stalePath}`);
            }
        }
    }
}

/*
 * ============================================================
 * Get Manual Meta
 * @title: Sample Article / Guide
 * @author: Perseonn Balthasaar
 * @updated: 2026-09-25
 * The first 100 characters on the next paragraph becomes description
 * ============================================================
 */

function parseMetadata(source) {
    const lines = source.split(/\r?\n/);

    const metadata = {
        title: null,
        author: null,
        updated: null
    };

    let index = 0;

    while (index < lines.length) {
        const line = lines[index].trim();

        if (!line.startsWith("@")) {
            break;
        }

        const match = line.match(/^@(\w+):\s*(.*)$/);

        if (!match) {
            break;
        }

        const key = match[1];
        const value = match[2];

        if (key in metadata) {
            metadata[key] = value;
        }

        index++;
    }

    return {
        metadata,
        content: lines.slice(index).join("\n")
    };
}

function createMetaDescription(source) {
    const lines = source.split(/\r?\n/);

    for (const line of lines) {
        const text = line.trim();

        if (!text) {
            continue;
        }

        if (
            text.startsWith("[[") ||
            text.startsWith("++") ||
            text.startsWith(">") ||
            text.startsWith("*") ||
            text.startsWith("#") ||
            text.startsWith("||")
        ) {
            continue;
        }

        return text.slice(0, 100);
    }

    return "";
}

function getSplashImage(page) {
    return `/assets/${page.type}/${page.slug}/${page.slug}.avif`;
}

function getSocialImage(page) {
    return `${SITE_URL}/assets/${page.type}/${page.slug}/${page.slug}-splash.jpg`;
}

function validateMetadata(metadata, sourcePath) {
    for (const field of ["title", "author", "updated"]) {
        if (!metadata[field]) {
            throw new Error(
                `Missing @${field} in ${sourcePath}`
            );
        }
    }
}

/*
 * ============================================================
 * Apply _template
 * ============================================================
 */
function applyPageTemplate(page, metadata, content, toc) {
    if (!page.type) {
        return content;
    }

    const templatePath = path.join(
        CONTENT_DIR,
        `${page.type}__template.txt`
    );

    if (!fs.existsSync(templatePath)) {
        return content;
    }

    let template = fs.readFileSync(
        templatePath,
        "utf8"
    );

    /*
     * Keep %%content%% as a marker.
     * The actual page HTML is inserted after the
     * template itself has been parsed.
     */
    template = template
    .replaceAll("%%title%%", metadata.title ?? "")
    .replaceAll("%%name%%", page.slug ?? "")
    .replaceAll("%%category%%", page.type ?? "")
    .replaceAll(
        "%%fullname%%",
        page.type
            ? `${page.type}:${page.slug}`
            : page.slug
    )
    .replaceAll(
        "%%created_by_linked%%",
        metadata.author ?? ""
    )
    .replaceAll(
        "%%created_at%%",
        metadata.updated ?? ""
    );

    const { html } = parseWikidot(
        template,
        page.sourceName,
        [],
        toc
    );

    return html.replaceAll(
        "%%content%%",
        content
    );
}

/*
 * ============================================================
 * Sitemap
 * ============================================================
 */

function buildSitemap(pages) {
    const urls = pages.map(page => ({
        url: page.type
            ? `${SITE_URL}/${page.type}/${page.slug}/`
            : `${SITE_URL}/`,
        updated: page.metadata?.updated ?? null
    }));

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `    <url>
        <loc>${item.url}</loc>
        ${item.updated ? `<lastmod>${item.updated}</lastmod>` : ""}
    </url>`).join("\n")}
</urlset>
`;

    const outputPath = path.join(
        DIST_DIR,
        "sitemap.xml"
    );

    fs.writeFileSync(
        outputPath,
        sitemap
    );

    console.log(`Built: ${outputPath}`);
}


/*
 * ============================================================
 * HTML document
 * ============================================================
 */

function applyTemplate(template, values) {
    return template
        .replaceAll("{{TITLE}}", escapeHtml(values.TITLE ?? ""))
        .replaceAll("{{SOCIAL_IMAGE}}", values.SOCIAL_IMAGE ?? "")
        .replaceAll("{{DESCRIPTION}}", escapeHtml(values.DESCRIPTION ?? ""))
        .replaceAll("{{SITE_URL}}", values.SITE_URL ?? "")
        .replaceAll("{{NAV}}", values.NAV ?? "")
        .replaceAll("{{BODY}}", values.BODY ?? "");
}

const layoutPath = path.join(__dirname, "contents", "_layout.html");
const layoutTemplate = fs.readFileSync(layoutPath, "utf8");
const navPath = path.join(__dirname,"contents","_nav.html");
const navTemplate = fs.readFileSync(navPath,"utf8");

function createHtml(title, body, socialImage = "", description = "") {
    return applyTemplate(layoutTemplate, {
        TITLE: title,
        SOCIAL_IMAGE: socialImage,
        DESCRIPTION: description,
        SITE_URL,
        NAV: navTemplate,
        BODY: body
    });
}

/*
 * ============================================================
 * Build
 * ============================================================
 */

function build() {
    fs.mkdirSync(DIST_DIR, { recursive: true });

    const pages = discoverPages();
    purgeStalePages(pages);

    for (const page of pages) {
        const source = fs.readFileSync(page.sourcePath, "utf8");
        const {metadata,content} = parseMetadata(source);
        validateMetadata(metadata, page.sourcePath);
        const { html: body, toc } = parseWikidot(content,page.sourceName);

        const splashImage = getSplashImage(page);
        const socialImage = getSocialImage(page);
        const description = createMetaDescription(content);

        const pageContent = applyPageTemplate(
            page,
            metadata,
            body,
            toc
        );

        const html = createHtml(
            metadata.title,
            pageContent,
            socialImage,
            description
        );
        
        const outputDir = path.join(DIST_DIR, page.type, page.slug);
        fs.mkdirSync(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, "index.html");
        
        fs.writeFileSync(outputPath, html);
        console.log(`Built: ${page.sourcePath} → ${outputPath}`);
    }

    buildSitemap(pages);
    
}

build();