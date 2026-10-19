
document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector(".capa-navbar");
    const toggle = document.querySelector(".capa-nav-toggle");
    const overlay = document.querySelector(".capa-nav-overlay");

    if (!nav || !toggle || !overlay) return;

    function setOpen(open) {
        nav.classList.toggle("is-open", open);

        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute(
            "aria-label",
            open ? "Close navigation" : "Open navigation"
        );

        toggle.innerHTML = open
            ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';

        const isMobile = window.matchMedia(
            "(max-width: 960px)"
        ).matches;

        document.body.style.overflow =
            open && isMobile ? "hidden" : "";
    }

    toggle.addEventListener("click", () => {
        setOpen(!nav.classList.contains("is-open"));
    });

    overlay.addEventListener("click", () => {
        setOpen(false);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            setOpen(false);
        }
    });

    window.addEventListener("resize", () => {
        if (window.matchMedia("(min-width: 959px)").matches) {
            setOpen(false);
        }
    });
});
