/* Ishavarya: shared front-end logic (bag, wishlist, orders, profile, search).
   Everything is stored in the browser (localStorage). There is no backend yet. */
(function() {
    "use strict";

    var K = {
        cart: "ishavarya.cart",
        wish: "ishavarya.wishlist",
        orders: "ishavarya.orders",
        profile: "ishavarya.profile",
    };

    var WHATSAPP_NUMBER = "917028795655";

    function whatsappUrl(text, number) {
        return "https://wa.me/" + (number || WHATSAPP_NUMBER) + "?text=" + encodeURIComponent(text);
    }

    function orderMessage(d) {
        var L = [];
        L.push("Namaste Ishavarya! I would like to place an order.");
        if (d.orderNo) L.push("Order no: " + d.orderNo);
        L.push("");
        d.lines.forEach(function(l) {
            L.push("• " + l.name + " × " + l.qty + " = " + money(l.price * l.qty));
        });
        L.push("");
        if (d.subtotal != null) L.push("Subtotal: " + money(d.subtotal));
        L.push("Total: " + money(d.total));
        L.push("");
        L.push("Deliver to:");
        L.push(d.name + (d.phone ? " (" + d.phone + ")" : ""));
        L.push([d.address, d.city, d.pin].filter(Boolean).join(", "));
        L.push("");
        L.push("Please share the payment details to confirm my order.");
        return L.join("\n");
    }

    function read(key, fallback) {
        try {
            var v = JSON.parse(localStorage.getItem(key));
            return v == null ? fallback : v;
        } catch (e) {
            return fallback;
        }
    }

    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    }

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function(c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function money(n) {
        return "₹" + Number(n).toLocaleString("en-IN");
    }

    /* ---------- Bag ---------- */
    function cart() { return read(K.cart, []); }

    function saveCart(items) {
        write(K.cart, items);
        refreshBadges();
    }

    function cartCount() { return cart().reduce(function(n, i) { return n + i.qty; }, 0); }

    function cartTotal() { return cart().reduce(function(n, i) { return n + i.qty * i.price; }, 0); }

    function addToCart(item) {
        var items = cart();
        var found = items.filter(function(i) { return i.id === item.id; })[0];
        if (found) found.qty += 1;
        else items.push({ id: item.id, name: item.name, hi: item.hi, price: item.price, img: item.img, qty: 1 });
        saveCart(items);
    }

    function setQty(id, qty) {
        var items = cart()
            .map(function(i) { if (i.id === id) i.qty = qty; return i; })
            .filter(function(i) { return i.qty > 0; });
        saveCart(items);
    }

    function removeFromCart(id) {
        saveCart(cart().filter(function(i) { return i.id !== id; }));
    }

    function clearCart() { saveCart([]); }

    /* ---------- Wishlist ---------- */
    function wishlist() { return read(K.wish, []); }

    function inWishlist(id) {
        return wishlist().some(function(i) { return i.id === id; });
    }

    function toggleWishlist(item) {
        var items = wishlist();
        var idx = -1;
        items.forEach(function(i, n) { if (i.id === item.id) idx = n; });
        if (idx > -1) {
            items.splice(idx, 1);
            write(K.wish, items);
            return false;
        }
        items.push({ id: item.id, name: item.name, hi: item.hi, price: item.price, img: item.img });
        write(K.wish, items);
        return true;
    }

    function removeWish(id) {
        write(K.wish, wishlist().filter(function(i) { return i.id !== id; }));
    }

    /* ---------- Orders & profile ---------- */
    function orders() { return read(K.orders, []); }

    function placeOrder(address) {
        var items = cart();
        if (!items.length) return null;
        var order = {
            id: "ISH-" + String(Date.now()).slice(-8),
            date: new Date().toISOString(),
            items: items,
            total: cartTotal(),
            address: address,
            status: "Placed",
        };
        var all = orders();
        all.unshift(order);
        write(K.orders, all);
        clearCart();
        return order;
    }

    function profile() {
        return read(K.profile, { name: "", phone: "", email: "", address: "", city: "", pin: "" });
    }

    function saveProfile(p) { write(K.profile, p); }

    function clearProfile() {
        try { localStorage.removeItem(K.profile); } catch (e) { /* ignore */ }
    }

    /* ---------- UI helpers ---------- */
    function refreshBadges() {
        var n = cartCount();
        document.querySelectorAll("[data-cart-count]").forEach(function(el) {
            el.textContent = n > 99 ? "99+" : n;
            el.hidden = n === 0;
        });
    }

    var toastTimer;

    function toast(message) {
        var el = document.getElementById("toast");
        if (!el) {
            el = document.createElement("div");
            el.id = "toast";
            el.setAttribute("role", "status");
            el.setAttribute("aria-live", "polite");
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function() { el.classList.remove("is-visible"); }, 2200);
    }

    window.Ishavarya = {
        esc: esc,
        money: money,
        toast: toast,
        refreshBadges: refreshBadges,
        cart: cart,
        cartCount: cartCount,
        cartTotal: cartTotal,
        addToCart: addToCart,
        setQty: setQty,
        removeFromCart: removeFromCart,
        clearCart: clearCart,
        wishlist: wishlist,
        inWishlist: inWishlist,
        toggleWishlist: toggleWishlist,
        removeWish: removeWish,
        orders: orders,
        placeOrder: placeOrder,
        profile: profile,
        saveProfile: saveProfile,
        clearProfile: clearProfile,
    };

    /* ---------- Search (home page nav) ---------- */
    function initSearch() {
        var form = document.getElementById("site-search");
        if (!form) return;
        var input = form.querySelector("input");
        var row = document.querySelector(".products__row");
        var empty = document.getElementById("search-empty");

        function apply(query) {
            if (!row) return;
            var q = query.trim().toLowerCase();
            var shown = 0;
            row.querySelectorAll(".product").forEach(function(li) {
                var hay = (li.dataset.name + " " + li.dataset.hi).toLowerCase();
                var match = !q || hay.indexOf(q) > -1;
                li.hidden = !match;
                if (match) shown += 1;
            });
            if (empty) empty.hidden = shown > 0;
        }

        form.addEventListener("submit", function(e) {
            e.preventDefault();
            var q = input.value.trim();
            if (!q) { input.focus(); return; }
            if (!row) { location.href = "index.html?q=" + encodeURIComponent(q); return; }
            apply(q);
            var target = document.getElementById("products");
            if (target) target.scrollIntoView({ behavior: "smooth" });
        });
        input.addEventListener("input", function() { apply(input.value); });
        input.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
                input.value = "";
                apply("");
                input.blur();
            }
        });

        var q = new URLSearchParams(location.search).get("q");
        if (q && row) {
            input.value = q;
            apply(q);
        }
    }

    /* ---------- Product cards (home page) ---------- */
    function initProducts() {
        var row = document.querySelector(".products__row");
        if (!row) return;

        function itemOf(li) {
            return {
                id: li.dataset.id,
                name: li.dataset.name,
                hi: li.dataset.hi,
                price: Number(li.dataset.price),
                img: li.dataset.img,
            };
        }

        row.querySelectorAll(".product").forEach(function(li) {
            var heart = li.querySelector("[data-wish]");
            if (heart) heart.setAttribute("aria-pressed", String(inWishlist(li.dataset.id)));
        });

        row.addEventListener("click", function(e) {
            var li = e.target.closest(".product");
            if (!li) return;
            if (e.target.closest("a")) e.preventDefault();

            var add = e.target.closest("[data-add]");
            var wish = e.target.closest("[data-wish]");
            var item = itemOf(li);

            if (add) {
                addToCart(item);
                toast(item.name + " added to bag");
            } else if (wish) {
                var on = toggleWishlist(item);
                wish.setAttribute("aria-pressed", String(on));
                toast(on ? item.name + " added to wishlist" : item.name + " removed from wishlist");
            }
        });
    }

    document.addEventListener("DOMContentLoaded", function() {
        refreshBadges();
        initSearch();
        initProducts();
    });
    window.addEventListener("storage", refreshBadges);
})();



