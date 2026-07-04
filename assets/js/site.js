(function () {
    "use strict";

    function inPagesDir() {
        return location.pathname.indexOf("/pages/") !== -1;
    }

    function toSiteUrl(url) {
        return inPagesDir() ? "../" + url : url;
    }

    function currentFilename() {
        var parts = location.pathname.split("/");
        return decodeURIComponent(parts[parts.length - 1] || "index.html");
    }

    /* ---------- Theme toggle ---------- */
    function initTheme() {
        var btn = document.getElementById("theme-toggle");
        if (!btn) return;

        function apply(theme) {
            document.documentElement.setAttribute("data-theme", theme);
            btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
            btn.textContent = theme === "dark" ? "☀️" : "🌙";
        }

        apply(document.documentElement.getAttribute("data-theme") || "light");

        btn.addEventListener("click", function () {
            var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
            try { localStorage.setItem("bk-theme", next); } catch (e) {}
            apply(next);
        });
    }

    /* ---------- Mobile nav toggle ---------- */
    function initNavToggle() {
        var toggle = document.getElementById("nav-toggle");
        var tools = document.getElementById("header-tools");
        if (!toggle || !tools) return;

        toggle.addEventListener("click", function () {
            var open = tools.classList.toggle("open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });

        document.addEventListener("click", function (e) {
            if (!tools.classList.contains("open")) return;
            if (tools.contains(e.target) || toggle.contains(e.target)) return;
            tools.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
        });
    }

    /* ---------- Active nav link ---------- */
    function markActiveNavLink() {
        var file = currentFilename();
        var links = document.querySelectorAll(".main-nav a");
        links.forEach(function (a) {
            var href = a.getAttribute("href") || "";
            var linkFile = href.split("/").pop();
            if (linkFile === file || (file === "" && linkFile === "index.html")) {
                a.classList.add("active");
                a.setAttribute("aria-current", "page");
            }
        });
    }

    /* ---------- Search ---------- */
    function initSearch() {
        var input = document.getElementById("site-search-input");
        var results = document.getElementById("search-results");
        var index = window.SITE_INDEX || [];
        if (!input || !results) return;

        var activeIndex = -1;
        var currentMatches = [];

        function render(matches) {
            results.innerHTML = "";
            currentMatches = matches;
            activeIndex = -1;
            if (!matches.length) {
                results.hidden = true;
                return;
            }
            matches.slice(0, 12).forEach(function (item, i) {
                var a = document.createElement("a");
                a.href = toSiteUrl(item.url);
                a.className = "search-result";
                a.setAttribute("data-index", i);
                a.innerHTML = '<span class="sr-title"></span><span class="sr-category"></span>';
                a.querySelector(".sr-title").textContent = item.title;
                a.querySelector(".sr-category").textContent = item.category;
                results.appendChild(a);
            });
            results.hidden = false;
        }

        function search(query) {
            query = query.trim().toLowerCase();
            if (!query) {
                render([]);
                return;
            }
            var matches = index.filter(function (item) {
                return item.title.toLowerCase().indexOf(query) !== -1 ||
                    item.category.toLowerCase().indexOf(query) !== -1;
            });
            render(matches);
        }

        input.addEventListener("input", function () {
            search(input.value);
        });

        input.addEventListener("keydown", function (e) {
            var items = results.querySelectorAll(".search-result");
            if (!items.length) return;
            if (e.key === "ArrowDown") {
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
            } else if (e.key === "Enter") {
                if (activeIndex >= 0 && items[activeIndex]) {
                    e.preventDefault();
                    location.href = items[activeIndex].href;
                }
                return;
            } else if (e.key === "Escape") {
                render([]);
                input.blur();
                return;
            } else {
                return;
            }
            items.forEach(function (el, i) { el.classList.toggle("is-active", i === activeIndex); });
            items[activeIndex].scrollIntoView({ block: "nearest" });
        });

        document.addEventListener("click", function (e) {
            if (e.target === input || results.contains(e.target)) return;
            results.hidden = true;
        });

        input.addEventListener("focus", function () {
            if (input.value.trim()) render(currentMatches);
        });
    }

    /* ---------- Breadcrumb ---------- */
    function initBreadcrumb() {
        var slot = document.getElementById("breadcrumb-slot");
        if (!slot) return;
        var index = window.SITE_INDEX || [];
        var file = currentFilename();

        if (file === "index.html" || file === "") {
            slot.remove();
            return;
        }

        var entry = index.filter(function (item) {
            return item.url.split("/").pop() === file;
        })[0];

        if (!entry) {
            slot.remove();
            return;
        }

        var homeHref = toSiteUrl("index.html");
        slot.innerHTML =
            '<a href="' + homeHref + '">Home</a>' +
            '<span class="crumb-sep">/</span>' +
            '<span class="crumb-category"></span>' +
            '<span class="crumb-sep">/</span>' +
            '<span class="crumb-current" aria-current="page"></span>';
        slot.querySelector(".crumb-category").textContent = entry.category;
        slot.querySelector(".crumb-current").textContent = entry.title;
    }

    /* ---------- Back to top ---------- */
    function initBackToTop() {
        var btn = document.createElement("button");
        btn.className = "back-to-top";
        btn.setAttribute("aria-label", "Back to top");
        btn.innerHTML = "&uarr;";
        btn.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        document.body.appendChild(btn);

        window.addEventListener("scroll", function () {
            btn.classList.toggle("visible", window.scrollY > 400);
        }, { passive: true });
    }

    /* ---------- Table scroll wrap ---------- */
    function wrapTables() {
        document.querySelectorAll(".wiki-content table").forEach(function (table) {
            if (table.parentElement.classList.contains("table-scroll")) return;
            var wrap = document.createElement("div");
            wrap.className = "table-scroll";
            table.parentNode.insertBefore(wrap, table);
            wrap.appendChild(table);
        });
    }

    /* ---------- TOC: collapsible + desktop sidebar ---------- */
    function enhanceToc() {
        var article = document.querySelector(".wiki-content");
        var toc = article && article.querySelector("nav.toc");
        if (!toc) return;

        var heading = toc.querySelector("h2");
        if (heading) {
            heading.setAttribute("role", "button");
            heading.setAttribute("tabindex", "0");
            heading.addEventListener("click", function () {
                toc.classList.toggle("toc-collapsed");
            });
            heading.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toc.classList.toggle("toc-collapsed");
                }
            });
        }

        if (window.innerWidth >= 1100) {
            var main = document.querySelector(".main-content");
            toc.remove();
            var aside = document.createElement("aside");
            aside.className = "toc-sidebar";
            aside.appendChild(toc);
            main.classList.add("has-toc-sidebar");
            main.appendChild(aside);
        }
    }

    /* ---------- index.html: category cards + jump nav ---------- */
    function enhanceIndex() {
        var container = document.querySelector(".index-content");
        if (!container) return;

        var children = Array.prototype.slice.call(container.children);
        var chipNav = document.createElement("div");
        chipNav.className = "category-jumpnav";

        var frag = document.createDocumentFragment();
        var currentCard = null;

        children.forEach(function (el) {
            if (el.tagName === "H1") {
                var details = document.createElement("details");
                details.className = "index-card";
                details.open = true;
                if (el.id) details.id = el.id;
                var summary = document.createElement("summary");
                summary.textContent = el.textContent;
                details.appendChild(summary);
                currentCard = details;
                frag.appendChild(details);

                var chip = document.createElement("a");
                chip.className = "chip";
                chip.href = "#" + (el.id || "");
                chip.textContent = el.textContent;
                chipNav.appendChild(chip);
            } else if (currentCard) {
                currentCard.appendChild(el);
            } else {
                frag.appendChild(el);
            }
        });

        container.innerHTML = "";
        container.appendChild(chipNav);
        container.appendChild(frag);
    }

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();
        initNavToggle();
        markActiveNavLink();
        initSearch();
        initBreadcrumb();
        initBackToTop();
        wrapTables();
        enhanceToc();
        enhanceIndex();
    });
})();
