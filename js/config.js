const RECOGNIZER_URL =
  "https://pokemon-card-recognizer.onrender.com";


/*
  SET SELECTION

  Use the last set selected in the scanner.
  If none has been selected yet, start with Ascended Heroes.
*/

const SAVED_SET_ID =
  localStorage.getItem(
    "tcgScannerActiveSet"
  );

const ACTIVE_SET_ID =
  SAVED_SET_ID ||
  "ascended-heroes";


/*
  Shared scanner image settings
*/

const UPLOAD_WIDTH = 360;
const UPLOAD_HEIGHT = 483;


/*
  SET SELECTOR

  The page reload is intentional.

  It allows all scanner components
  (recognizer, Google Sheet, card data,
  variants, limits, etc.) to restart
  cleanly with the newly selected set.
*/

window.addEventListener(
  "DOMContentLoaded",
  ()=>{

    const setSelector =
      document.getElementById(
        "setSelector"
      );

    if(!setSelector){
      return;
    }


    /*
      Show the currently active set
      in the dropdown.
    */

    setSelector.value =
      ACTIVE_SET_ID;


    /*
      Change set
    */

    setSelector.addEventListener(
      "change",
      ()=>{

        const selectedSet =
          setSelector.value;


        if(
          !selectedSet ||
          selectedSet === ACTIVE_SET_ID
        ){
          return;
        }


        localStorage.setItem(
          "tcgScannerActiveSet",
          selectedSet
        );


        /*
          Reload so the entire scanner
          initializes cleanly for the
          newly selected set.
        */

        window.location.reload();

      }
    );

  }
);
