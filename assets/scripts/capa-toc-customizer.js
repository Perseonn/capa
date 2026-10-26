document.addEventListener("DOMContentLoaded", () => {
    const toc = document.querySelector("#toc");

    if (!toc) return;

    const path = window.location.pathname;
    const match = path.match(/\/([^/]+)\/?$/);

    if (!match) return;

    const slug = match[1];

    toc.dataset.pageSlug = slug;
});