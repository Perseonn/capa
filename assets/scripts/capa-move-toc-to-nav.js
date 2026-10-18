document.addEventListener("DOMContentLoaded", () => {
    const toc = document.querySelector("#toc");
    const target = document.querySelector("#capa-nav-content");

    if (toc && target) {
        target.appendChild(toc);
    }
});