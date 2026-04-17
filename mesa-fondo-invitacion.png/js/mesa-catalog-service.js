/*
=========================================================
Nombre completo: mesa-catalog-service.js
Ruta o ubicación: /js/mesa-catalog-service.js
Función o funciones:
- Mantener el catálogo base de personas.
- Permitir actualizar el catálogo desde JSON si está disponible.
- Detectar tratamiento y género.
- Resolver nombres escritos manualmente o por alias.
=========================================================
*/
"use strict";

(function attachMesaCatalogService(global) {
  let mesaPeopleCatalog = [
    { fullName: "Katherine Cevallos", treatment: "Lcda.", gender: "F", aliases: [] },
    { fullName: "Luis Segovia", treatment: "Mgtr.", gender: "M", aliases: [] },
    { fullName: "León Alberto Tito Calle", treatment: "Dr.", gender: "M", aliases: ["Dr León Tito", "Dr. León Tito", "León Tito"] },
    { fullName: "Martha Giomara Tomalá Damacela", treatment: "Ing.", gender: "F", aliases: ["Martha Tomalá", "Ing. Martha Tomalá"] },
    { fullName: "Alex Alberto León Tito", treatment: "Dr.", gender: "M", aliases: ["Alex León", "Dr. Alex León"] },
    { fullName: "Sebastián Tito", treatment: "Lic.", gender: "M", aliases: ["Sebastian Tito", "Lic. Sebastián Tito"] },
    { fullName: "Jefferson Edgar Villarreal Enríquez", treatment: "MSc.", gender: "M", aliases: ["Jefferson Villarreal", "Jeff Villarreal"] },
    { fullName: "Dario Torres", treatment: "Mgtr.", gender: "M", aliases: [] },
    { fullName: "Juan Carlos Pazmiño", treatment: "Ing.", gender: "M", aliases: [] },
    { fullName: "Javier Tapia", treatment: "Mgtr.", gender: "M", aliases: [] },
    { fullName: "María Barre", treatment: "Lcda.", gender: "F", aliases: ["Maria Barre"] },
    { fullName: "Rodrigo Espinoza", treatment: "Mgtr.", gender: "M", aliases: [] },
    { fullName: "Mayra Molina", treatment: "Lcda.", gender: "F", aliases: [] },
    { fullName: "Sonia Moreno", treatment: "Lcda.", gender: "F", aliases: [] },
    { fullName: "Pamela Vanessa Vizcarra Cueva", treatment: "Dra.", gender: "F", aliases: ["Dra. Vizcarra", "Pamela Vizcarra"] },
    { fullName: "Viviana Matilde Flores Cahueñas", treatment: "Ing.", gender: "F", aliases: ["Viviana Flores"] },
    { fullName: "Wladimir Edmundo Tierra Chávez", treatment: "Ing.", gender: "M", aliases: ["Wladimir Tierra"] },
    { fullName: "Jelens Yacely Tito Lucero", treatment: "Ing.", gender: "F", aliases: ["Jelens Tito"] },
    { fullName: "Johanna Andreina Díaz Valencia", treatment: "Esp.", gender: "F", aliases: ["Johanna Díaz"] },
    { fullName: "Grimaneza del Pilar Villarroel Bosmediano", treatment: "Tecnóloga Superior", gender: "F", aliases: ["Grimaneza Villarroel"] }
  ];

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function sanitizePerson(person) {
    return {
      fullName: String(person.fullName || "").trim(),
      treatment: String(person.treatment || "").trim(),
      gender: String(person.gender || "M").trim().toUpperCase() === "F" ? "F" : "M",
      aliases: Array.isArray(person.aliases) ? person.aliases.filter(Boolean) : []
    };
  }

  function setCatalog(peopleArray) {
    if (!Array.isArray(peopleArray) || !peopleArray.length) {
      return;
    }

    const cleaned = peopleArray
      .map(sanitizePerson)
      .filter((person) => person.fullName);

    if (cleaned.length) {
      mesaPeopleCatalog = cleaned;
    }
  }

  function getAllPeople() {
    return mesaPeopleCatalog
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  }

  function buildFullDisplayName(person) {
    return [person.treatment, person.fullName].filter(Boolean).join(" ").trim();
  }

  function getDefiniteArticle(person) {
    return person.gender === "F" ? "La" : "El";
  }

  function getIndefiniteArticle(person) {
    return person.gender === "F" ? "a la" : "al";
  }

  function getMatchesCandidateSet(person) {
    const set = new Set();
    set.add(normalizeText(person.fullName));
    set.add(normalizeText(buildFullDisplayName(person)));

    (person.aliases || []).forEach((alias) => {
      set.add(normalizeText(alias));
    });

    return Array.from(set);
  }

  function findByName(inputName) {
    const normalizedInput = normalizeText(inputName);
    if (!normalizedInput) {
      return null;
    }

    for (const person of mesaPeopleCatalog) {
      const candidates = getMatchesCandidateSet(person);
      if (candidates.includes(normalizedInput)) {
        return { ...person };
      }
    }

    for (const person of mesaPeopleCatalog) {
      const candidates = getMatchesCandidateSet(person);
      if (candidates.some((candidate) => candidate.includes(normalizedInput) || normalizedInput.includes(candidate))) {
        return { ...person };
      }
    }

    return null;
  }

  function inferPersonFromTypedName(rawText) {
    const clean = String(rawText || "").trim();
    if (!clean) {
      return null;
    }

    const normalized = normalizeText(clean);
    const mappings = [
      { prefix: "dra ", treatment: "Dra.", gender: "F", regex: /^dra\.?\s+/i },
      { prefix: "dr ", treatment: "Dr.", gender: "M", regex: /^dr\.?\s+/i },
      { prefix: "ing ", treatment: "Ing.", gender: "M", regex: /^ing\.?\s+/i },
      { prefix: "lic ", treatment: "Lic.", gender: "M", regex: /^lic\.?\s+/i },
      { prefix: "lcda ", treatment: "Lcda.", gender: "F", regex: /^lcda\.?\s+/i },
      { prefix: "msc ", treatment: "MSc.", gender: "M", regex: /^msc\.?\s+/i },
      { prefix: "mgtr ", treatment: "Mgtr.", gender: "M", regex: /^mgtr\.?\s+/i },
      { prefix: "esp ", treatment: "Esp.", gender: "F", regex: /^esp\.?\s+/i }
    ];

    for (const item of mappings) {
      if (normalized.startsWith(item.prefix)) {
        return {
          fullName: clean.replace(item.regex, "").trim(),
          treatment: item.treatment,
          gender: item.gender,
          aliases: []
        };
      }
    }

    return {
      fullName: clean,
      treatment: "",
      gender: "M",
      aliases: []
    };
  }

  function resolvePerson(rawName) {
    const fromCatalog = findByName(rawName);
    const person = fromCatalog || inferPersonFromTypedName(rawName);

    if (!person) {
      return null;
    }

    return {
      ...person,
      displayName: buildFullDisplayName(person),
      definiteArticle: getDefiniteArticle(person),
      indefiniteArticle: getIndefiniteArticle(person)
    };
  }

  global.MesaCatalogService = {
    normalizeText,
    setCatalog,
    getAllPeople,
    findByName,
    resolvePerson,
    buildFullDisplayName
  };
})(window);