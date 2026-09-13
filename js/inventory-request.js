(function(
  root,
  factory
){

  const api =
    factory();


  if(
    typeof module !== "undefined" &&
    module.exports
  ){

    module.exports = api;

  }


  if(root){

    root.InventoryRequestContract = api;

  }

})(
  typeof window !== "undefined"
    ? window
    : null,
  function(){

    "use strict";


    const DESTINED_RIVALS_SET_ID =
      "destined-rivals";


    /*
      M12 rollback switch.

      Change only this value to "legacy" to restore the
      accepted M11 DRI frontend payload without changing
      Apps Script.
    */

    const DESTINED_RIVALS_REQUEST_MODE =
      "canonical";


    function requireNonEmptyString(
      value,
      field
    ){

      if(
        typeof value !== "string" ||
        !value.trim()
      ){

        throw new Error(
          field + " is required."
        );

      }


      return value.trim();

    }


    function validateQuantityDelta(
      quantityDelta
    ){

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


    function createLegacyWriteTarget(
      row,
      variant
    ){

      const normalizedRow =
        Number(row);


      if(
        !Number.isInteger(normalizedRow) ||
        normalizedRow < 1
      ){

        throw new Error(
          "Legacy inventory row is required."
        );

      }


      return Object.freeze({
        mode:
          "legacy",

        row:
          normalizedRow,

        variant:
          requireNonEmptyString(
            String(variant ?? ""),
            "Legacy inventory variant"
          )
      });

    }


    function createWriteTarget({
      activeSet,
      card,
      row,
      variant,
      schemaAdapter
    }){

      if(
        !activeSet ||
        typeof activeSet.id !== "string"
      ){

        throw new Error(
          "Active set is unavailable."
        );

      }


      if(
        activeSet.id !==
          DESTINED_RIVALS_SET_ID ||
        DESTINED_RIVALS_REQUEST_MODE ===
          "legacy"
      ){

        return createLegacyWriteTarget(
          row,
          variant
        );

      }


      if(
        DESTINED_RIVALS_REQUEST_MODE !==
          "canonical"
      ){

        throw new Error(
          "Unsupported Destined Rivals inventory request mode."
        );

      }


      if(
        !schemaAdapter ||
        typeof schemaAdapter.getDisplayAuthority !==
          "function" ||
        schemaAdapter.getDisplayAuthority() !==
          "schema-v1" ||
        typeof schemaAdapter.getCanonicalInventoryIdentity !==
          "function"
      ){

        throw new Error(
          "Destined Rivals Schema v1 inventory identity is unavailable."
        );

      }


      const identity =
        schemaAdapter
          .getCanonicalInventoryIdentity(
            card,
            variant
          );


      if(
        !identity ||
        identity.setId !==
          DESTINED_RIVALS_SET_ID
      ){

        throw new Error(
          "Invalid Destined Rivals Schema v1 inventory identity."
        );

      }


      return Object.freeze({
        mode:
          "canonical",

        setId:
          DESTINED_RIVALS_SET_ID,

        cardId:
          requireNonEmptyString(
            identity.cardId,
            "cardId"
          ),

        variantId:
          requireNonEmptyString(
            identity.variantId,
            "variantId"
          )
      });

    }


    function buildRequestParameters({
      writeTarget,
      quantityDelta,
      transactionId,
      callbackName,
      cacheBust
    }){

      if(
        !writeTarget ||
        typeof writeTarget.mode !== "string"
      ){

        throw new Error(
          "Inventory write target is required."
        );

      }


      const delta =
        validateQuantityDelta(
          quantityDelta
        );


      const parameters = {
        api:
          "changeQuantity",

        transactionId:
          requireNonEmptyString(
            String(transactionId ?? ""),
            "transactionId"
          ),

        callback:
          requireNonEmptyString(
            String(callbackName ?? ""),
            "callback"
          ),

        _:
          String(cacheBust)
      };


      if(
        writeTarget.mode ===
          "canonical"
      ){

        parameters.setId =
          requireNonEmptyString(
            writeTarget.setId,
            "setId"
          );

        parameters.cardId =
          requireNonEmptyString(
            writeTarget.cardId,
            "cardId"
          );

        parameters.variantId =
          requireNonEmptyString(
            writeTarget.variantId,
            "variantId"
          );

        parameters.quantityDelta =
          String(delta);


        return parameters;

      }


      if(
        writeTarget.mode ===
          "legacy"
      ){

        parameters.row =
          String(
            writeTarget.row
          );

        parameters.variant =
          requireNonEmptyString(
            writeTarget.variant,
            "variant"
          );

        parameters.change =
          String(delta);


        return parameters;

      }


      throw new Error(
        "Unknown inventory request mode."
      );

    }


    return Object.freeze({
      DESTINED_RIVALS_REQUEST_MODE,
      buildRequestParameters,
      createLegacyWriteTarget,
      createWriteTarget,
      validateQuantityDelta
    });

  }
);