//all products//
document.addEventListener("DOMContentLoaded", function() {
    // 1. Hero Card click -> Open Detail Page
    const heroCard = document.querySelector(".festival");
    if (heroCard && !heroCard.getAttribute("href")) {
        heroCard.addEventListener("click", function(e) {
            e.preventDefault();
            window.location.href = "hero_card.html";
        });
    }

    // 2. "View All" button click -> Open 31 items modal
    const viewAllBtn = document.querySelector(".products__intro button, #view-all-btn, .view-all"); // Adjust selector based on your button class
    const modal = document.getElementById("all-items-modal");
    const closeModal = document.getElementById("close-modal");

    // List of all 31 items data (Names matching your second picture)
    const allItems = [
        { name: "गुलाल", img: "./images2/gulal.png" },
        { name: "हल्दी", img: "./images2/haldi.png" },
        { name: "अष्टगंध", img: "./images2/ashtagandha.png" },
        { name: "बुक्का", img: "./images2/bukka.png" },
        { name: "कुमकुम", img: "./images2/kumkum.png" },
        { name: "अगरबत्ती", img: "./images2/agarbatti.png" },
        { name: "लक्ष्मी (छोटी झाड़ू)", img: "./images2/zaddu.png" },
        { name: "साबरानी धूप कप", img: "./images2/dhup.png" },
        { name: "आरती पुस्तक", img: "./images2/aartiBook.png" },
        { name: "बताशे", img: "./images2/batashe.png" },
        { name: "5 घी बत्ती", img: "./images2/ghee_baati.png" },
        { name: "शुभ-लाभ स्टीकर", img: "./images2/shubhLabh.jpeg" },
        { name: "माचिस", img: "./images2/matchbox.png" },
        { name: "5 सुपारी", img: "./images2/supari.png" },
        { name: "उबटन", img: "./images2/ubtan.png" },
        { name: "भीमसेनी कपूर", img: "./images2/kapoor.png" },
        { name: "गंगाजल", img: "./images2/gangajal.png" },
        { name: "इत्र", img: "./images2/ittar.png" },
        { name: "कलावा", img: "./images2/kalava.png" },
        { name: "5 मटका", img: "./images2/matka.png" },
        { name: "5 दीया", img: "./images2/5diyas.png" },
        { name: "मुरमुरा", img: "./images2/murmura.png" },
        { name: "5 सख मव", img: "./images2/sakh_mav.png" },
        { name: "जनेऊ", img: "./images2/janeu.png" },
        { name: "लाल वस्त्र", img: "./images2/lal_vastra.png" },
        { name: "अक्षत", img: "./images2/akshat.png" },
        { name: "रंगोली", img: "./images2/rangoli.png" },
        { name: "कपास बत्ती", img: "./images2/kapas_baati.png" },
        { name: "उंबरठा स्टीकर", img: "./images2/sticker.png" },
        { name: "लक्ष्मी-गणपति की फ़ोटो", img: "./images2/photo.png" }
    ];

    if (viewAllBtn && modal) {
        const gridContainer = modal.querySelector(".modal__grid");

        // Populate modal grid items dynamically
        gridContainer.innerHTML = allItems.map(item => `
            <div class="modal-card">
                <img src="${item.img}" alt="${item.name}" loading="lazy" onerror="this.src='./images2/placeholder.png'">
                <span>${item.name}</span>
            </div>
        `).join("");

        viewAllBtn.addEventListener("click", function(e) {
            e.preventDefault();
            modal.hidden = false;
        });

        closeModal.addEventListener("click", function() {
            modal.hidden = true;
        });

        modal.addEventListener("click", function(e) {
            if (e.target === modal) modal.hidden = true;
        });
    }
});