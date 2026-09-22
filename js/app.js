(function () {
  const WA_NUMBER = "6281219989168";
  const GRAM = 800;
  const grid = document.getElementById("grid");
  const filters = document.getElementById("filters");
  const q = document.getElementById("q");
  const modal = document.getElementById("modal");
  const countEl = document.getElementById("count");
  const cartPanel = document.getElementById("cartPanel");
  const destQ = document.getElementById("destQ");
  const destId = document.getElementById("destId");
  const destList = document.getElementById("destList");
  let cat = "all";
  let query = "";
  let currentId = null;
  let destTimer = null;
  let liveOngkir = null;
  let payTimer = null;
  let lastPayment = null;
  let cart = JSON.parse(localStorage.getItem("atomyCart") || "{}");

  function slugify(name) {
    return String(name).toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function setMeta(title, desc) {
    document.title = title;
    const md = document.querySelector('meta[name="description"]');
    if (md && desc) md.setAttribute("content", desc.slice(0, 160));
    const ogt = document.querySelector('meta[property="og:title"]');
    if (ogt) ogt.setAttribute("content", title);
    const ogd = document.querySelector('meta[property="og:description"]');
    if (ogd && desc) ogd.setAttribute("content", desc.slice(0, 180));
  }
  function injectItemList() {
    const old = document.getElementById("seo-itemlist");
    if (old) old.remove();
    const items = (window.PRODUCTS || []).slice(0, 40).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: "Atomy " + p.name,
      url: "https://katalogatomy.online/?produk=" + slugify(p.name),
      description: p.manfaat
    }));
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "seo-itemlist";
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Katalog produk Atomy Indonesia",
      numberOfItems: (window.PRODUCTS || []).length,
      itemListElement: items
    });
    document.head.appendChild(el);
  }

  function waUrl(text) {
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text);
  }
  function saveCart() {
    localStorage.setItem("atomyCart", JSON.stringify(cart));
    renderCart();
    refreshOngkir();
  }
  function cartQty() {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }
  function rupiah(n) {
    return "Rp " + Math.round(n).toLocaleString("id-ID");
  }
  function weightGram() {
    return Math.max(1000, cartQty() * GRAM);
  }
  function fallbackOngkir() {
    const text = (destQ.value || "").toLowerCase();
    const city = (window.CITIES || []).find((c) => text.indexOf(c.n.toLowerCase()) !== -1);
    if (!city) return null;
    const zone = window.ONGKIR[city.z];
    const kg = Math.max(1, Math.ceil(weightGram() / 1000));
    return { cost: zone.kg * kg, kg: kg, etd: zone.etd, service: "Estimasi", name: zone.label };
  }
  function currentOngkir() {
    return liveOngkir || fallbackOngkir();
  }

  const defaultWa = "Halo, saya lihat katalog Atomy di katalogatomy.online. Saya ingin bertanya tentang produk.";
  document.querySelectorAll("[data-wa]").forEach((el) => {
    el.href = waUrl(defaultWa);
  });

  window.CATS.forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip" + (c.id === "all" ? " active" : "");
    b.textContent = c.label;
    b.onclick = () => {
      cat = c.id;
      document.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      render();
    };
    filters.appendChild(b);
  });

  q.addEventListener("input", () => {
    query = q.value.trim().toLowerCase();
    const url = new URL(location.href);
    if (query) url.searchParams.set("q", q.value.trim());
    else url.searchParams.delete("q");
    history.replaceState(null, "", url.pathname + url.search);
    render();
  });

  function filtered() {
    return window.PRODUCTS.filter((p) => {
      const okCat = cat === "all" || p.cat === cat;
      const blob = (p.name + " " + p.tag + " " + p.manfaat).toLowerCase();
      return okCat && (!query || blob.includes(query));
    });
  }

  function addItem(id) {
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
  }

  function render() {
    const list = filtered();
    countEl.textContent = list.length;
    if (!list.length) {
      grid.innerHTML = '<p class="empty">Tidak ada produk yang cocok.</p>';
      return;
    }
    grid.innerHTML = list.map((p) => `
      <article class="card" data-id="${p.id}">
        <div class="thumb"><img src="${p.img}" alt="Atomy ${p.name} — ${p.tag}" loading="lazy"></div>
        <div class="body">
          <div class="tag">${p.tag}</div>
          <h3>${p.name}</h3>
          <p class="excerpt">${p.manfaat}</p>
          <div class="card-actions">
            <span class="more">Detail →</span>
            <button type="button" class="add-mini" data-add="${p.id}">Pesan</button>
          </div>
        </div>
      </article>`).join("");
    grid.querySelectorAll(".card").forEach((el) => {
      el.onclick = () => open(+el.dataset.id);
    });
    grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        addItem(+btn.dataset.add);
        cartPanel.hidden = false;
      };
    });
  }

  function open(id) {
    const p = window.PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    currentId = id;
    document.getElementById("mimg").src = p.img;
    document.getElementById("mimg").alt = p.name;
    document.getElementById("mtag").textContent = p.tag;
    document.getElementById("mname").textContent = p.name;
    document.getElementById("mmanfaat").textContent = p.manfaat;
    document.getElementById("mdosis").textContent = p.dosis;
    const msg = "Halo, saya tertarik dengan produk Atomy " + p.name + " dari katalogatomy.online. Boleh info stok, harga, dan cara pemesanan?";
    document.getElementById("mwa").href = waUrl(msg);
    modal.classList.add("open");
    history.replaceState(null, "", "?produk=" + slugify(p.name));
    setMeta(p.name + " Atomy | Manfaat, Cara Pakai & Dosis", p.manfaat + " " + p.dosis);
  }

  function renderCart() {
    document.getElementById("cartCount").textContent = cartQty();
    const box = document.getElementById("cartItems");
    const ids = Object.keys(cart);
    if (!ids.length) {
      box.innerHTML = '<p class="empty">Keranjang masih kosong. Pilih produk lalu klik Pesan.</p>';
    } else {
      box.innerHTML = ids.map((id) => {
        const p = window.PRODUCTS.find((x) => x.id === +id);
        if (!p) return "";
        return `<div class="cart-row">
          <img src="${p.img}" alt="">
          <div>
            <b>${p.name}</b>
            <div class="qty">
              <button type="button" data-dec="${id}">−</button>
              <span>${cart[id]}</span>
              <button type="button" data-inc="${id}">+</button>
            </div>
          </div>
        </div>`;
      }).join("");
      box.querySelectorAll("[data-inc]").forEach((b) => {
        b.onclick = () => { cart[b.dataset.inc]++; saveCart(); };
      });
      box.querySelectorAll("[data-dec]").forEach((b) => {
        b.onclick = () => {
          const id = b.dataset.dec;
          cart[id]--;
          if (cart[id] <= 0) delete cart[id];
          saveCart();
        };
      });
    }
    paintOngkir();
    paintTotal();
  }

  function productAmount() {
    return Math.max(0, Number(document.getElementById("hargaProduk").value || 0));
  }
  function grandTotal() {
    const info = currentOngkir();
    return productAmount() + (info ? info.cost : 0);
  }
  function paintTotal() {
    const el = document.getElementById("totalBox");
    if (!el) return;
    el.innerHTML = "Total bayar: <strong>" + rupiah(grandTotal()) + "</strong> (produk " +
      rupiah(productAmount()) + " + ongkir " + rupiah((currentOngkir() || {}).cost || 0) + ").";
  }

  function paintOngkir() {
    const ongkirBox = document.getElementById("ongkirBox");
    const info = currentOngkir();
    if (!cartQty()) {
      ongkirBox.textContent = "Tambah produk untuk menghitung ongkir.";
      return;
    }
    if (!destQ.value) {
      ongkirBox.textContent = "Ketik kelurahan tujuan, contoh: Wonokromo Surabaya.";
      return;
    }
    if (!info) {
      ongkirBox.textContent = "Pilih salah satu hasil pencarian alamat di bawah kotak.";
      return;
    }
    const src = liveOngkir ? "RajaOngkir" : "estimasi";
    ongkirBox.innerHTML = "<strong>" + rupiah(info.cost) + "</strong> · " + (info.name || "") +
      " " + (info.service || "") + " · ±" + info.kg + " kg · " + info.etd +
      "<br><small>" + src + " dari " + window.RO.originLabel + ". Harga produk dikonfirmasi penjual.</small>";
    paintTotal();
  }

  async function refreshOngkir() {
    liveOngkir = null;
    paintOngkir();
    if (!cartQty() || !destId.value) return;
    const courier = document.getElementById("kurir").value;
    const kg = Math.max(1, Math.ceil(weightGram() / 1000));
    try {
      const list = await window.RO.cost(destId.value, weightGram(), courier);
      const pick = window.RO.pick(list);
      if (pick) {
        liveOngkir = { cost: pick.cost, kg: kg, etd: pick.etd || "-", service: pick.service, name: pick.name };
      }
    } catch (err) {
      liveOngkir = null;
    }
    paintOngkir();
  }

  document.getElementById("hargaProduk").addEventListener("input", paintTotal);
  document.getElementById("payBtn").onclick = async () => {
    const form = document.getElementById("orderForm");
    if (!form.reportValidity()) return;
    if (!cartQty()) return;
    const total = grandTotal();
    const box = document.getElementById("payBox");
    box.hidden = false;
    if (total < 10000) {
      box.textContent = "Minimum QRIS Rp 10.000. Isi harga produk.";
      return;
    }
    const fd = new FormData(form);
    const items = Object.keys(cart).map((id) => {
      const p = window.PRODUCTS.find((x) => x.id === +id);
      return { name: p.name, quantity: cart[id], price: Math.max(1, Math.round(productAmount() / Math.max(1, cartQty()))) };
    });
    box.textContent = "Membuat QRIS...";
    try {
      const res = await window.PAY.create({
        orderId: "ATMY-" + Date.now(),
        amount: total,
        name: fd.get("nama"),
        phone: fd.get("hp"),
        items: items
      });
      if (!res.data || !res.data.payment_url) {
        box.textContent = (res.meta && res.meta.message) || "Gagal membuat QRIS.";
        return;
      }
      lastPayment = res.data;
      const qr = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(res.data.payment_url);
      box.innerHTML = "<p><strong>" + rupiah(res.data.amount) + "</strong> · " + res.data.status +
        "</p><img alt='QRIS' src='" + qr + "' /><p><a href='" + res.data.payment_url +
        "' target='_blank' rel='noopener'>Buka halaman bayar</a></p><p id='payStatus'>Menunggu pembayaran…</p>";
      if (payTimer) clearInterval(payTimer);
      payTimer = setInterval(async () => {
        try {
          const st = await window.PAY.status(res.data.payment_id);
          const data = st.data || {};
          const el = document.getElementById("payStatus");
          if (el) el.textContent = "Status: " + (data.status || "-");
          if (data.status && data.status !== "PENDING") {
            clearInterval(payTimer);
            lastPayment = data;
          }
        } catch (err) {}
      }, 8000);
    } catch (err) {
      box.textContent = "Browser memblokir API. Izinkan domain di tab Access Komerce, atau kirim lewat WhatsApp.";
    }
  };

  destQ.addEventListener("input", () => {
    destId.value = "";
    liveOngkir = null;
    clearTimeout(destTimer);
    const term = destQ.value.trim();
    if (term.length < 3) {
      destList.innerHTML = "";
      paintOngkir();
      return;
    }
    destTimer = setTimeout(async () => {
      try {
        const rows = await window.RO.search(term);
        destList.innerHTML = rows.map((row) =>
          '<button type="button" class="dest-item" data-id="' + row.id + '">' + row.label + "</button>"
        ).join("") || '<p class="empty">Tidak ketemu. Coba nama kelurahan.</p>';
        destList.querySelectorAll(".dest-item").forEach((btn) => {
          btn.onclick = () => {
            destId.value = btn.dataset.id;
            destQ.value = btn.textContent;
            destList.innerHTML = "";
            refreshOngkir();
          };
        });
      } catch (err) {
        destList.innerHTML = "";
        paintOngkir();
      }
    }, 350);
  });

  document.getElementById("openCart").onclick = () => { cartPanel.hidden = false; };
  document.getElementById("closeCart").onclick = () => { cartPanel.hidden = true; };
  cartPanel.addEventListener("click", (e) => {
    if (e.target === cartPanel) cartPanel.hidden = true;
  });
  document.getElementById("kurir").addEventListener("change", refreshOngkir);

  document.getElementById("madd").onclick = () => {
    if (currentId == null) return;
    addItem(currentId);
    modal.classList.remove("open");
    cartPanel.hidden = false;
  };

  document.getElementById("orderForm").onsubmit = (e) => {
    e.preventDefault();
    if (!cartQty()) return;
    const fd = new FormData(e.target);
    const info = currentOngkir();
    const lines = Object.keys(cart).map((id) => {
      const p = window.PRODUCTS.find((x) => x.id === +id);
      return "- " + p.name + " x " + cart[id];
    });
    const kurir = document.getElementById("kurir").selectedOptions[0].text;
    const msg = [
      "Halo, saya ingin pesan dari katalogatomy.online:",
      "",
      lines.join("\n"),
      "",
      "Nama: " + fd.get("nama"),
      "HP: " + fd.get("hp"),
      "Tujuan: " + fd.get("kota"),
      "Alamat: " + fd.get("alamat"),
      "Kurir: " + kurir + (info && info.service ? " " + info.service : ""),
      info ? ("Ongkir: " + rupiah(info.cost) + " (" + info.kg + " kg, " + info.etd + ")") : "",
      "Harga produk: " + rupiah(productAmount()),
      "Total: " + rupiah(grandTotal()),
      lastPayment ? ("Pembayaran QRIS: " + (lastPayment.status || "PENDING") + " / " + (lastPayment.payment_id || "")) : "",
      "",
      "Mohon konfirmasi stok, total harga, dan cara bayar."
    ].filter(Boolean).join("\n");
    window.open(waUrl(msg), "_blank", "noopener");
  };

  document.getElementById("close").onclick = () => {
    modal.classList.remove("open");
    history.replaceState(null, "", location.pathname + (q.value ? ("?q=" + encodeURIComponent(q.value.trim())) : ""));
    setMeta(
      "Katalog Produk Atomy Indonesia | Manfaat, Cara Pakai & Dosis HemoHIM",
      "Katalog Atomy Indonesia: manfaat, cara pakai, dan dosis HemoHIM, vitamin C Colorfood, noni fermentasi, ginseng merah, omega-3, dan Absolute CellActive."
    );
  };
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      modal.classList.remove("open");
      cartPanel.hidden = true;
    }
  });

  const params = new URLSearchParams(location.search);
  if (params.get("q")) {
    q.value = params.get("q");
    query = q.value.trim().toLowerCase();
  }
  render();
  renderCart();
  injectItemList();
  const want = (params.get("produk") || params.get("p") || "").toLowerCase();
  if (want) {
    const hit = window.PRODUCTS.find((p) => slugify(p.name) === want || String(p.id) === want);
    if (hit) open(hit.id);
  }
})();
