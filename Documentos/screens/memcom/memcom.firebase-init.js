(function(window){
    "use strict";
    window.MEMCOM = window.MEMCOM || {};
    window.MEMCOM.firebase = { enabled: false, db: null };

    var firebaseConfig = {
        apiKey: "AlzaSyCaHf1C0BBOXH3BDZ10-UDAsPmLTjsZLA",
        authDomain: "utet-4387a.firebaseapp.com",
        projectId: "utet-4387a",
        storageBucket: "utet-4387a.firebasestorage.app",
        messagingSenderId: "902848131454",
        appId: "1:902848131454:web:47f515eb6480834724c32f"
    };

    try {
        if (!window.firebase || !window.firebase.initializeApp) return;
        var app = window.firebase.apps.length === 0 ? window.firebase.initializeApp(firebaseConfig) : window.firebase.apps[0];
        window.MEMCOM.firebase.db = window.firebase.firestore(app);
        window.MEMCOM.firebase.enabled = true;
        console.log("MEMCOM Firebase conectado.");
    } catch(err) {
        console.error("MEMCOM Firebase Error:", err);
    }
})(window);