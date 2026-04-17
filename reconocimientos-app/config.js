window.ReconConfig = {
  reference: {
    width: 1472,
    height: 1040
  },

  canvas: {
    width: 1472,
    height: 1040
  },

  pdf: {
    page: {
      width: 1472,
      height: 1040
    }
  },

  templateImage: "./plantilla-base.png",

  fixedText: {
    intro: "El Instituto Superior Tecnológico Quito Metropolitano otorga el presente reconocimiento a:",
    closing:
      "Su esfuerzo, dedicación y compromiso con la excelencia constituyen un motivo de orgullo institucional y un referente para la comunidad educativa.",
    authority: "Dr. León Alberto Tito",
    cargo: "RECTOR"
  },

  fonts: {
    ui: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    certificate: {
      normal: "'Times New Roman', Georgia, serif",
      strong: "'Times New Roman', Georgia, serif"
    }
  },

  colors: {
    main: "#1f2f63",
    line: "#26356a",
    signature: "#1b1b1b",
    softLine: "#8a8f98",
    surface: "#ffffff",
    previewBg: "#f6f8fc"
  },

  layout: {
    flow: {
      spaceAfterIntro: 42,
      spaceAfterName: 24,
      spaceAfterLine: 38,
      spaceAfterParagraph: 28,
      spaceAfterClosing: 34,
      spaceBeforeSignature: 82
    },

    introBox: {
      x: 320,
      y: 230,
      width: 832,
      fontSize: 27,
      minFontSize: 22,
      lineHeight: 35,
      maxLines: 2,
      align: "center",
      weight: 400
    },

    nameBox: {
      x: 214,
      y: 350,
      width: 1044,
      fontSize: 50,
      minFontSize: 32,
      lineHeight: 56,
      maxLines: 2,
      align: "center",
      weight: 800
    },

    separatorLine: {
      x1: 290,
      y1: 430,
      x2: 1182,
      y2: 430,
      width: 4
    },

    paragraphBox: {
      x: 210,
      y: 490,
      width: 1052,
      fontSize: 23,
      minFontSize: 19,
      lineHeight: 31,
      maxLines: 3,
      align: "center",
      weight: 400
    },

    closingBox: {
      x: 248,
      y: 585,
      width: 976,
      fontSize: 21,
      minFontSize: 18,
      lineHeight: 29,
      maxLines: 3,
      align: "center",
      weight: 400
    },

    dateBox: {
      x: 446,
      y: 690,
      width: 580,
      fontSize: 24,
      minFontSize: 20,
      lineHeight: 29,
      maxLines: 1,
      align: "center",
      weight: 400
    },

    signatureLine: {
      x1: 555,
      y1: 835,
      x2: 917,
      y2: 835,
      width: 2
    },

    authorityBox: {
      x: 500,
      y: 865,
      width: 472,
      fontSize: 24,
      minFontSize: 20,
      lineHeight: 28,
      maxLines: 1,
      align: "center",
      weight: 700
    },

    cargoBox: {
      x: 640,
      y: 900,
      width: 192,
      fontSize: 19,
      minFontSize: 16,
      lineHeight: 22,
      maxLines: 1,
      align: "center",
      weight: 400
    }
  }
};