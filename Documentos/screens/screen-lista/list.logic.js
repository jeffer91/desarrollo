(function(){
  const $grid = document.getElementById("grid");
  const $meta = document.getElementById("meta");
  const $q = document.getElementById("q");
  const $status = document.getElementById("status");

  const state = {
    all: [],
    filtered: []
  };

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function getDocStatus(doc){
    return doc?.route ? "ready" : "pending";
  }

  function matches(doc, query){
    if(!query) return true;
    const q = query.toLowerCase().trim();
    const hay = [
      doc.id, doc.title, doc.description,
      ...(doc.tags || [])
    ].join(" ").toLowerCase();
    return hay.includes(q);
  }

  function filter(){
    const q = $q.value || "";
    const mode = $status.value;

    const next = state.all.filter(d => {
      const st = getDocStatus(d);
      if(mode === "ready" && st !== "ready") return false;
      if(mode === "pending" && st !== "pending") return false;
      return matches(d, q);
    });

    state.filtered = next;
    render();
  }

  function cardHtml(doc){
    const title = escapeHtml(doc.title || "Sin título");
    const desc = escapeHtml(doc.description || "");
    const tags = Array.isArray(doc.tags) ? doc.tags : [];
    const st = getDocStatus(doc);
    const badgeText = st === "ready" ? "Disponible" : "Pendiente";

    const goBtn = doc.route
      ? `<a class="btn" href="${escapeHtml(doc.route)}">Abrir</a>`
      : `<a class="btn ghost" href="#" aria-disabled="true" onclick="return false">No disponible</a>`;

    return `
      <article class="card" aria-label="${title}">
        <div class="cardTop">
          <div>
            <h3 class="title">${title}</h3>
            <p class="desc">${desc}</p>
          </div>
          <div class="badge ${st}">${badgeText}</div>
        </div>

        <div class="tags">
          ${tags.slice(0,6).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>

        <div class="cardActions">
          ${goBtn}
        </div>
      </article>
    `;
  }

  function render(){
    $meta.textContent = `Mostrando ${state.filtered.length} de ${state.all.length}`;
    $grid.innerHTML = state.filtered.map(cardHtml).join("");

    if(state.all.length === 0){
      $meta.textContent = "No se pudo cargar el catálogo de documentos.";
    }
    if(state.filtered.length === 0 && state.all.length > 0){
      $grid.innerHTML = `<div class="hint">No hay resultados con ese filtro.</div>`;
    }
  }

  async function load(){
    try{
      const res = await fetch("../../data/docs.index.json", { cache: "no-store" });
      if(!res.ok) throw new Error("No se pudo leer docs.index.json");
      const json = await res.json();
      state.all = Array.isArray(json.docs) ? json.docs : [];
      state.filtered = [...state.all];
      render();
    }catch(err){
      console.error(err);
      state.all = [];
      state.filtered = [];
      render();
    }
  }

  $q.addEventListener("input", filter);
  $status.addEventListener("change", filter);

  load();
})();
