/*
=========================================================
Nombre completo: coordi-mensajes.js
Ruta o ubicación: /Coordi/coordi-mensajes.js
Función o funciones:
1. Construir mensajes para WhatsApp de responsables.
2. Construir correos copiables para responsables.
3. Construir mensajes de Telegram para coordinadores.
4. Incluir siempre período, división, requisito y total.
5. Usar saludo correcto: Estimada / Estimado.
=========================================================
*/
(function (window) {
 "use strict";

 var Logic = window.CoordiLogic;

 var TREATMENT_BY_PERSON_KEY = {
 "martha tomala": "Estimada",
 "leidy salinas": "Estimada",
 "paulina araujo": "Estimada",
 "alejandra hernandez": "Estimada",
 "veronica ayala": "Estimada",
 "yesenia ortega": "Estimada",
 "ana emilia guzman": "Estimada",
 "katherine chamba": "Estimada",
 "maria eugenio barre": "Estimada",
 "mayra molina": "Estimada",
 "andrea moreano": "Estimada",
 "sonia moreno": "Estimada",

 "dario torres": "Estimado",
 "javier tapia": "Estimado",
 "juan carlos pazmino": "Estimado",
 "rodrigo espinoza": "Estimado",
 "amado chiluisa": "Estimado"
 };

 var FEMALE_FIRST_NAMES = {
 martha: true,
 leidy: true,
 paulina: true,
 alejandra: true,
 veronica: true,
 yesenia: true,
 ana: true,
 katherine: true,
 maria: true,
 mayra: true,
 andrea: true,
 sonia: true
 };

 var MALE_FIRST_NAMES = {
 dario: true,
 javier: true,
 juan: true,
 rodrigo: true,
 amado: true
 };

 function asText(value) {
 return String(value == null ? "" : value).trim();
 }

 function encode(value) {
 return encodeURIComponent(asText(value));
 }

 function cleanTelegramHandle(value) {
 return asText(value).replace(/^@+/, "");
 }

 function normalizeForTreatment(value) {
 return asText(value)
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .toLowerCase()
 .replace(/[^a-z0-9ñ\s]/g, " ")
 .replace(/\s+/g, " ")
 .trim();
 }

 function stripTitles(value) {
 var text = normalizeForTreatment(value);
 return text
 .replace(/\b(ing|ingeniera|ingeniero|srta|senorita|sra|senora|sr|senor|tnlg|tnlga|tecnologa|tecnologo|mgt|msc|magister|dra|doctora|dr|doctor|licda|lcda|licdo|lcdo|lic)\b/g, " ")
 .replace(/\s+/g, " ")
 .trim();
 }

 function hasWord(text, word) {
 return (" " + normalizeForTreatment(text) + " ").indexOf(" " + word + " ") >= 0;
 }

 function getFirstName(value) {
 var clean = stripTitles(value);
 return clean.split(" ")[0] || "";
 }

 function detectTreatment(value) {
 var original = asText(value);
 var personKey = stripTitles(original);
 var firstName = getFirstName(original);

 if (TREATMENT_BY_PERSON_KEY[personKey]) {
 return TREATMENT_BY_PERSON_KEY[personKey];
 }

 if (
 hasWord(original, "srta") ||
 hasWord(original, "senorita") ||
 hasWord(original, "sra") ||
 hasWord(original, "senora") ||
 hasWord(original, "dra") ||
 hasWord(original, "doctora") ||
 hasWord(original, "licda") ||
 hasWord(original, "lcda") ||
 hasWord(original, "tnlga") ||
 hasWord(original, "tecnologa")
 ) {
 return "Estimada";
 }

 if (
 hasWord(original, "sr") ||
 hasWord(original, "senor") ||
 hasWord(original, "dr") ||
 hasWord(original, "doctor") ||
 hasWord(original, "licdo") ||
 hasWord(original, "lcdo") ||
 hasWord(original, "tecnologo")
 ) {
 return "Estimado";
 }

 if (FEMALE_FIRST_NAMES[firstName]) {
 return "Estimada";
 }

 if (MALE_FIRST_NAMES[firstName]) {
 return "Estimado";
 }

 return "Estimado";
 }

 function buildTreatment(value, ending) {
 var name = asText(value);
 var treatment = detectTreatment(name);
 return treatment + (name ? " " + name : "") + asText(ending);
 }

 function formatStudentLine(student, index) {
 return [
 index + 1 + ".",
 asText(student.nombre),
 "- C.I.: " + asText(student.cedula),
 "- Carrera: " + asText(student.carrera)
 ].join(" ");
 }

 function formatStudentLines(rows) {
 var list = Array.isArray(rows) ? rows : [];

 if (!list.length) {
 return "No se registran estudiantes pendientes con los filtros seleccionados.";
 }

 return list.map(formatStudentLine).join("\n");
 }

 function getDivisionLabel(context) {
 return asText(context && context.divisionLabel) || "Todo el período";
 }

 function buildResponsibleWhatsapp(context) {
 var ctx = context || {};
 var responsible = ctx.responsible || {};
 var requirement = ctx.requirement || {};
 var rows = Array.isArray(ctx.rows) ? ctx.rows : [];

 return [
 buildTreatment(responsible.nombre, ", buen día."),
 "",
 "Por favor su ayuda con la revisión de los estudiantes que registran pendiente el requisito correspondiente a su área.",
 "",
 "Período: " + asText(ctx.periodLabel),
 "División: " + getDivisionLabel(ctx),
 "Requisito pendiente: " + asText(requirement.label),
 "Total de estudiantes pendientes: " + rows.length,
 "",
 "Detalle:",
 formatStudentLines(rows),
 "",
 "Agradezco su gentil apoyo para la gestión correspondiente.",
 "",
 "Saludos cordiales,",
 "Msc. Jefferson Villarreal",
 "Coordinador de Titulación"
 ].join("\n");
 }

 function buildResponsibleEmail(context) {
 var ctx = context || {};
 var responsible = ctx.responsible || {};
 var requirement = ctx.requirement || {};
 var rows = Array.isArray(ctx.rows) ? ctx.rows : [];

 var subject = [
 "Estudiantes pendientes de requisito",
 asText(requirement.label),
 "-",
 asText(ctx.periodLabel)
 ].join(" ");

 var body = [
 buildTreatment(responsible.nombre, ":"),
 "",
 "Reciba un cordial saludo.",
 "",
 "Por medio del presente, se remite el listado de estudiantes que aún registran pendiente el cumplimiento del requisito correspondiente a su área.",
 "",
 "Período: " + asText(ctx.periodLabel),
 "División: " + getDivisionLabel(ctx),
 "Requisito pendiente: " + asText(requirement.label),
 "Total de estudiantes pendientes: " + rows.length,
 "",
 "Detalle de estudiantes:",
 "",
 formatStudentLines(rows),
 "",
 "Agradezco su gentil ayuda con la revisión y gestión correspondiente, con la finalidad de que los estudiantes puedan completar sus requisitos dentro de los tiempos establecidos para el proceso de titulación.",
 "",
 "Saludos cordiales,",
 "Msc. Jefferson Villarreal",
 "Coordinador de Titulación",
 "ITSQMET"
 ].join("\n");

 return {
 to: asText(responsible.correo),
 subject: subject,
 body: body,
 fullText: [
 "Para: " + asText(responsible.correo),
 "Asunto: " + subject,
 "",
 body
 ].join("\n")
 };
 }

 function buildWhatsappUrl(phoneIntl, message) {
 var phone = asText(phoneIntl);

 if (!phone) return "";

 return "https://wa.me/" + phone + "?text=" + encode(message);
 }

 function buildOutlookUrl(email) {
 var mail = email || {};

 if (!asText(mail.to)) return "";

 return [
 "https://outlook.cloud.microsoft/mail/deeplink/compose",
 "?to=" + encode(mail.to),
 "&subject=" + encode(mail.subject),
 "&body=" + encode(mail.body)
 ].join("");
 }

 function buildCoordinatorTelegram(context) {
 var ctx = context || {};
 var group = ctx.group || {};
 var rows = Array.isArray(group.rows) ? group.rows : [];

 return [
 buildTreatment(group.coordinador, ", buen día."),
 "",
 "Le comparto el listado de estudiantes de su coordinación que registran pendiente el requisito Académico.",
 "",
 "Período: " + asText(ctx.periodLabel),
 "División: " + getDivisionLabel(ctx),
 "Requisito pendiente: Académico",
 "Carrera de referencia: " + asText(group.carreraReferencia),
 "Total de estudiantes pendientes: " + rows.length,
 "",
 "Detalle:",
 formatStudentLines(rows),
 "",
 "Agradezco su apoyo con el seguimiento respectivo.",
 "",
 "Saludos,",
 "Msc. Jefferson Villarreal",
 "Coordinador de Titulación"
 ].join("\n");
 }

 function buildTelegramUrl(handle) {
 var clean = cleanTelegramHandle(handle);

 if (!clean) return "";

 return "https://t.me/" + clean;
 }

 function buildResponsibleMessages(context) {
 var ctx = context || {};
 var responsible = ctx.responsible || {};
 var whatsappMessage = buildResponsibleWhatsapp(ctx);
 var email = buildResponsibleEmail(ctx);

 return {
 whatsapp: {
 message: whatsappMessage,
 url: buildWhatsappUrl(responsible.whatsappIntl, whatsappMessage)
 },
 email: {
 to: email.to,
 subject: email.subject,
 body: email.body,
 fullText: email.fullText,
 url: buildOutlookUrl(email)
 }
 };
 }

 function buildCoordinatorMessage(context) {
 var ctx = context || {};
 var group = ctx.group || {};
 var message = buildCoordinatorTelegram(ctx);

 return {
 message: message,
 url: buildTelegramUrl(group.telegram),
 hasTelegram: !!asText(group.telegram)
 };
 }

 function buildPlainTable(rows, context) {
 var ctx = context || {};
 var requirement = ctx.requirement || {};

 return [
 "Período: " + asText(ctx.periodLabel),
 "División: " + getDivisionLabel(ctx),
 "Requisito: " + asText(requirement.label),
 "",
 Logic.buildPlainTable(rows || [])
 ].join("\n");
 }

 window.CoordiMensajes = {
 formatStudentLines: formatStudentLines,
 buildResponsibleWhatsapp: buildResponsibleWhatsapp,
 buildResponsibleEmail: buildResponsibleEmail,
 buildWhatsappUrl: buildWhatsappUrl,
 buildOutlookUrl: buildOutlookUrl,
 buildCoordinatorTelegram: buildCoordinatorTelegram,
 buildTelegramUrl: buildTelegramUrl,
 buildResponsibleMessages: buildResponsibleMessages,
 buildCoordinatorMessage: buildCoordinatorMessage,
 buildPlainTable: buildPlainTable
 };
})(window);
