const RECOGNIZER_URL =
  "https://pokemon-card-recognizer.onrender.com";


/*
  SET SELECTION

  Use the last set selected in the scanner.
  If none has been selected yet, start with Ascended Heroes.

  The shared set selector validates this ID against
  the registered set catalogue before use.
*/

const DEFAULT_SET_ID =
  "ascended-heroes";

const SAVED_SET_ID =
  localStorage.getItem(
    "tcgScannerActiveSet"
  );

const ACTIVE_SET_ID =
  SAVED_SET_ID ||
  DEFAULT_SET_ID;

window.ScannerSetSelection =
  Object.freeze({
    defaultSetId: DEFAULT_SET_ID,
    activeSetId: ACTIVE_SET_ID
  });


/*
  Shared scanner image settings
*/

const UPLOAD_WIDTH = 360;
const UPLOAD_HEIGHT = 483;
