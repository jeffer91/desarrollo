(function(window) {
    "use strict";

    window.MEMCOM = window.MEMCOM || {};

    var STORAGE_KEY = "MEMCOM_SEQUENCE_MONTHLY_V1";

    function pad2(n) {
        n = parseInt(n, 10);

        if (isNaN(n) || n < 1) {
            return "01";
        }

        return n < 10 ? "0" + n : String(n);
    }

    function getDateParts(dateValue) {
        var date = dateValue instanceof Date ? dateValue : new Date();

        if (isNaN(date.getTime())) {
            date = new Date();
        }

        var year = date.getFullYear();
        var month = pad2(date.getMonth() + 1);
        var day = pad2(date.getDate());

        return {
            year: year,
            month: month,
            day: day,
            codigoMes: year + "-" + month,
            fechaIso: year + "-" + month + "-" + day
        };
    }

    function getFechaHumana(dateValue) {
        var date = dateValue instanceof Date ? dateValue : new Date();

        if (isNaN(date.getTime())) {
            date = new Date();
        }

        var meses = [
            "enero",
            "febrero",
            "marzo",
            "abril",
            "mayo",
            "junio",
            "julio",
            "agosto",
            "septiembre",
            "octubre",
            "noviembre",
            "diciembre"
        ];

        return date.getDate() + " de " + meses[date.getMonth()] + " de " + date.getFullYear();
    }

    function getEmptyStore() {
        return {
            version: 1,
            months: {},
            issued: []
        };
    }

    function loadStore() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return getEmptyStore();
            }

            var parsed = JSON.parse(raw);

            if (!parsed || typeof parsed !== "object") {
                return getEmptyStore();
            }

            if (!parsed.months || typeof parsed.months !== "object") {
                parsed.months = {};
            }

            if (!Array.isArray(parsed.issued)) {
                parsed.issued = [];
            }

            parsed.version = parsed.version || 1;

            return parsed;
        } catch (error) {
            console.error("No se pudo leer la secuencia mensual de memorandos:", error);
            return getEmptyStore();
        }
    }

    function saveStore(store) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        } catch (error) {
            console.error("No se pudo guardar la secuencia mensual de memorandos:", error);
        }
    }

    function buildInfo(number, parts, token) {
        var correlativo = pad2(number);
        var codigoMes = parts.codigoMes;

        return {
            correlativo: correlativo,
            numero: correlativo,
            codigoMes: codigoMes,
            codigoCompleto: correlativo + " MEM-ITSQMET-UTET-" + codigoMes,
            fechaIso: parts.fechaIso,
            fechaHumana: getFechaHumana(new Date(parts.fechaIso + "T12:00:00")),
            token: token || null
        };
    }

    function getNextInfo(dateValue) {
        var parts = getDateParts(dateValue);
        var store = loadStore();

        var current = parseInt(store.months[parts.codigoMes] || 0, 10);

        if (isNaN(current) || current < 0) {
            current = 0;
        }

        return buildInfo(current + 1, parts, null);
    }

    function reserve(dateValue) {
        var date = dateValue instanceof Date ? dateValue : new Date();
        var parts = getDateParts(date);
        var store = loadStore();

        var current = parseInt(store.months[parts.codigoMes] || 0, 10);

        if (isNaN(current) || current < 0) {
            current = 0;
        }

        var nextNumber = current + 1;

        store.months[parts.codigoMes] = nextNumber;

        var token = {
            codigoMes: parts.codigoMes,
            numero: nextNumber,
            createdAt: new Date().toISOString()
        };

        store.issued.push({
            codigoMes: parts.codigoMes,
            numero: nextNumber,
            correlativo: pad2(nextNumber),
            fechaIso: parts.fechaIso,
            createdAt: token.createdAt
        });

        saveStore(store);

        return buildInfo(nextNumber, parts, token);
    }

    function release(token) {
        if (!token || !token.codigoMes || !token.numero) {
            return false;
        }

        var store = loadStore();
        var codigoMes = token.codigoMes;
        var numero = parseInt(token.numero, 10);
        var current = parseInt(store.months[codigoMes] || 0, 10);

        if (isNaN(numero) || isNaN(current)) {
            return false;
        }

        if (current === numero) {
            store.months[codigoMes] = Math.max(0, current - 1);

            for (var i = store.issued.length - 1; i >= 0; i--) {
                var item = store.issued[i];

                if (item.codigoMes === codigoMes && parseInt(item.numero, 10) === numero) {
                    store.issued.splice(i, 1);
                    break;
                }
            }

            saveStore(store);
            return true;
        }

        return false;
    }

    function getCurrentMonthStatus(dateValue) {
        var parts = getDateParts(dateValue);
        var store = loadStore();

        var current = parseInt(store.months[parts.codigoMes] || 0, 10);

        if (isNaN(current) || current < 0) {
            current = 0;
        }

        return {
            codigoMes: parts.codigoMes,
            generados: current,
            siguiente: buildInfo(current + 1, parts, null)
        };
    }

    function resetMonth(codigoMes) {
        if (!codigoMes) {
            codigoMes = getDateParts(new Date()).codigoMes;
        }

        var store = loadStore();

        store.months[codigoMes] = 0;

        store.issued = store.issued.filter(function(item) {
            return item.codigoMes !== codigoMes;
        });

        saveStore(store);

        return getCurrentMonthStatus(new Date(codigoMes + "-01T12:00:00"));
    }

    window.MEMCOM.sequence = {
        getNextInfo: getNextInfo,
        reserve: reserve,
        release: release,
        getCurrentMonthStatus: getCurrentMonthStatus,
        resetMonth: resetMonth
    };
})(window);