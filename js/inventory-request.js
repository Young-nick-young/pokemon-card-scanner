(function(root,factory){
  const api = factory(root);

  if(typeof module !== "undefined" && module.exports){
    module.exports = api;
  }

  if(root){
    root.InventoryRequestContract = api;
  }
})(
  typeof window !== "undefined" ? window : null,
  function(root){
    "use strict";

    const DESTINED_RIVALS_SET_ID = "destined-rivals";

    /*
      Preserve the accepted Destined Rivals rollback switch.
      Other Schema v1 sets select canonical mode through their
      declarative schemaPackageUrl configuration.
    */
    const DESTINED_RIVALS_REQUEST_MODE = "canonical";

    function requireNonEmptyString(value,field){
      if(typeof value !== "string" || !value.trim()){
        throw new Error(field + " is required.");
      }
      return value.trim();
    }

    function validateQuantityDelta(quantityDelta){
      if(
        typeof quantityDelta !== "number" ||
        !Number.isInteger(quantityDelta) ||
        quantityDelta === 0 ||
        Math.abs(quantityDelta) > 999
      ){
        throw new Error(
          "quantityDelta must be a non-zero whole number from -999 through 999."
        );
      }
      return quantityDelta;
    }

    function createLegacyWriteTarget(row,variant){
      const normalizedRow = Number(row);

      if(!Number.isInteger(normalizedRow) || normalizedRow < 1){
        throw new Error("Legacy inventory row is required.");
      }

      return Object.freeze({
        mode: "legacy",
        row: normalizedRow,
        variant: requireNonEmptyString(
          String(variant ?? ""),
          "Legacy inventory variant"
        )
      });
    }

    function usesCanonicalSchemaInventory(activeSet){
      if(!activeSet || typeof activeSet.id !== "string"){
        return false;
      }

      if(activeSet.id === DESTINED_RIVALS_SET_ID){
        if(
          DESTINED_RIVALS_REQUEST_MODE !== "canonical" &&
          DESTINED_RIVALS_REQUEST_MODE !== "legacy"
        ){
          throw new Error(
            "Unsupported Destined Rivals inventory request mode."
          );
        }

        return DESTINED_RIVALS_REQUEST_MODE === "canonical";
      }

      return Boolean(
        typeof activeSet.schemaPackageUrl === "string" &&
        activeSet.schemaPackageUrl.trim()
      );
    }

    function resolveSchemaAdapter(activeSet,schemaAdapter){
      /*
        DRI keeps its accepted explicit adapter path. For every other
        Schema v1 set, prefer the shared set loader so inventory.js does
        not need a new set-specific adapter reference for each set.
      */
      if(
        activeSet &&
        activeSet.id !== DESTINED_RIVALS_SET_ID &&
        root &&
        root.SchemaV1SetLoader &&
        typeof root.SchemaV1SetLoader.getAdapter === "function"
      ){
        const sharedAdapter = root.SchemaV1SetLoader.getAdapter(activeSet.id);
        if(sharedAdapter){
          return sharedAdapter;
        }
      }

      return schemaAdapter || null;
    }

    function createWriteTarget({
      activeSet,
      card,
      row,
      variant,
      schemaAdapter
    }){
      if(!activeSet || typeof activeSet.id !== "string"){
        throw new Error("Active set is unavailable.");
      }

      if(!usesCanonicalSchemaInventory(activeSet)){
        return createLegacyWriteTarget(row,variant);
      }

      const resolvedAdapter = resolveSchemaAdapter(
        activeSet,
        schemaAdapter
      );

      if(
        !resolvedAdapter ||
        typeof resolvedAdapter.getDisplayAuthority !== "function" ||
        resolvedAdapter.getDisplayAuthority() !== "schema-v1" ||
        typeof resolvedAdapter.getCanonicalInventoryIdentity !== "function"
      ){
        throw new Error(
          activeSet.name +
          " Schema v1 inventory identity is unavailable."
        );
      }

      const identity = resolvedAdapter.getCanonicalInventoryIdentity(
        card,
        variant
      );

      if(!identity || identity.setId !== activeSet.id){
        throw new Error(
          "Invalid " +
          activeSet.name +
          " Schema v1 inventory identity."
        );
      }

      return Object.freeze({
        mode: "canonical",
        setId: activeSet.id,
        cardId: requireNonEmptyString(identity.cardId,"cardId"),
        variantId: requireNonEmptyString(identity.variantId,"variantId")
      });
    }

    function buildRequestParameters({
      writeTarget,
      quantityDelta,
      transactionId,
      callbackName,
      cacheBust
    }){
      if(!writeTarget || typeof writeTarget.mode !== "string"){
        throw new Error("Inventory write target is required.");
      }

      const delta = validateQuantityDelta(quantityDelta);

      const parameters = {
        api: "changeQuantity",
        transactionId: requireNonEmptyString(
          String(transactionId ?? ""),
          "transactionId"
        ),
        callback: requireNonEmptyString(
          String(callbackName ?? ""),
          "callback"
        ),
        _: String(cacheBust)
      };

      if(writeTarget.mode === "canonical"){
        parameters.setId = requireNonEmptyString(
          writeTarget.setId,
          "setId"
        );
        parameters.cardId = requireNonEmptyString(
          writeTarget.cardId,
          "cardId"
        );
        parameters.variantId = requireNonEmptyString(
          writeTarget.variantId,
          "variantId"
        );
        parameters.quantityDelta = String(delta);
        return parameters;
      }

      if(writeTarget.mode === "legacy"){
        parameters.row = String(writeTarget.row);
        parameters.variant = requireNonEmptyString(
          writeTarget.variant,
          "variant"
        );
        parameters.change = String(delta);
        return parameters;
      }

      throw new Error("Unknown inventory request mode.");
    }

    return Object.freeze({
      DESTINED_RIVALS_REQUEST_MODE,
      buildRequestParameters,
      createLegacyWriteTarget,
      createWriteTarget,
      resolveSchemaAdapter,
      usesCanonicalSchemaInventory,
      validateQuantityDelta
    });
  }
);
