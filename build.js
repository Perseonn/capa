import fs from "fs";
import path from "path";

import { parseWikidot, escapeHtml } from "./parser-wikidot.js";
import {
    renderArticlePage,
    renderListingPage,
    renderHomePage
} from "./template.js";

const CONTENT_DIR = "./content";
const DIST_DIR = "./dist";
const SITE_URL = "https://capa.asoh.xyz";


/*
 * ============================================================
 * Page Discovery
 * ============================================================
 */

function discoverPages() {
    const files = fs.readdirSync(CONTENT_DIR)
        .filter(file => file.endsWith(".txt"));

    return files.map(file => {
        const sourceName = path.basename(file, ".txt");

        const match = sourceName.match(/^(guide|article)_(.+)$/);

        if (!match) {
            throw new Error(
                `Invalid content filename: ${file}\n` +
                `Expected guide_<slug>.txt or article_<slug>.txt`
            );
        }

        const type = match[1];
        const slug = match[2];

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
    return `/asset/${page.type}/${page.slug}/${page.slug}.avif`;
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
 * Page Generator Helper
 * ============================================================
 */


function writePage(outputPath, html) {
    fs.mkdirSync(path.dirname(outputPath), {
        recursive: true
    });

    fs.writeFileSync(outputPath, html);
}

/*
 * ============================================================
 * Build Listing Pages
 * ============================================================
 */


function buildListingPages(pages) {
    const guides = pages
        .filter(page => page.type === "guide")
        .sort((a, b) =>
            a.metadata.title.localeCompare(
                b.metadata.title
            )
        );

    const articles = pages
        .filter(page => page.type === "article")
        .sort((a, b) =>
            b.metadata.updated.localeCompare(
                a.metadata.updated
            )
        );

    const guideHtml = createHtml(
        "Guides",
        renderListingPage({
            title: "Guides",
            subtitle: "Game walkthroughs, cheat codes, or both!",
            pages: guides
        })
    );

    writePage(
        path.join(DIST_DIR, "guide", "index.html"),
        guideHtml
    );

    const articleHtml = createHtml(
        "Articles",
        renderListingPage({
            title: "Articles",
            subtitle: "Game reviews and opinion!",
            pages: articles
        })
    );

    writePage(
        path.join(DIST_DIR, "article", "index.html"),
        articleHtml
    );
}

/*
 * ============================================================
 * Build Home Page
 * ============================================================
 */

function buildHomePage(pages) {
    const guides = pages
        .filter(page => page.type === "guide")
        .sort((a, b) =>
            b.metadata.updated.localeCompare(
                a.metadata.updated
            )
        )
        .slice(0, 4);

    const articles = pages
        .filter(page => page.type === "article")
        .sort((a, b) =>
            b.metadata.updated.localeCompare(
                a.metadata.updated
            )
        )
        .slice(0, 4);

    const html = createHtml(
        "CAPA",
        renderHomePage({
            guides,
            articles
        })
    );

    writePage(
        path.join(DIST_DIR, "index.html"),
        html
    );
}

/*
 * ============================================================
 * Sitemap
 * ============================================================
 */

function buildSitemap(pages) {
    const urls = [
        {
            url: `${SITE_URL}/`,
            updated: null
        },
        {
            url: `${SITE_URL}/guide/`,
            updated: null
        },
        {
            url: `${SITE_URL}/article/`,
            updated: null
        },
        ...pages.map(page => ({
            url: `${SITE_URL}/${page.type}/${page.slug}/`,
            updated: page.metadata.updated
        }))
    ];


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

function createHtml(title, body, socialImage = "", description = "") {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>

    <meta property="og:type" content="website">
    <meta property="og:image" content="${socialImage}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}...">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${socialImage}">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}...">
    
    
</head>
<body>
    ${body}
</body>
</html>`;
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

        const html = createHtml(
            metadata.title,
            renderArticlePage({
                title: metadata.title,
                author: metadata.author,
                updated: metadata.updated,
                splashImage,
                content: body,
                toc
            }),
            socialImage,
            description
        );
        
        const outputDir = path.join(DIST_DIR, page.type, page.slug);
        fs.mkdirSync(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, "index.html");
        fs.writeFileSync(outputPath, html);
        console.log(`Built: ${page.sourcePath} → ${outputPath}`);
    }

    buildListingPages(pages);
    buildHomePage(pages);
    buildSitemap(pages);
    
}

build();