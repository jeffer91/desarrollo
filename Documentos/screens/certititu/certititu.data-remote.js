(function(window) {
    "use strict";

    window.CERTITITU = window.CERTITITU || {};
    
    // --- HELPERS DE FORMATO (Portados de Ficha) ---

    function pad2(n) {
        var s = (n || "").toString();
        return s.length < 2 ? "0" + s : s;
    }

    function mesNombreES(mm) {
        var m = pad2(mm);
        var map = {
            "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
            "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
            "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
        };
        return map[m] || null;
    }

    // Convierte "2025-06_2025-12" -> "Junio 2025 a Diciembre 2025"
    function periodoCodigoAHumano(periodoCodigo) {
        if (!periodoCodigo) return "";
        var p = periodoCodigo.toString().trim();
        
        // Regex ajustado para soportar con o sin guiones (YYYY-MM o YYYYMM)
        // Soporta: 202506_202512 y 2025-06_2025-12
        var m = /^(\d{4})-?(\d{2})_(\d{4})-?(\d{2})$/.exec(p);
        
        if (!m) return p; // Si no coincide, devuelve el original
        
        var y1 = m[1], mm1 = m[2];
        var y2 = m[3], mm2 = m[4];
        
        var mes1 = mesNombreES(mm1);
        var mes2 = mesNombreES(mm2);
        
        if (!mes1 || !mes2) return p;
        
        return mes1 + " " + y1 + " a " + mes2 + " " + y2;
    }

    function pick(data, keys, fallback) {
        if (!data) return fallback;
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (data[k] !== undefined && data[k] !== null && data[k] !== "") {
                return data[k];
            }
        }
        return fallback;
    }

    // --- LÓGICA PRINCIPAL ---

    function mapDocToCertititu(doc) {
        var data = doc.data() || {};
        var id = doc.id;

        var periodoId = pick(data, ["periodoId", "periodoid"], "");
        var ultimoPeriodoId = pick(data, ["ultimoPeriodoId", "ultimoperiodoid"], "");
        var periodoAsignado = pick(data, ["periodoAsignado", "periodoasignado"], "");
        
        var periodoUsado = periodoId || ultimoPeriodoId || periodoAsignado || "SIN_PERIODO";
        
        // Intentamos obtener el label guardado, si no, lo generamos
        var rawLabel = pick(data, ["periodoLabel", "periodolabel", "periodoHuman"], "");
        var periodoLabel = rawLabel || periodoCodigoAHumano(periodoUsado);

        // Si el label sigue siendo igual al ID (porque falló la conversión o no había label), reintentamos forzar conversión
        if (periodoLabel === periodoUsado) {
            periodoLabel = periodoCodigoAHumano(periodoUsado);
        }

        return {
            id: id,
            cedula: pick(data, ["numeroldentificacion", "numeroIdentificacion", "cedula", "Cedula"], "S/N"),
            nombre: pick(data, ["Nombres", "nombres", "NombreCompleto", "nombre"], "NOMBRE DESCONOCIDO"),
            carrera: pick(data, ["NombreCarrera", "nombrecarrera", "carrera"], "TITULACIÓN"),

            // Campos adicionales para el certificado (evita que queden vacíos en plantilla/PDF)
            modalidad: pick(data, ["Modalidad", "modalidad"], ""),
            jornada: pick(data, ["Jornada", "jornada"], ""),
            tituloObtenido: pick(data, ["TituloObtenido", "tituloObtenido", "titulo"], ""),
            ciudad: pick(data, ["Ciudad", "ciudad"], "Quito"),

            periodoId: periodoUsado,
            periodoLabel: periodoLabel
        };
    }

    function extractPeriodosFromStudents(students) {
        var map = {};
        students.forEach(function(s) {
            if (s.periodoId && s.periodoId !== "SIN_PERIODO") {
                // Preferimos el label más largo (generalmente el humano)
                if (!map[s.periodoId] || s.periodoLabel.length > map[s.periodoId].length) {
                    map[s.periodoId] = s.periodoLabel;
                }
            }
        });

        // Ordenar descendente (más reciente primero)
        return Object.keys(map).sort().reverse().map(function(key) {
            return {
                value: key,
                label: map[key] // Aquí ya irá el texto bonito
            };
        });
    }

    const demo = {
        periodos: [{ value: "DEMO", label: "Periodo Demo" }],
        estudiantes: []
    };

    async function loadFromFirestore() {
        var fb = window.CERTITITU.firebase;
        if (!fb || !fb.enabled || !fb.db) return null;

        console.log("Cargando estudiantes...");
        var snapshot = await fb.db.collection("Estudiantes").limit(800).get();
        
        var estudiantes = snapshot.docs.map(mapDocToCertititu);
        var periodos = extractPeriodosFromStudents(estudiantes);

        return { periodos: periodos, estudiantes: estudiantes };
    }

    window.CERTITITU.data = {
        getAll: async function() {
            try {
                var live = await loadFromFirestore();
                return live || demo;
            } catch (err) {
                console.error(err);
                return demo;
            }
        }
    };
})(window);