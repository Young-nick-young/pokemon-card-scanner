(function(root){
  "use strict";

  function requireObject(value,path){
    if(!value || typeof value !== "object" || Array.isArray(value)){
      throw new Error(path + " must be an object");
    }
    return value;
  }

  function requireString(value,path){
    if(typeof value !== "string" || !value.trim()){
      throw new Error(path + " must be a non-empty string");
    }
    return value;
  }

  function requireArray(value,path){
    if(!Array.isArray(value)){
      throw new Error(path + " must be an array");
    }
    return value;
  }

  function createAdapter(options){
    requireObject(options,"options");
    const setConfig = requireObject(options.setConfig,"setConfig");
    const packageData = requireObject(options.packageData,"packageData");
    const manifest = packageData.manifest || packageData;
    const catalogue = packageData.cards && !Array.isArray(packageData.cards)
      ? packageData.cards
      : packageData;
    const configuredSetId = requireString(setConfig.id,"setConfig.id");
    const packageSetId = requireString(manifest.setId,"packageData.setId");

    if(packageSetId !== configuredSetId){
      throw new Error(
        "Schema package setId does not match the active set configuration"
      );
    }

    const variantDefinitions = requireArray(
      manifest.variants,
      "packageData.variants"
    );
    const cards = requireArray(catalogue.cards,"packageData.cards");
    if(Number.isInteger(setConfig.maxCard) && cards.length !== setConfig.maxCard){
      throw new Error("Schema package card count does not match setConfig.maxCard");
    }

    const variantsById = new Map();
    variantDefinitions.forEach((variant,index)=>{
      requireObject(variant,"packageData.variants[" + index + "]");
      const variantId = requireString(
        variant.variantId,
        "packageData.variants[" + index + "].variantId"
      );
      if(variantsById.has(variantId)){
        throw new Error("Duplicate variantId: " + variantId);
      }
      variantsById.set(variantId,Object.freeze({
        variantId,
        key: requireString(
          variant.inventoryKey || variant.variantId,
          "packageData.variants[" + index + "].inventoryKey"
        ),
        label: requireString(
          variant.label,
          "packageData.variants[" + index + "].label"
        )
      }));
    });

    const cardsById = new Map();
    const cardsByNumber = new Map();
    cards.forEach((card,index)=>{
      requireObject(card,"packageData.cards[" + index + "]");
      const cardId = requireString(
        card.cardId,
        "packageData.cards[" + index + "].cardId"
      );
      const numberData = card.number;
      const number = requireString(
        typeof numberData === "object" ? numberData.display : numberData,
        "packageData.cards[" + index + "].number"
      );
      const sortKey = Number(
        typeof numberData === "object"
          ? numberData.sortKey
          : number.split("/")[0]
      );
      if(!Number.isInteger(sortKey) || sortKey < 1){
        throw new Error("Invalid collector-number sort key for " + cardId);
      }
      if(cardsById.has(cardId) || cardsByNumber.has(number) || cardsByNumber.has(String(sortKey))){
        throw new Error("Duplicate card identity: " + cardId);
      }

      const cardVariants = requireArray(
        card.variants,
        "packageData.cards[" + index + "].variants"
      ).map((variantId)=>{
        const variant = variantsById.get(variantId);
        if(!variant){
          throw new Error("Unknown variantId " + variantId + " for " + cardId);
        }
        return variant;
      });

      const adaptedCard = Object.freeze({
        cardId,
        number,
        sortKey,
        name: requireString(card.name,"card.name"),
        referenceImage: requireString(
          card.referenceImage,
          "card.referenceImage"
        ),
        variants: Object.freeze(cardVariants)
      });
      cardsById.set(cardId,adaptedCard);
      cardsByNumber.set(number,adaptedCard);
      cardsByNumber.set(String(sortKey),adaptedCard);
    });

    function getCard(cardOrId){
      if(typeof cardOrId === "string"){
        return cardsById.get(cardOrId) || cardsByNumber.get(cardOrId) || null;
      }
      if(cardOrId && typeof cardOrId === "object"){
        const id = String(cardOrId.cardId || "");
        const rawNumber = cardOrId.number || cardOrId.cardNumber || cardOrId["Card #"] || "";
        const number = String(
          rawNumber && typeof rawNumber === "object"
            ? rawNumber.display || rawNumber.sortKey || ""
            : rawNumber
        );
        return cardsById.get(id) || cardsByNumber.get(number) || null;
      }
      return null;
    }

    function getCanonicalInventoryIdentity(cardOrId,variantValue){
      const card = getCard(cardOrId);
      if(!card){
        throw new Error("Canonical card identity is unavailable");
      }
      const normalizedVariant = String(variantValue || "").trim();
      const variant = card.variants.find(item=>(
        item.variantId === normalizedVariant ||
        item.key === normalizedVariant ||
        item.label === normalizedVariant
      ));
      if(!variant){
        throw new Error("Canonical variant identity is unavailable");
      }
      return Object.freeze({
        setId: packageSetId,
        cardId: card.cardId,
        variantId: variant.variantId
      });
    }

    return Object.freeze({
      setId: packageSetId,
      displayName: requireString(manifest.displayName,"packageData.displayName"),
      cards: Object.freeze(Array.from(cardsById.values())),
      getDisplayAuthority(){
        return "schema-v1";
      },
      getSetDisplayName(fallback){
        return manifest.displayName || fallback;
      },
      getCard,
      getCardCollectorNumber(cardOrId){
        const card = getCard(cardOrId);
        return card ? card.number : null;
      },
      getCardDisplayName(cardOrId){
        const card = getCard(cardOrId);
        return card ? card.name : null;
      },
      getCardReferenceImage(cardOrId){
        const card = getCard(cardOrId);
        return card ? card.referenceImage : null;
      },
      getCardVariants(cardOrId){
        const card = getCard(cardOrId);
        return card ? card.variants : [];
      },
      getCanonicalInventoryIdentity
    });
  }

  const api = Object.freeze({createAdapter});
  if(typeof module !== "undefined" && module.exports){
    module.exports = api;
  }
  root.SchemaV1Adapter = api;
})(typeof window !== "undefined" ? window : globalThis);
