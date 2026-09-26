import { escapeHtml } from "./parser-wikidot.js";

export function renderArticlePage({
    title,
    author,
    updated,
    splashImage,
    content,
    toc
}) {
    return `
<div class="article-page">

    <section
        class="splash-container"
        style="background-image: url('${splashImage}')"
    >
        <div class="title-container">

            <div class="page-extra">
                <span class="page-extra-icon"></span>
                ${updated}
            </div>

            <div class="page-sub-title">
                ${author}
            </div>

            <h1 class="page-title">
                ${title}
            </h1>

        </div>
    </section>

    <nav class="table-of-contents-small">
        ${renderToc(toc)}
    </nav>

    <main class="article-content">
        ${content}
    </main>

</div>
`;
}

function renderPageCard(page) {
    const imageName = page.type === "guide"
        ? `${page.slug}-logo.avif`
        : `${page.slug}.avif`;

    const image = `/assets/${page.type}/${page.slug}/${imageName}`;

    return `
<a class="page-card" href="/${page.type}/${page.slug}/">
    <img src="${image}" alt="${page.metadata.title}">
    <div class="page-card-title">
        ${page.metadata.title}
    </div>
    <div class="page-card-subtitle">
        by ${page.metadata.author}
    </div>
</a>
`;
}

export function renderListingPage({
    title,
    subtitle,
    pages
}) {
    return `
<section class="listing-page">

    <header class="listing-header">
        <h1>${title}</h1>
        <p>${subtitle}</p>
    </header>

    <div class="page-grid">
        ${pages.map(renderPageCard).join("\n")}
    </div>

</section>
`;
}

export function renderHomePage({
    guides,
    articles
}) {
    return `
<div class="home-page">

    <section class="home-splash">
        <div class="title-container">
            <div class="page-title">
                CAPA
            </div>

            <div class="page-sub-title">
                A Website Dedicated to Guides and Codes for Games that We Love!
            </div>
        </div>
    </section>

    <section class="home-section guide-section">
        <div class="title-container">
            <div class="page-sub-title">
                Game walkthroughs, cheat codes, or both!
            </div>

            <div class="page-title">
                Guides
            </div>
        </div>

        <div class="page-grid">

            <a class="page-card page-card-featured" href="/guide/">
                <div class="page-card-title">
                    Go to Guides
                </div>
            </a>

            ${guides.map(renderPageCard).join("\n")}

        </div>
    </section>

    <section class="home-section article-section">
        <div class="title-container">
            <div class="page-sub-title">
                Game reviews and opinion!
            </div>

            <div class="page-title">
                Articles
            </div>
        </div>

        <div class="page-grid">

            <a class="page-card page-card-featured" href="/article/">
                <div class="page-card-title">
                    Go to Articles
                </div>
            </a>

            ${articles.map(renderPageCard).join("\n")}

        </div>
    </section>

</div>
`;
}

function renderToc(toc) {
    return toc.map(item =>
        `<a href="#${item.id}">${escapeHtml(item.text)}</a>`
    ).join("\n");
}