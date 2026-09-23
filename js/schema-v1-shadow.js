(function(){
  "use strict";

  const SET_ID = "destined-rivals";
  const SCHEMA_VERSION = "1.0";
  const PUBLIC_PACKAGE_PATH =
    "/api/v1/sets/destined-rivals/package";
  const DEFAULT_WAIT_TIMEOUT_MS = 30000;
  const DEFAULT_POLL_INTERVAL_MS = 100;

  const LEGACY_DISPLAY_STATE = Object.freeze({
    authority: "legacy"
  });

  let displayState = LEGACY_DISPLAY_STATE;

  function isObject(value){
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function requireObject(value,path){
    if(!isObject(value)){
      throw new Error(path + " must be an object");
    }
    return value;
  }

  function requireArray(value,path){
    if(!Array.isArray(value) || value.length === 0){
      throw new Error(path + " must be a non-empty array");
    }
    return value;
  }

  function requireString(value,path){
    if(typeof value !== "string" || value.length === 0){
      throw new Error(path + " must be a non-empty string");
    }
    return value;
  }

  function rejectDuplicate(values,value,path){
    if(values.has(value)){
      throw new Error(path + " is duplicated");
    }
    values.add(value);
  }

  function validatePublicPackage(data){
    requireObject(data,"package");
    requireString(data.schemaVersion,"schemaVersion");
    requireString(data.setId,"setId");
    requireString(data.displayName,"displayName");
    requireString(data.language,"language");

    if(data.schemaVersion !== SCHEMA_VERSION){
      throw new Error(
        "schemaVersion must be " + SCHEMA_VERSION
      );
    }

    if(data.setId !== SET_ID){
      throw new Error("setId must be " + SET_ID);
    }

    const variantIds = new Set();

    requireArray(data.variants,"variants")
      .forEach((variant,index)=>{
        const path = "variants[" + index + "]";
        requireObject(variant,path);
        requireString(variant.variantId,path + ".variantId");
        requireString(variant.label,path + ".label");
        rejectDuplicate(
          variantIds,
          variant.variantId,
          path + ".variantId"
        );
      });

    const cardIds = new Set();
    const cardNumbers = new Set();

    requireArray(data.cards,"cards")
      .forEach((card,index)=>{
        const path = "cards[" + index + "]";
        requireObject(card,path);

        [
          "cardId",
          "number",
          "name",
          "referenceImage"
        ].forEach(field=>{
          requireString(card[field],path + "." + field);
        });

        rejectDuplicate(cardIds,card.cardId,path + ".cardId");
        rejectDuplicate(cardNumbers,card.number,path + ".number");

        const cardVariantIds = new Set();

        requireArray(card.variants,path + ".variants")
          .forEach((variantId,variantIndex)=>{
            const variantPath =
              path + ".variants[" + variantIndex + "]";
            requireString(variantId,variantPath);

            if(!variantIds.has(variantId)){
              throw new Error(variantPath + " is unknown");
            }

            rejectDuplicate(
              cardVariantIds,
              variantId,
              variantPath
            );
          });
      });

    return data;
  }

  function legacyCardNumber(card){
    return Number(
      card.number ??
      card.cardNumber ??
      card["Card #"]
    );
  }

  function legacyCardName(card){
    return (
      card.name ??
      card.cardName ??
      card["Card Name"] ??
      "Unknown Card"
    );
  }

  function legacyCardImage(card,legacyConfig){
    if(card.imageUrl){
      return card.imageUrl;
    }

    if(legacyConfig.imageSet){
      return (
        "https://images.pokemontcg.io/" +
        legacyConfig.imageSet +
        "/" +
        legacyCardNumber(card) +
        ".png"
      );
    }

    return "";
  }

  function normalizedLegacyCardId(card){
    return String(card.cardId ?? "").toLowerCase();
  }

  function valuesEqual(left,right){
    if(Array.isArray(left) || Array.isArray(right)){
      return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((value,index)=>value === right[index])
      );
    }
    return left === right;
  }

  function comparePublicPackage(
    packageData,
    legacyConfig,
    legacyCards
  ){
    validatePublicPackage(packageData);
    requireObject(legacyConfig,"legacy configuration");

    if(!Array.isArray(legacyCards)){
      throw new Error("legacy cards are unavailable");
    }

    const mismatches = [];

    function compare(field,legacyValue,schemaValue){
      if(!valuesEqual(legacyValue,schemaValue)){
        mismatches.push({
          field,
          legacy: legacyValue,
          schema: schemaValue
        });
      }
    }

    compare("set.id",legacyConfig.id,packageData.setId);
    compare("set.name",legacyConfig.name,packageData.displayName);
    compare("cards.count",legacyConfig.maxCard,packageData.cards.length);

    const schemaVariantLabels =
      packageData.variants.map(variant=>variant.label);

    compare(
      "variants.order",
      legacyConfig.variants,
      schemaVariantLabels
    );

    const labelsByVariantId = new Map(
      packageData.variants.map(variant=>[
        variant.variantId,
        variant.label
      ])
    );

    const legacyCardsById = new Map();

    legacyCards.forEach((card,index)=>{
      const cardId = normalizedLegacyCardId(card);

      if(!cardId){
        mismatches.push({
          field: "legacyCards[" + index + "].cardId",
          legacy: cardId,
          schema: "a canonical card ID"
        });
        return;
      }

      if(legacyCardsById.has(cardId)){
        mismatches.push({
          field: "legacyCards." + cardId + ".duplicate",
          legacy: true,
          schema: false
        });
      }

      legacyCardsById.set(cardId,card);
    });

    packageData.cards.forEach((schemaCard,index)=>{
      const prefix = "cards." + schemaCard.cardId;
      const legacyCard = legacyCardsById.get(schemaCard.cardId);
      const legacyOrderCard = legacyCards[index];

      compare(
        prefix + ".order",
        legacyOrderCard
          ? normalizedLegacyCardId(legacyOrderCard)
          : null,
        schemaCard.cardId
      );

      if(!legacyCard){
        mismatches.push({
          field: prefix + ".cardId",
          legacy: null,
          schema: schemaCard.cardId
        });
        return;
      }

      const number = legacyCardNumber(legacyCard);
      const collectorNumber =
        String(number).padStart(3,"0") +
        "/" +
        legacyConfig.denominator;

      compare(
        prefix + ".cardId",
        normalizedLegacyCardId(legacyCard),
        schemaCard.cardId
      );
      compare(prefix + ".number",collectorNumber,schemaCard.number);
      compare(
        prefix + ".name",
        legacyCardName(legacyCard),
        schemaCard.name
      );
      compare(
        prefix + ".referenceImage",
        legacyCardImage(legacyCard,legacyConfig),
        schemaCard.referenceImage
      );
      compare(
        prefix + ".variants",
        legacyConfig.variants,
        schemaCard.variants.map(
          variantId=>labelsByVariantId.get(variantId)
        )
      );

      legacyCardsById.delete(schemaCard.cardId);
    });

    legacyCardsById.forEach((legacyCard,cardId)=>{
      mismatches.push({
        field: "legacyCards." + cardId + ".unexpected",
        legacy: true,
        schema: false
      });
    });

    return {
      authority: "legacy",
      comparedCards: packageData.cards.length,
      mismatches
    };
  }

  function resetDisplayAuthority(){
    displayState = LEGACY_DISPLAY_STATE;
  }

  function activatePackageDisplay(
    packageData,
    legacyConfig,
    legacyCards
  ){
    const comparison = comparePublicPackage(
      packageData,
      legacyConfig,
      legacyCards
    );

    if(
      packageData.cards.length !==
        legacyConfig.maxCard ||
      legacyCards.length !==
        legacyConfig.maxCard
    ){
      throw new Error(
        "complete legacy and package card data is required"
      );
    }

    const legacyCardsById = new Map(
      legacyCards.map(card=>[
        normalizedLegacyCardId(card),
        card
      ])
    );

    const legacyWriteKeysByVariantId = new Map(
      legacyConfig.variants.map(key=>[
        String(key)
          .trim()
          .toLowerCase()
          .replace(/\s+/g,"-"),
        key
      ])
    );

    const variantsById = new Map();
    const canonicalVariantIdsByLegacyKey =
      new Map();

    packageData.variants.forEach(variant=>{
      const legacyWriteKey =
        legacyWriteKeysByVariantId.get(
          variant.variantId
        );

      if(!legacyWriteKey){
        throw new Error(
          "no legacy write key exists for variant " +
          variant.variantId
        );
      }

      variantsById.set(
        variant.variantId,
        Object.freeze({
          key: legacyWriteKey,
          label: variant.label
        })
      );

      canonicalVariantIdsByLegacyKey.set(
        legacyWriteKey,
        variant.variantId
      );
    });

    const cardsById = new Map();
    const cardsByNumber = new Map();

    packageData.cards.forEach(schemaCard=>{
      const legacyCard = legacyCardsById.get(schemaCard.cardId);

      if(!legacyCard){
        throw new Error(
          "legacy card identity is missing for " +
          schemaCard.cardId
        );
      }

      const card = Object.freeze({
        cardId: schemaCard.cardId,
        number: schemaCard.number,
        name: schemaCard.name,
        referenceImage: schemaCard.referenceImage,
        variants: Object.freeze(
          schemaCard.variants.map(
            variantId=>variantsById.get(variantId)
          )
        )
      });

      cardsById.set(card.cardId,card);
      cardsByNumber.set(legacyCardNumber(legacyCard),card);
    });

    const nextState = Object.freeze({
      authority: "schema-v1",
      displayName: packageData.displayName,
      cardsById,
      cardsByNumber,
      canonicalVariantIdsByLegacyKey
    });

    displayState = nextState;

    return comparison;
  }

  function packageDisplayCard(legacyCard){
    if(displayState.authority !== "schema-v1"){
      return null;
    }

    return (
      displayState.cardsById.get(
        normalizedLegacyCardId(legacyCard)
      ) ||
      displayState.cardsByNumber.get(
        legacyCardNumber(legacyCard)
      ) ||
      null
    );
  }

  function getSetDisplayName(legacyName){
    return displayState.authority === "schema-v1"
      ? displayState.displayName
      : legacyName;
  }

  function getCardDisplayName(legacyCard,legacyName){
    const card = packageDisplayCard(legacyCard);
    return card ? card.name : legacyName;
  }

  function getCardCollectorNumber(legacyCard,legacyNumber){
    const card = packageDisplayCard(legacyCard);
    return card ? card.number : legacyNumber;
  }

  function getCardReferenceImage(legacyCard,legacyImage){
    const card = packageDisplayCard(legacyCard);
    return card ? card.referenceImage : legacyImage;
  }

  function getCardVariants(legacyCard,legacyVariants){
    const card = packageDisplayCard(legacyCard);
    return card ? card.variants : legacyVariants;
  }

  function getCanonicalInventoryIdentity(
    legacyCard,
    legacyVariant
  ){
    if(displayState.authority !== "schema-v1"){
      throw new Error(
        "Destined Rivals Schema v1 package is not authoritative"
      );
    }

    const card = packageDisplayCard(legacyCard);

    if(!card){
      throw new Error(
        "Destined Rivals canonical card identity is unavailable"
      );
    }

    const variant = card.variants.find(
      item=>item.key === String(legacyVariant)
    );

    if(!variant){
      throw new Error(
        "Destined Rivals canonical variant identity is unavailable"
      );
    }

    const variantId =
      displayState
        .canonicalVariantIdsByLegacyKey
        .get(
          variant.key
        );

    if(!variantId){
      throw new Error(
        "Destined Rivals canonical variant mapping is unavailable"
      );
    }

    return Object.freeze({
      setId: SET_ID,
      cardId: card.cardId,
      variantId
    });
  }

  function getDisplayAuthority(){
    return displayState.authority;
  }

  function waitForLegacyCards(
    getLegacyCards,
    timeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
  ){
    return new Promise((resolve,reject)=>{
      const started = Date.now();

      function check(){
        let legacyCards;

        try{
          legacyCards = getLegacyCards();
        }catch(error){
          reject(error);
          return;
        }

        if(Array.isArray(legacyCards) && legacyCards.length > 0){
          resolve(legacyCards);
          return;
        }

        if(Date.now() - started >= timeoutMs){
          reject(
            new Error("legacy card data was not available in time")
          );
          return;
        }

        setTimeout(check,pollIntervalMs);
      }

      check();
    });
  }

  function diagnostic(status,details = {}){
    return {
      displayAuthority:
        getDisplayAuthority(),
      inventoryAuthority:
        (
          typeof window !== "undefined" &&
          window.InventoryRequestContract &&
          window.InventoryRequestContract
            .DESTINED_RIVALS_REQUEST_MODE ===
              "canonical"
        )
          ? (
              getDisplayAuthority() === "schema-v1"
                ? "schema-v1-canonical"
                : "unavailable"
            )
          : "legacy",
      status,
      ...details
    };
  }

  async function runDisplayLoad({
    fetchImpl,
    endpoint,
    legacyConfig,
    getLegacyCards,
    waitTimeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
  }){
    resetDisplayAuthority();

    let response;

    try{
      response = await fetchImpl(endpoint,{
        method: "GET",
        cache: "no-store"
      });

      if(!response || response.ok !== true){
        throw new Error(
          "public package request failed with status " +
          String(response ? response.status : "unknown")
        );
      }

    }catch(error){
      return diagnostic("fetch-failed",{
        error: String(error.message || error)
      });
    }

    let packageData;

    try{
      packageData = await response.json();
      validatePublicPackage(packageData);
    }catch(error){
      return diagnostic("invalid-package",{
        error: String(error.message || error)
      });
    }

    let legacyCards;

    try{
      legacyCards = await waitForLegacyCards(
        getLegacyCards,
        waitTimeoutMs,
        pollIntervalMs
      );
    }catch(error){
      return diagnostic("legacy-data-unavailable",{
        error: String(error.message || error)
      });
    }

    try{
      const comparison = comparePublicPackage(
        packageData,
        legacyConfig,
        legacyCards
      );

      activatePackageDisplay(
        packageData,
        legacyConfig,
        legacyCards
      );

      return diagnostic("package-active",comparison);
    }catch(error){
      resetDisplayAuthority();

      return diagnostic("comparison-failed",{
        error: String(error.message || error)
      });
    }
  }

  async function startForSet(options){
    resetDisplayAuthority();

    if(!options.activeSet || options.activeSet.id !== SET_ID){
      return diagnostic("skipped");
    }

    return runDisplayLoad({
      ...options,
      legacyConfig: options.activeSet
    });
  }

  function applySetSelectorDisplayName(
    documentObject,
    legacyName
  ){
    const selector = documentObject.getElementById(
      "setSelector"
    );

    if(!selector){
      return;
    }

    const option = Array.from(selector.options)
      .find(item=>item.value === SET_ID);

    if(option){
      option.textContent = getSetDisplayName(legacyName);
    }
  }

  const api = Object.freeze({
    PUBLIC_PACKAGE_PATH,
    activatePackageDisplay,
    applySetSelectorDisplayName,
    comparePublicPackage,
    getCardCollectorNumber,
    getCardDisplayName,
    getCardReferenceImage,
    getCardVariants,
    getCanonicalInventoryIdentity,
    getDisplayAuthority,
    getSetDisplayName,
    resetDisplayAuthority,
    runDisplayLoad,
    startForSet,
    validatePublicPackage,
    waitForLegacyCards
  });

  if(typeof module !== "undefined" && module.exports){
    module.exports = api;
  }

  if(typeof window !== "undefined"){
    window.DestinedRivalsSchemaV1Display = api;
  }

  async function startBrowserShadowLoad(){
    if(
      typeof ACTIVE_SET === "undefined" ||
      ACTIVE_SET.id !== SET_ID
    ){
      return;
    }

    const report = await startForSet({
      activeSet: ACTIVE_SET,
      fetchImpl: window.fetch.bind(window),
      endpoint: RECOGNIZER_URL + PUBLIC_PACKAGE_PATH,
      getLegacyCards: ()=>cards
    });

    applySetSelectorDisplayName(
      document,
      ACTIVE_SET.name
    );

    window.DRI_SCHEMA_V1_DISPLAY_REPORT = report;

    if(report.status === "package-active"){
      console.info(
        "DRI Schema v1 display package active:",
        report.comparedCards,
        "cards"
      );
    }else{
      console.warn("DRI Schema v1 display fallback:",report);
    }
  }

  if(
    typeof window !== "undefined" &&
    typeof document !== "undefined"
  ){
    Promise.resolve()
      .then(startBrowserShadowLoad)
      .catch(error=>{
        resetDisplayAuthority();

        window.DRI_SCHEMA_V1_DISPLAY_REPORT =
          diagnostic("display-loader-failed",{
            error: String(error.message || error)
          });
        console.warn("DRI Schema v1 display loader failed:",error);
      });
  }
})();