/*
 * Shared inventory catalogue loader for Schema v1 sets.
 *
 * Schema-backed sets now build their local card catalogue directly from the
 * already-loaded public Schema package. Apps Script remains the write path for
 * inventory changes. Non-Schema/legacy sets retain the previous JSONP card-list
 * fallback unchanged.
 */

function loadSheetData(){

  cards = [];
  cardMap = {};
  sheetReady = false;

  updateScanButton();


  const schemaAdapter =
    window.SchemaV1SetLoader &&
    typeof window.SchemaV1SetLoader.getAdapter === "function"
      ? window.SchemaV1SetLoader.getAdapter(ACTIVE_SET.id)
      : null;


  if(
    schemaAdapter &&
    Array.isArray(schemaAdapter.cards) &&
    schemaAdapter.cards.length > 0
  ){

    cards =
      Array.from(
        schemaAdapter.cards
      );

    cards.forEach(card=>{

      const number =
        Number(
          card.sortKey ??
          card.number ??
          card.cardNumber ??
          card["Card #"]
        );

      if(number){

        cardMap[number] =
          card;

      }

    });


    sheetReady = true;

    sheetStatus.textContent =
      "✓ Inventory catalogue ready • " +
      cards.length +
      " cards";

    updateScanButton();

    return;

  }


  sheetStatus.textContent =
    "Connecting to Google Sheet...";


  if(
    !ACTIVE_SET ||
    !ACTIVE_SET.scriptUrl
  ){

    sheetStatus.textContent =
      "Google Sheet not configured for this set";

    console.error(
      "No scriptUrl configured for:",
      ACTIVE_SET
    );

    updateScanButton();

    return;

  }


  const oldScript =
    document.getElementById(
      "sheetJsonp"
    );

  if(oldScript){
    oldScript.remove();
  }


  const script =
    document.createElement(
      "script"
    );

  script.id =
    "sheetJsonp";


  const parameters =
    new URLSearchParams();

  parameters.set(
    "api",
    "cards"
  );

  parameters.set(
    "callback",
    "receiveCards"
  );

  parameters.set(
    "_",
    String(Date.now())
  );

  if(
    ACTIVE_SET.inventorySetIdParam === true
  ){

    parameters.set(
      "setId",
      ACTIVE_SET.id
    );

  }


  script.src =
    ACTIVE_SET.scriptUrl +
    "?" +
    parameters.toString();


  script.onerror = ()=>{

    cards = [];
    cardMap = {};
    sheetReady = false;

    sheetStatus.textContent =
      "Google Sheet connection failed";

    updateScanButton();

  };


  document.body.appendChild(
    script
  );

}
