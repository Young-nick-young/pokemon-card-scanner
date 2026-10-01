/*
 * Shared inventory catalogue loader for Schema v1 sets.
 *
 * Schema-backed sets build their local card catalogue from the public Schema
 * package. Apps Script remains the write path for inventory changes.
 * Only non-Schema/legacy sets use the Google Sheet card-list fallback.
 */

async function loadSheetData(){

  cards = [];
  cardMap = {};
  sheetReady = false;

  updateScanButton();


  const schemaLoader =
    window.SchemaV1SetLoader || null;

  const schemaBacked =
    Boolean(
      schemaLoader &&
      typeof schemaLoader.hasSchemaPackage === "function" &&
      schemaLoader.hasSchemaPackage(
        ACTIVE_SET
      )
    );


  let schemaAdapter =
    (
      schemaLoader &&
      typeof schemaLoader.getAdapter === "function"
    )
      ? schemaLoader.getAdapter(
          ACTIVE_SET.id
        )
      : null;


  /*
   * A cold Render wake can cause the first Schema request to fail even though
   * the backend becomes available immediately afterwards. For Schema-backed
   * sets, retry the Schema load once instead of silently falling back to the
   * legacy Google Sheet card catalogue.
   */
  if(
    schemaBacked &&
    !schemaAdapter &&
    typeof schemaLoader.loadAdapter === "function"
  ){

    sheetStatus.textContent =
      "Loading inventory catalogue...";

    try{

      schemaAdapter =
        await schemaLoader.loadAdapter(
          ACTIVE_SET
        );

    }catch(error){

      console.error(
        "Schema inventory catalogue retry failed:",
        ACTIVE_SET.id,
        error
      );

    }

  }


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


  /*
   * Schema-backed sets use canonical Schema identity for Add/Undo writes.
   * Falling back to legacy Sheet rows here would make the catalogue appear
   * ready while canonical inventory identity is actually unavailable.
   */
  if(schemaBacked){

    sheetStatus.textContent =
      "Inventory catalogue unavailable";

    console.error(
      "Schema inventory catalogue unavailable for:",
      ACTIVE_SET.id
    );

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
