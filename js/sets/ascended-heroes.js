const ASCENDED_HEROES = {
  id: "ascended-heroes",
  name: "Ascended Heroes",
  setCode: "ASC",

  denominator: 217,
  maxCard: 295,

  /*
    Ascended Heroes does NOT use one fixed set of
    variant buttons for every card.

    The Google Sheet backend provides the valid
    variants for each individual card.
  */
  dynamicVariants: true,

  getVariants(card) {
    if (
      card &&
      Array.isArray(card.variants) &&
      card.variants.length
    ) {
      return card.variants;
    }

    return [
      {
        key: "Other",
        label: "Other"
      }
    ];
  }
};
