(function(window) {
    "use strict";
    window.MEMCOM = window.MEMCOM || {};
    
    // --- Helpers ---
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    
    function mesNombreES(mm) {
        // Aseguramos que sea string y tenga 2 dígitos
        var mStr = pad2(parseInt(mm));
        var map = { "01":"Enero", "02":"Febrero", "03":"Marzo", "04":"Abril", "05":"Mayo", "06":"Junio", "07":"Julio", "08":"Agosto", "09":"Septiembre", "10":"Octubre", "11":"Noviembre", "12":"Diciembre" };
        return map[mStr] || null;
    }

    // Lógica robusta de conversión
    function periodoCodigoAHumano(p) {
        if (!p) return "";
        var s = p.trim();

        // 1. Si ya tiene la palabra " a " o " A ", asumimos que ya es humano
        if (s.toLowerCase().includes(" a ") && s.length > 15) return s;

        // 2. Regex Tolerante: Busca YYYY (sep) MM (sep) YYYY (sep) MM
        // Captura: Año1, Mes1, Año2, Mes2. Ignora los separadores intermedios (_, -, /)
        var m = /^(\d{4})\D+(\d{1,2})\D+(\d{4})\D+(\d{1,2})$/.exec(s);
        
        if (m) {
            var y1 = m[1];
            var m1 = mesNombreES(m[2]);
            var y2 = m[3];
            var m2 = mesNombreES(m[4]);
            
            if (m1 && m2) {
                return m1 + " " + y1 + " a " + m2 + " " + y2;
            }
        }
        
        return s; // Fallback si no coincide con nada
    }

    // --- Lógica de Mapeo ---
    function mapDocToPeriodo(doc) {
        var d = doc.data() || {};
        var pid = d.periodoId || d.periodoid || d.periodoAsignado || "";
        
        // Prioridad: 
        // 1. Label guardado en BD
        // 2. Traducción del ID
        // 3. ID crudo
        var plabel = d.periodoLabel || "";
        
        if (!plabel && pid) {
            plabel = periodoCodigoAHumano(pid);
        } else if (plabel) {
            // A veces el label guardado también es un código, intentamos limpiarlo
            plabel = periodoCodigoAHumano(plabel);
        }
        
        return { id: pid, label: plabel || pid };
    }

    function extractPeriodos(students) {
        var map = {};
        students.forEach(s => {
            if(s.id && s.id !== "SIN_PERIODO") {
                // Si ya tenemos uno guardado, nos quedamos con el más largo (generalmente el humano)
                if (!map[s.id] || s.label.length > map[s.id].length) {
                    map[s.id] = s.label;
                }
            }
        });
        
        // Retornamos array
        return Object.keys(map).sort().reverse().map(k => ({ value: k, label: map[k] }));
    }

    const demo = { periodos: [{ value: "2025-04_2026-01", label: "Abril 2025 a Enero 2026 (Demo)" }] };

    async function load() {
        var fb = window.MEMCOM.firebase;
        if (!fb || !fb.enabled || !fb.db) return null;
        
        var snap = await fb.db.collection("Estudiantes").limit(500).get();
        var raw = snap.docs.map(mapDocToPeriodo);
        var periodos = extractPeriodos(raw);
        return { periodos: periodos };
    }

    window.MEMCOM.data = {
        getAll: async function() {
            try {
                var live = await load();
                return live || demo;
            } catch (err) {
                console.error(err);
                return demo;
            }
        }
    };
})(window);