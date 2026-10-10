(function () {
  "use strict";
  var S = window.Ishavarya;

  var panels = ["profile", "orders", "wishlist"];
  var form = document.getElementById("profile-form");
  var status = document.getElementById("profile-status");

  /* ---------- Panels (hash based) ---------- */
  function show(name) {
    if (panels.indexOf(name) === -1) name = "profile";
    panels.forEach(function (p) {
      document.getElementById(p).hidden = p !== name;
    });
    document.querySelectorAll(".account__menu a[data-panel]").forEach(function (a) {
      var on = a.dataset.panel === name;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (name === "orders") renderOrders();
    if (name === "wishlist") renderWishlist();
  }
  function fromHash() { show(location.hash.replace("#", "")); }
  window.addEventListener("hashchange", fromHash);

  /* ---------- Profile ---------- */
  function fillForm() {
    var p = S.profile();
    Object.keys(p).forEach(function (k) {
      if (form.elements[k]) form.elements[k].value = p[k];
    });
    updateHeader(p);
  }
  function updateHeader(p) {
    var name = (p.name || "").trim();
    document.getElementById("who-name").textContent = name || "Guest";
    document.getElementById("who-sub").textContent = p.email || p.phone || "Add your details";
    document.getElementById("avatar").textContent = name ? name.charAt(0).toUpperCase() : "?";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {};
    ["name", "phone", "email", "address", "city", "pin"].forEach(function (k) {
      data[k] = form.elements[k].value.trim();
    });

    var problem = "";
    if (!data.name) problem = "Please enter your name.";
    else if (data.phone && !/^[+()\d\s-]{10,15}$/.test(data.phone)) problem = "Enter a valid mobile number.";
    else if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) problem = "Enter a valid email address.";
    else if (data.pin && !/^\d{6}$/.test(data.pin)) problem = "PIN code must be 6 digits.";

    status.classList.toggle("is-error", !!problem);
    if (problem) { status.textContent = problem; return; }

    S.saveProfile(data);
    updateHeader(data);
    status.textContent = "Details saved.";
    setTimeout(function () { status.textContent = ""; }, 2500);
  });

  /* ---------- Orders ---------- */
  function renderOrders() {
    var box = document.getElementById("orders-list");
    var orders = S.orders();
    if (!orders.length) {
      box.innerHTML = '<div class="empty"><p class="empty__title">No orders yet</p>' +
        "<p>Your placed orders will show up here.</p>" +
        '<a class="btn" href="index.html#products">Start shopping</a></div>';
      return;
    }
    box.innerHTML = orders.map(function (o) {
      var date = new Date(o.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      return '<article class="order">' +
        '<header class="order__head">' +
          "<div><p class=\"order__id\">Order " + S.esc(o.id) + "</p><p class=\"order__date\">" + S.esc(date) + "</p></div>" +
          '<span class="order__status">' + S.esc(o.status) + "</span>" +
        "</header>" +
        '<ul class="order__items">' + o.items.map(function (i) {
          return "<li><span>" + S.esc(i.name) + " &times; " + i.qty + "</span><span>" + S.money(i.price * i.qty) + "</span></li>";
        }).join("") + "</ul>" +
        '<footer class="order__foot"><span>Total</span><strong>' + S.money(o.total) + "</strong></footer>" +
        (o.address && o.address.line ? '<p class="order__addr">Deliver to: ' + S.esc(o.address.line) + "</p>" : "") +
      "</article>";
    }).join("");
  }

  /* ---------- Wishlist ---------- */
  function renderWishlist() {
    var box = document.getElementById("wishlist-list");
    var items = S.wishlist();
    if (!items.length) {
      box.innerHTML = '<div class="empty"><p class="empty__title">Your wishlist is empty</p>' +
        "<p>Tap the heart on any product to save it here.</p>" +
        '<a class="btn" href="index.html#products">Browse products</a></div>';
      return;
    }
    box.innerHTML = '<ul class="wish">' + items.map(function (i) {
      return '<li class="wish__item" data-id="' + S.esc(i.id) + '">' +
        '<div class="wish__img">' + (i.img ? '<img src="' + S.esc(i.img) + '" alt="" onerror="this.remove()" />' : "") + "</div>" +
        '<div class="wish__info"><h3>' + S.esc(i.name) + '</h3><p class="wish__hi">' + S.esc(i.hi || "") + "</p><p>" + S.money(i.price) + "</p></div>" +
        '<div class="wish__actions">' +
          '<button type="button" class="btn btn--small" data-add>Add to bag</button>' +
          '<button type="button" class="btn btn--small btn--ghost" data-remove>Remove</button>' +
        "</div></li>";
    }).join("") + "</ul>";
  }

  document.getElementById("wishlist-list").addEventListener("click", function (e) {
    var li = e.target.closest(".wish__item");
    if (!li) return;
    var id = li.dataset.id;
    var item = S.wishlist().filter(function (i) { return i.id === id; })[0];
    if (!item) return;
    if (e.target.closest("[data-add]")) {
      S.addToCart(item);
      S.toast(item.name + " added to bag");
    } else if (e.target.closest("[data-remove]")) {
      S.removeWish(id);
      renderWishlist();
    }
  });

  /* ---------- Logout ---------- */
  document.getElementById("logout").addEventListener("click", function () {
    if (!confirm("Log out? Your saved profile details will be removed from this browser.")) return;
    S.clearProfile();
    location.href = "index.html";
  });

  fillForm();
  fromHash();
})();
