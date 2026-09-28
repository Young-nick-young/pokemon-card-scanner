/*
 * Shared inventory card-list loader extension for Schema v1 sets.
 *
 * inventory.js remains unchanged. This file deliberately replaces only
 * loadSheetData() after inventory.js loads, preserving the established
 * inventory/write UI while allowing shared Apps Script deployments to
 * route card-list reads by setId when a set opts in.
 */

function loadSheetData(){

  /*
   * Clear any previous set's inventory state before starting a new read.
   * This prevents stale card counts/maps being shown during a set reload.
   */
  cards = [];
  cardMap = {};
  sheetReady = false;

  sheetStatus.textContent =
    "Connecting to Google Sheet...";

  updateScanButton();


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
