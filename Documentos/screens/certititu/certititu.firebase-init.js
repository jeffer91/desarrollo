(function(window){
    "use strict";

    // Namespace
    window.CERTITITU = window.CERTITITU || {};
    window.CERTITITU.firebase = {
        enabled: false,
        db: null,
        reason: ""
    };

    // Configuración REAL tomada de ficha-firebase-init.js 
    var firebaseConfig = {
        apiKey: "AlzaSyCaHf1C0BBOXH3BDZ10-UDAsPmLTjsZLA",
        authDomain: "utet-4387a.firebaseapp.com",
        projectId: "utet-4387a",
        storageBucket: "utet-4387a.firebasestorage.app",
        messagingSenderId: "902848131454",
        appId: "1:902848131454:web:47f515eb6480834724c32f"
    };

    try {
        if (!window.firebase || !window.firebase.initializeApp) {
            window.CERTITITU.firebase.reason = "Librería Firebase no cargada en index.html";
            console.error(window.CERTITITU.firebase.reason);
            return;
        }

        // Inicializar o reutilizar app
        var app;
        if (window.firebase.apps.length === 0) {
            app = window.firebase.initializeApp(firebaseConfig);
            console.log("[CertitituFirebase] Inicializado correctamente.");
        } else {
            app = window.firebase.apps[0]; // Reutilizar la existente (si Ficha ya la cargó)
            console.log("[CertitituFirebase] Reutilizando app existente.");
        }

        // Inicializar Firestore
        var db = window.firebase.firestore(app);
        
        window.CERTITITU.firebase.enabled = true;
        window.CERTITITU.firebase.db = db;
        window.CERTITITU.firebase.reason = "Conectado a UTET-4387a";

    } catch(err) {
        console.error(err);
        window.CERTITITU.firebase.reason = "Error inicializando: " + err.message;
    }

})(window);