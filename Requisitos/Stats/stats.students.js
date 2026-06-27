/* =========================================================
Nombre completo: stats.students.js
Ruta o ubicación: /Requisitos/Stats/stats.students.js
Función o funciones:
- Renderizar tabla de estudiantes para Stats.
- Mostrar Nombre, Cédula, Carrera y Estado.
- Permitir búsqueda por nombre y cédula.
- Mostrar "Aprobado" cuando cumple los requisitos aplicables.
- Mostrar en rojo los requisitos que no cumple.
- Preparar tablas con atributos para ordenamiento por encabezados.
Con qué se conecta:
- stats.html
- stats.css
- stats.core.js
- stats.app.js
- stats.tables.js
========================================================= */
(function(window,document){
  "use strict";

  function text(value){return String(value==null?"":value).trim();}
  function el(id){return document.getElementById(id);}
  function esc(value){return text(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function lower(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es");}

  function empty(message){return '<div class="empty">'+esc(message||"Sin estudiantes para mostrar.")+'</div>';}
  function studentName(row){return text(row&&row._nombres)||text(row&&row.nombres)||text(row&&row.Nombres)||text(row&&row.nombre)||text(row&&row.Nombre)||text(row&&row.estudiante)||text(row&&row.Estudiante)||"Sin nombre";}
  function studentId(row){return text(row&&row._cedula)||text(row&&row.cedula)||text(row&&row.Cedula)||text(row&&row.numeroIdentificacion)||text(row&&row.numeroidentificacion)||text(row&&row.identificacion)||"";}
  function studentCareer(row){return text(row&&row._carrera)||text(row&&row.nombrecarrera)||text(row&&row.nombreCarrera)||text(row&&row.NombreCarrera)||text(row&&row.carrera)||"SIN CARRERA";}

  function requirementLabels(list){return (list||[]).map(function(item){return {key:text(item&&item.key),label:text(item&&item.label)||text(item&&item.key)};}).filter(function(item){return !!item.label;});}
  function missingFromRow(row){if(row&&row._estado&&Array.isArray(row._estado.missingRequirements))return requirementLabels(row._estado.missingRequirements);if(row&&row._approval&&Array.isArray(row._approval.missingRequirements))return requirementLabels(row._approval.missingRequirements);if(window.StatsRules&&typeof window.StatsRules.missingRequirements==="function")return requirementLabels(window.StatsRules.missingRequirements(row));return [];}

  function statusHtml(row){
    var selected=row&&row._selectedRequirementStatus;
    if(selected){
      if(selected.status==="no_aplica")return '<span class="student-status-na">'+esc(selected.labelStatus||"No aplica")+'</span>';
      if(selected.cumple)return '<span class="student-status-ok">Cumple</span>';
      return '<span class="student-status-bad">'+esc(selected.label||"No cumple")+'</span>';
    }
    var approved=!!(row&&row._estado&&row._estado.id==="cumple");
    if(approved)return '<span class="student-status-ok">Aprobado</span>';
    var missing=missingFromRow(row);
    if(!missing.length)return '<span class="student-status-bad">No cumple</span>';
    return '<div class="student-missing-list">'+missing.map(function(item){return '<span class="student-missing" data-key="'+esc(item.key)+'">'+esc(item.label)+'</span>';}).join(' ')+'</div>';
  }

  function statusSortValue(row){
    var selected=row&&row._selectedRequirementStatus;
    if(selected){if(selected.status==="no_aplica")return "2-no-aplica";return selected.cumple?"1-cumple":"0-no-cumple";}
    var missing=missingFromRow(row).length;
    if(row&&row._estado&&row._estado.id==="cumple")return "999-aprobado";
    return String(missing).padStart(3,"0")+"-faltantes";
  }

  function normalizeRows(data){
    if(!data)return [];
    if(data.selectedRequirement&&Array.isArray(data.selectedRequirement.rows))return data.selectedRequirement.rows;
    if(Array.isArray(data.estudiantes))return data.estudiantes;
    if(Array.isArray(data.rows))return data.rows;
    return [];
  }

  function filterRows(rows,search){
    search=lower(search);
    if(!search)return rows;
    return (rows||[]).filter(function(row){
      return lower(studentName(row)).indexOf(search)>=0||lower(studentId(row)).indexOf(search)>=0;
    });
  }

  function rowHtml(row){
    var name=studentName(row),id=studentId(row),career=studentCareer(row);
    return '<tr>'
      + '<td data-sort="'+esc(lower(name))+'"><strong>'+esc(name)+'</strong></td>'
      + '<td data-sort="'+esc(id)+'">'+esc(id)+'</td>'
      + '<td data-sort="'+esc(lower(career))+'">'+esc(career)+'</td>'
      + '<td data-sort="'+esc(statusSortValue(row))+'">'+statusHtml(row)+'</td>'
      + '</tr>';
  }

  function tableHtml(rows){
    if(!rows.length)return empty("Sin estudiantes para los filtros seleccionados.");
    return '<table class="stats-sortable-table stats-students-table" data-sortable="true">'
      + '<thead><tr><th data-sort-type="text">Nombre</th><th data-sort-type="text">Cédula</th><th data-sort-type="text">Carrera</th><th data-sort-type="text">Estado</th></tr></thead>'
      + '<tbody>'+rows.map(rowHtml).join("")+'</tbody>'
      + '</table>';
  }

  function render(data,targetId,options){
    var target=el(targetId||"stats-estudiantes");
    var meta=el("stats-estudiantes-meta");
    if(!target)return;
    options=options||{};
    var allRows=normalizeRows(data);
    var search=options.search!==undefined?options.search:(data&&data.studentSearch);
    var rows=filterRows(allRows,search);
    target.innerHTML=tableHtml(rows);
    if(meta)meta.textContent=search?rows.length+" de "+allRows.length+" estudiantes":rows.length+" estudiantes";
    if(window.StatsTables&&typeof window.StatsTables.bindAll==="function")window.StatsTables.bindAll(target);
  }

  window.StatsStudents={render:render,tableHtml:tableHtml,normalizeRows:normalizeRows,filterRows:filterRows,helpers:{studentName:studentName,studentId:studentId,studentCareer:studentCareer,missingFromRow:missingFromRow,statusHtml:statusHtml,statusSortValue:statusSortValue}};
})(window,document);
