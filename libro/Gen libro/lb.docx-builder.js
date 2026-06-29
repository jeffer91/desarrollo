/* =========================================================
Nombre completo: lb.docx-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.docx-builder.js
Función o funciones:
1. Convertir el borrador interno del libro en un modelo Word ordenado.
2. Aplicar estructura oficial, estilos, tabla de contenidos y secciones.
3. Preparar el contenido para exportación DOCX desde Electron o navegador.
4. Evitar secciones duplicadas en el documento final.
========================================================= */

(function attachLbDocxBuilder(window) {
  "use strict";

  var Styles = window.LibroGenLibroDocxStyles || null;
  var Toc = window.LibroGenLibroDocxToc || null;

  function refresh() {
    Styles = window.LibroGenLibroDocxStyles || Styles;
    Toc = window.LibroGenLibroDocxToc || Toc;
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function paragraph(content, style) {
    return {
      type: "paragraph",
      style: style || "normal",
      content: text(content)
    };
  }

  function heading(content, level) {
    return paragraph(content, level === 1 ? "heading1" : level === 2 ? "heading2" : "heading3");
  }

  function blankLines(total) {
    var items = [];
    for (var i = 0; i < Number(total || 1); i += 1) {
      items.push(paragraph("____________________________________________________________", "normal"));
    }
    return items;
  }

  function table(title, columns, rows) {
    return {
      type: "table",
      style: "table",
      title: text(title),
      columns: asArray(columns),
      rows: asArray(rows)
    };
  }

  function addInitialSections(nodes, bookDraft) {
    asArray(bookDraft && bookDraft.initialSections && bookDraft.initialSections.sections).forEach(function eachSection(section) {
      if (!section || !section.title) return;

      nodes.push(heading(section.title, 1));

      if (section.content) nodes.push(paragraph(section.content, "normal"));
      if (section.description) nodes.push(paragraph(section.description, "normal"));
      if (section.aikenText) nodes.push(paragraph(section.aikenText, "normal"));
    });
  }

  function addUnit(nodes, unit) {
    nodes.push(heading(unit.title, 1));
    nodes.push(heading("Resultado de Aprendizaje", 2));
    nodes.push(paragraph(unit.learningResult, "normal"));

    nodes.push(heading("Contenidos", 2));
    asArray(unit.contentBlock && unit.contentBlock.items).forEach(function eachContent(content) {
      nodes.push(heading(content.title, 3));
      nodes.push(paragraph(content.development, "normal"));
      if (content.suggestedCitation) nodes.push(paragraph("Cita sugerida: " + content.suggestedCitation, "normal"));
    });

    nodes.push(heading("Estrategias de enseñanza-aprendizaje", 2));
    asArray(unit.strategies && unit.strategies.strategies).forEach(function eachStrategy(strategy) {
      nodes.push(paragraph(strategy.title + ": " + strategy.description, "normal"));
      if (strategy.evidence) nodes.push(paragraph("Evidencia: " + strategy.evidence, "normal"));
    });

    nodes.push(heading("Evaluación de Unidad", 2));
    if (unit.evaluation && unit.evaluation.aikenText) nodes.push(paragraph(unit.evaluation.aikenText, "normal"));

    nodes.push(heading("Auto evaluación", 2));
    asArray(unit.selfEvaluation && unit.selfEvaluation.questions).forEach(function eachQuestion(question) {
      nodes.push(paragraph(question.question, "normal"));
      nodes.push.apply(nodes, blankLines(question.answerSpaceLines || 3));
    });

    nodes.push(heading("Reflexiones sobre la Unidad", 2));
    asArray(unit.reflections && unit.reflections.prompts).forEach(function eachPrompt(prompt) {
      nodes.push(paragraph(prompt, "normal"));
    });
    nodes.push.apply(nodes, blankLines(unit.reflections && unit.reflections.blankLines ? unit.reflections.blankLines : 8));
  }

  function addVisualResources(nodes, bookDraft) {
    var visuals = bookDraft && bookDraft.visualResources ? bookDraft.visualResources : null;
    if (!visuals) return;

    nodes.push(heading("Recursos visuales integrados", 1));

    asArray(visuals.tables && visuals.tables.units).forEach(function eachUnit(unit) {
      asArray(unit.tables).forEach(function eachTable(item) {
        nodes.push(table(item.title, item.columns, item.sampleRows));
      });
    });

    asArray(visuals.figures && visuals.figures.units).forEach(function eachUnit(unit) {
      asArray(unit.figures).forEach(function eachFigure(item) {
        nodes.push(paragraph(item.title + ". " + item.description, "caption"));
      });
    });

    asArray(visuals.diagrams && visuals.diagrams.units).forEach(function eachUnit(unit) {
      asArray(unit.diagrams).forEach(function eachDiagram(item) {
        nodes.push(paragraph(item.title + ". " + item.description, "caption"));
        nodes.push(paragraph("Secuencia: " + asArray(item.nodes).map(function mapNode(node) { return node.label; }).join(" → "), "normal"));
      });
    });
  }

  function addReferences(nodes, bookDraft) {
    nodes.push(heading("Referencias Bibliográficas", 1));
    if (bookDraft && bookDraft.references && bookDraft.references.apa7Text) {
      nodes.push(paragraph(bookDraft.references.apa7Text, "normal"));
      return;
    }
    nodes.push(paragraph("Referencias APA 7 pendientes de verificación.", "normal"));
  }

  function addGlossary(nodes, bookDraft) {
    nodes.push(heading("Glosario", 1));
    asArray(bookDraft && bookDraft.glossary && bookDraft.glossary.entries).forEach(function eachEntry(entry) {
      nodes.push(paragraph(entry.term + ": " + entry.definition, "normal"));
    });
  }

  function addAppendix(nodes, bookDraft) {
    if (!bookDraft || !bookDraft.appendix || !bookDraft.appendix.include) return;
    nodes.push(heading("Anexos", 1));
    asArray(bookDraft.appendix.appendixes).forEach(function eachAppendix(item) {
      nodes.push(heading(item.title, 2));
      nodes.push(paragraph(item.reason, "normal"));
    });
  }

  function safeFileName(value) {
    return (text(value) || "libro-asignatura")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9ñ]+/gi, "-")
      .replace(/^-+|-+$/g, "") + ".docx";
  }

  function build(bookDraft) {
    refresh();

    var plan = bookDraft && bookDraft.plan ? bookDraft.plan : {};
    var nodes = [];
    var styles = Styles && typeof Styles.getStyles === "function" ? Styles.getStyles() : {};
    var tocEntries = Toc && typeof Toc.buildEntries === "function" ? Toc.buildEntries(bookDraft) : [];

    nodes.push(paragraph("Tabla de contenidos", "heading1"));
    nodes.push({ type: "toc", entries: tocEntries, instruction: Toc && Toc.buildWordFieldInstruction ? Toc.buildWordFieldInstruction() : "TOC" });

    addInitialSections(nodes, bookDraft);
    asArray(bookDraft && bookDraft.units && bookDraft.units.units).forEach(function eachUnit(unit) {
      addUnit(nodes, unit);
    });
    addVisualResources(nodes, bookDraft);
    addReferences(nodes, bookDraft);
    addGlossary(nodes, bookDraft);
    addAppendix(nodes, bookDraft);

    return {
      id: "docx-model",
      title: plan.materia ? "Libro de asignatura - " + plan.materia : "Libro de asignatura",
      fileName: safeFileName(plan.materia),
      styles: styles,
      nodes: nodes,
      meta: {
        carrera: plan.carrera || "",
        materia: plan.materia || "",
        createdAt: new Date().toISOString(),
        wordCompatibleToc: true,
        font: "Candara 14"
      }
    };
  }

  window.LibroGenLibroDocxBuilder = {
    build: build,
    paragraph: paragraph,
    heading: heading,
    table: table
  };
})(window);
