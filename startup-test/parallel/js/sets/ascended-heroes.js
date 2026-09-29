const ASCENDED_HEROES = {

  id: "ascended-heroes",

  name: "Ascended Heroes",

  setCode: "ASC",

  series: "Mega Evolution",

  denominator: 217,

  maxCard: 295,

  imageSet: null,

  scriptUrl:
    "https://script.google.com/a/macros/ikns.edu.bh/s/AKfycbxzaDPrnUX_a8P7UXxAQ-lWCCbJ9RG_kiXzvUfERWk41cCDhdY5yIr8S1PK9CAD10vv/exec",

  /*
    Ascended Heroes keeps card-specific inventory variants.
    The shared Schema v1 adapter is now the display/identity
    authority, matching the modern set architecture.
  */

  dynamicVariants: true,

  schemaPackageUrl:
    RECOGNIZER_URL +
    "/api/v1/sets/ascended-heroes/package",

  getVariants(card) {

    if (
      card &&
      Array.isArray(card.variants) &&
      card.variants.length > 0
    ) {

      return card.variants;

    }

    return [
      "Other"
    ];

  }

};

SetRegistry.register(
  ASCENDED_HEROES
);
