const ASCENDED_HEROES = {

  id: "ascended-heroes",

  name: "Ascended Heroes",

  setCode: "ASC",

  denominator: 217,

  maxCard: 295,

  /*
    Ascended Heroes images come from
    the card data returned by the Sheet.
  */

  imageSet: null,

  scriptUrl:
    "https://script.google.com/a/macros/ikns.edu.bh/s/AKfycbxzaDPrnUX_a8P7UXxAQ-lWCCbJ9RG_kiXzvUfERWk41cCDhdY5yIr8S1PK9CAD10vv/exec",

  /*
    Ascended Heroes uses card-specific
    variant buttons supplied by the Sheet.
  */

  dynamicVariants: true,

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
