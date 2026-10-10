(function() {
    "use strict";
    var S = window.Ishavarya;

    var list = document.getElementById("bag-list");
    var content = document.getElementById("bag-content");
    var emptyState = document.getElementById("bag-empty");
    var dialog = document.getElementById("checkout");

    function render() {
        var items = S.cart();
        if (emptyState) emptyState.hidden = items.length > 0;
        if (content) content.hidden = items.length === 0;

        if (list) {
            list.innerHTML = items.map(function(i) {
                return '<li class="bag-item" data-id="' + S.esc(i.id) + '">' +
                    '<div class="bag-item__img">' +
                    (i.img ? '<img src="' + S.esc(i.img) + '" alt="" onerror="this.remove()" />' : "") +
                    "</div>" +
                    '<div class="bag-item__info">' +
                    "<h2>" + S.esc(i.name) + "</h2>" +
                    '<p class="bag-item__hi">' + S.esc(i.hi || "") + "</p>" +
                    '<p class="bag-item__price">' + S.money(i.price) + " each</p>" +
                    "</div>" +
                    '<div class="qty" role="group" aria-label="Quantity for ' + S.esc(i.name) + '">' +
                    '<button type="button" data-dec aria-label="Decrease quantity">&minus;</button>' +
                    "<output>" + i.qty + "</output>" +
                    '<button type="button" data-inc aria-label="Increase quantity">+</button>' +
                    "</div>" +
                    '<p class="bag-item__total">' + S.money(i.price * i.qty) + "</p>" +
                    '<button type="button" class="bag-item__remove" data-remove aria-label="Remove ' + S.esc(i.name) + ' from bag">' +
                    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
                    "</button>" +
                    "</li>";
            }).join("");
        }

        var sumCount = document.getElementById("sum-count");
        var sumSubtotal = document.getElementById("sum-subtotal");
        var sumTotal = document.getElementById("sum-total");

        if (sumCount) sumCount.textContent = S.cartCount();
        if (sumSubtotal) sumSubtotal.textContent = S.money(S.cartTotal());
        if (sumTotal) sumTotal.textContent = S.money(S.cartTotal());
    }

    if (list) {
        list.addEventListener("click", function(e) {
            var li = e.target.closest(".bag-item");
            if (!li) return;
            var id = li.dataset.id;
            var item = S.cart().filter(function(i) { return i.id === id; })[0];
            if (!item) return;

            if (e.target.closest("[data-inc]")) S.setQty(id, item.qty + 1);
            else if (e.target.closest("[data-dec]")) S.setQty(id, item.qty - 1);
            else if (e.target.closest("[data-remove]")) {
                S.removeFromCart(id);
                S.toast(item.name + " removed from bag");
            } else return;
            render();
        });
    }


    /* ---------- WhatsApp Order Message ---------- */
    function buildWhatsAppOrderMessage() {
        var cart = S.cart();
        var profile = S.profile();
        var total = S.cartTotal();

        var lines = [];
        lines.push("Hello! I want to place an order.");
        lines.push("");
        lines.push("Order Details:");

        cart.forEach(function(item, index) {
            lines.push("");
            lines.push("Product " + (index + 1) + ": " + item.name);
            lines.push("Quantity: " + item.qty);
            lines.push("Price: " + S.money(item.price) + " each");
            lines.push("Item Total: " + S.money(item.price * item.qty));
        });

        lines.push("");
        lines.push("Subtotal: " + S.money(total));
        lines.push("Final Total: " + S.money(total));
        lines.push("");
        lines.push("Customer Name: " + (profile.name || "Not provided"));
        lines.push("Phone Number: " + (profile.phone || "Not provided"));

        var address = [profile.address, profile.city, profile.pin]
            .filter(Boolean)
            .join(", ");

        lines.push("Delivery Address: " + (address || "Not provided"));
        lines.push("");
        lines.push("Please confirm the order and share the payment instructions.");

        return lines.join("\n");
    }

    function openWhatsAppCheckout() {
        var cart = S.cart();

        if (!cart.length) {
            S.toast("Your bag is empty. Please add products before checkout.");
            return;
        }

        var profile = S.profile();

        if (!profile.name || !profile.address || !profile.city || !profile.pin) {
            S.toast("Please add your name and delivery address before checkout.");
            return;
        }

        var message = buildWhatsAppOrderMessage();

        var whatsappUrl =
            "https://wa.me/" +
            WHATSAPP_NUMBER +
            "?text=" +
            encodeURIComponent(message);

        var win = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

        if (!win) {
            window.location.href = whatsappUrl;
        }
    }
    /* ---------- Checkout ---------- */
    function addressBlock() {
        var p = S.profile();
        var parts = [p.address, p.city, p.pin].filter(Boolean).join(", ");
        var box = document.getElementById("checkout-address");
        var placeBtn = document.getElementById("place-order");

        if (!box || !placeBtn) return;

        if (!parts || !p.name) {
            box.innerHTML = '<p class="dialog__warn">Add your name and delivery address first.</p>' +
                '<a class="btn btn--ghost" href="account.html#profile">Go to my account</a>';
            placeBtn.disabled = true;
            return;
        }
        box.innerHTML = "<p><strong>" + S.esc(p.name) + "</strong></p>" +
            "<p>" + S.esc(parts) + "</p>" +
            (p.phone ? "<p>" + S.esc(p.phone) + "</p>" : "") +
            '<a class="dialog__edit" href="account.html#profile">Change</a>';
        placeBtn.disabled = false;
    }

    var checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", function() {
            if (!S.cart().length) return;
            addressBlock();
            var totalEl = document.getElementById("checkout-total");
            if (totalEl) totalEl.textContent = S.money(S.cartTotal());
            if (dialog) {
                if (typeof dialog.showModal === "function") dialog.showModal();
                else dialog.setAttribute("open", "");
            }
        });
    }

    var cancelBtn = document.getElementById("checkout-cancel");
    if (cancelBtn && dialog) {
        cancelBtn.addEventListener("click", function() {
            dialog.close();
        });
    }

    var checkoutForm = document.getElementById("checkout-form");
    if (checkoutForm) {
        checkoutForm.addEventListener("submit", function(e) {
            e.preventDefault();
            var p = S.profile();
            var items = S.cart();
            if (!items.length) return;

            // Use your detailed message builder function directly
            var message = buildWhatsAppOrderMessage();

            var addressInfo = {
                name: p.name,
                phone: p.phone,
                email: p.email,
                line: [p.address, p.city, p.pin].filter(Boolean).join(", "),
            };

            // Generate WhatsApp URL using the detailed message
            var whatsappNumber = "917028795655"; // Your business number
            var url = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message);

            // Save order and clear cart locally
            S.placeOrder(addressInfo);

            // Transform checkout dialog into the WhatsApp button link
            if (dialog) {
                var dialogContent = dialog.querySelector(".dialog__content") || dialog;
                dialogContent.innerHTML =
                    '<div style="text-align: center; padding: 20px;">' +
                    '<h2>Order Saved Successfully! 🎉</h2>' +
                    '<p style="margin: 15px 0;">Click the button below to send your order details directly to WhatsApp:</p>' +
                    '<a href="' + url + '" target="_blank" class="btn" style="display: inline-block; background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Send Order on WhatsApp</a>' +
                    '<p style="margin-top: 20px;"><a href="index.html" style="color: inherit; text-decoration: underline;">Return to Home</a></p>' +
                    '</div>';

                if (typeof dialog.showModal === "function" && !dialog.open) {
                    dialog.showModal();
                } else {
                    dialog.setAttribute("open", "");
                }
            } else {
                window.location.href = url;
            }

            render();
        });
    }
    render();
})();