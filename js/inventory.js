function receiveCards(data){

  try{

    if(!Array.isArray(data)){

      throw new Error(
        "Invalid card data"
      );

    }

    cards = data;
    cardMap = {};

    cards.forEach(card=>{

      const number =
        Number(
          card.number ??
          card.cardNumber ??
          card["Card #"]
        );

      if(number){

        cardMap[number] = card;

      }

    });

    sheetReady = true;

    sheetStatus.textContent =
      "✓ Google Sheet connected • " +
      cards.length +
      " cards";

  }catch(error){

    sheetReady = false;

    sheetStatus.textContent =
      "Google Sheet connection failed";

    console.error(error);

  }

  updateScanButton();

}



function loadSheetData(){

  if(
    !ACTIVE_SET ||
    !ACTIVE_SET.scriptUrl
  ){

    sheetReady = false;

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


  script.src =
    ACTIVE_SET.scriptUrl +
    "?api=cards" +
    "&callback=receiveCards" +
    "&_=" +
    Date.now();


  script.onerror = ()=>{

    sheetReady = false;

    sheetStatus.textContent =
      "Google Sheet connection failed";

    updateScanButton();

  };


  document.body.appendChild(
    script
  );

}



/* =====================================================
   BULK ADD STATE
===================================================== */

let selectedInventoryVariant = null;

let selectedInventoryRow = null;

let inventoryWriteInProgress = false;

let toastTimer = null;



/* =====================================================
   QUANTITY ELEMENTS
===================================================== */

const inventoryQuantityInput =
  document.getElementById(
    "quantityInput"
  );

const inventoryQuantityMinus =
  document.getElementById(
    "quantityMinus"
  );

const inventoryQuantityPlus =
  document.getElementById(
    "quantityPlus"
  );

const inventoryConfirmAddButton =
  document.getElementById(
    "confirmAddButton"
  );

const inventoryAddToast =
  document.getElementById(
    "addToast"
  );



/* =====================================================
   TRANSACTION ID
===================================================== */

function createTransactionId(){

  if(
    window.crypto &&
    typeof window.crypto.randomUUID ===
      "function"
  ){

    return window.crypto.randomUUID();

  }

  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2)
  );

}



/* =====================================================
   QUANTITY HELPERS
===================================================== */

function getInventoryQuantity(){

  if(!inventoryQuantityInput){
    return 1;
  }


  let quantity =
    Number(
      inventoryQuantityInput.value
    );


  if(
    !Number.isFinite(quantity)
  ){

    quantity = 1;

  }


  quantity =
    Math.floor(
      quantity
    );


  quantity =
    Math.max(
      1,
      Math.min(
        999,
        quantity
      )
    );


  inventoryQuantityInput.value =
    String(quantity);


  return quantity;

}



function setInventoryQuantity(
  quantity
){

  if(!inventoryQuantityInput){
    return;
  }


  quantity =
    Number(quantity);


  if(
    !Number.isFinite(quantity)
  ){

    quantity = 1;

  }


  quantity =
    Math.floor(
      quantity
    );


  quantity =
    Math.max(
      1,
      Math.min(
        999,
        quantity
      )
    );


  inventoryQuantityInput.value =
    String(quantity);


  updateConfirmAddButton();

}



function updateConfirmAddButton(){

  if(
    !inventoryConfirmAddButton
  ){
    return;
  }


  const quantity =
    getInventoryQuantity();


  inventoryConfirmAddButton.textContent =
    "ADD " +
    quantity;


  inventoryConfirmAddButton.disabled =
    (
      !selectedInventoryVariant ||
      !selectedInventoryRow ||
      inventoryWriteInProgress
    );

}



/* =====================================================
   RESET BULK CONTROLS
===================================================== */

function resetInventoryAddControls(){

  selectedInventoryVariant =
    null;

  selectedInventoryRow =
    null;


  setInventoryQuantity(
    1
  );


  document
    .querySelectorAll(
      ".variantButton"
    )
    .forEach(button=>{

      button.classList.remove(
        "selected"
      );

      button.disabled =
        false;

    });


  updateConfirmAddButton();

}



/* =====================================================
   TOAST
===================================================== */

function showInventoryToast(
  message
){

  if(!inventoryAddToast){
    return;
  }


  if(toastTimer){

    clearTimeout(
      toastTimer
    );

  }


  inventoryAddToast.textContent =
    message;


  inventoryAddToast.classList.add(
    "show"
  );


  toastTimer =
    setTimeout(
      ()=>{

        inventoryAddToast
          .classList.remove(
            "show"
          );

      },
      1600
    );

}



/* =====================================================
   ONE JSONP WRITE ATTEMPT
===================================================== */

function sendQuantityRequest(
  row,
  variant,
  change,
  transactionId
){

  return new Promise(
    (resolve,reject)=>{


      const callbackName =
        "sheetWrite_" +
        Date.now() +
        "_" +
        Math.floor(
          Math.random() * 1000000
        );


      const script =
        document.createElement(
          "script"
        );


      let completed = false;


      function cleanup(){

        if(
          window[callbackName]
        ){

          delete window[
            callbackName
          ];

        }


        if(
          script.parentNode
        ){

          script.remove();

        }

      }


      /*
        Give Apps Script substantially more time.

        The Sheet may finish writing before
        the JSONP response reaches the phone.
      */

      const timeout =
        setTimeout(
          ()=>{

            if(completed){
              return;
            }


            completed = true;

            cleanup();


            reject(
              new Error(
                "SHEET_RESPONSE_TIMEOUT"
              )
            );

          },
          30000
        );


      window[callbackName] =
        function(data){

          if(completed){
            return;
          }


          completed = true;


          clearTimeout(
            timeout
          );


          cleanup();


          if(
            data &&
            data.success === true
          ){

            resolve(
              data.result
            );

          }else{

            reject(
              new Error(
                data &&
                data.error
                  ? data.error
                  : "Google Sheet update failed."
              )
            );

          }

        };


      script.onerror =
        function(){

          if(completed){
            return;
          }


          completed = true;


          clearTimeout(
            timeout
          );


          cleanup();


          reject(
            new Error(
              "SHEET_NETWORK_ERROR"
            )
          );

        };


      const parameters =
        new URLSearchParams({

          api:
            "changeQuantity",

          row:
            String(row),

          variant:
            String(variant),

          change:
            String(change),

          /*
            CRITICAL:

            The retry uses this SAME transaction ID.

            If Google Sheets already performed
            the first request, the backend will
            recognize the retry and NOT add again.
          */

          transactionId:
            String(
              transactionId
            ),

          callback:
            callbackName,

          _:
            String(Date.now())

        });


      script.src =
        ACTIVE_SET.scriptUrl +
        "?" +
        parameters.toString();


      document.body.appendChild(
        script
      );

    }
  );

}



/* =====================================================
   SAFE SHEET WRITE WITH RETRY
===================================================== */

async function addQuantity(
  row,
  variant,
  change = 1,
  transactionId = null
){

  if(
    !ACTIVE_SET ||
    !ACTIVE_SET.scriptUrl
  ){

    throw new Error(
      "Google Sheet backend is not configured for this set."
    );

  }


  /*
    Create the transaction ONCE.

    Every retry must reuse this exact ID.
  */

  const safeTransactionId =
    transactionId ||
    createTransactionId();


  let lastError = null;


  /*
    Maximum:
      Attempt 1
      Attempt 2

    Both carry the SAME transaction ID.
  */

  for(
    let attempt = 1;
    attempt <= 2;
    attempt++
  ){

    try{

      if(attempt === 2){

        status.textContent =
          "Confirming Sheet update...";

        /*
          Brief pause before retry.
        */

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              1200
            )
        );

      }


      const result =
        await sendQuantityRequest(
          row,
          variant,
          change,
          safeTransactionId
        );


      return result;


    }catch(error){

      lastError =
        error;


      console.warn(
        "Sheet write attempt " +
        attempt +
        " failed:",
        error
      );


      /*
        Retry only communication-type failures.

        A genuine backend error such as an
        invalid variant should NOT be retried.
      */

      const retryable =
        (
          error.message ===
            "SHEET_RESPONSE_TIMEOUT" ||
          error.message ===
            "SHEET_NETWORK_ERROR"
        );


      if(
        !retryable ||
        attempt === 2
      ){

        throw error;

      }

    }

  }


  throw (
    lastError ||
    new Error(
      "Google Sheet update failed."
    )
  );

}



/* =====================================================
   SELECT VARIANT
===================================================== */

function chooseVariant(
  variant
){

  if(
    !currentCard ||
    inventoryWriteInProgress
  ){
    return;
  }


  const row =
    getCardRow(
      currentCard
    );


  if(!row){

    status.textContent =
      "Sheet row not found";

    return;

  }


  selectedInventoryVariant =
    variant;

  selectedInventoryRow =
    row;


  document
    .querySelectorAll(
      ".variantButton"
    )
    .forEach(button=>{

      const buttonVariant =
        String(
          button.dataset.variant ??
          ""
        );


      if(
        buttonVariant ===
        String(variant)
      ){

        button.classList.add(
          "selected"
        );

      }else{

        button.classList.remove(
          "selected"
        );

      }

    });


  status.textContent =
    "Choose quantity";


  updateConfirmAddButton();

}



/* =====================================================
   CONFIRM BULK ADD
===================================================== */

async function confirmInventoryAdd(){

  if(
    inventoryWriteInProgress ||
    !currentCard ||
    !selectedInventoryVariant ||
    !selectedInventoryRow
  ){
    return;
  }


  const currentRow =
    getCardRow(
      currentCard
    );


  if(
    !currentRow ||
    Number(currentRow) !==
      Number(selectedInventoryRow)
  ){

    resetInventoryAddControls();

    status.textContent =
      "Tap the card variant again";

    return;

  }


  const quantity =
    getInventoryQuantity();


  /*
    Create this ONCE.

    addQuantity() will reuse it if the
    response has to be retried.
  */

  const transactionId =
    createTransactionId();


  inventoryWriteInProgress =
    true;


  updateConfirmAddButton();


  document
    .querySelectorAll(
      ".variantButton"
    )
    .forEach(button=>{

      button.disabled =
        true;

    });


  if(inventoryQuantityMinus){

    inventoryQuantityMinus.disabled =
      true;

  }


  if(inventoryQuantityPlus){

    inventoryQuantityPlus.disabled =
      true;

  }


  document
    .querySelectorAll(
      ".quantityQuickButton"
    )
    .forEach(button=>{

      button.disabled =
        true;

    });


  if(inventoryQuantityInput){

    inventoryQuantityInput.disabled =
      true;

  }


  status.textContent =
    quantity === 1
      ? "Adding to inventory..."
      : "Adding " +
        quantity +
        " cards...";


  try{

    const result =
      await addQuantity(
        selectedInventoryRow,
        selectedInventoryVariant,
        quantity,
        transactionId
      );


    lastAdd = {

      row:
        selectedInventoryRow,

      variant:
        selectedInventoryVariant,

      quantity:
        quantity,

      transactionId:
        transactionId

    };


    undoButton.disabled =
      false;


    sessionCount +=
      quantity;


    sessionCountElement.textContent =
      sessionCount;


    const toastText =
      quantity === 1
        ? "✓ Added 1 card"
        : "✓ Added " +
          quantity +
          " cards";


    showInventoryToast(
      toastText
    );


    addMessage.textContent =
      toastText;


    status.textContent =
      quantity === 1
        ? "✓ Added to inventory"
        : "✓ Added " +
          quantity +
          " to inventory";


    console.log(
      "Confirmed Sheet update:",
      result
    );


    setTimeout(
      ()=>{

        inventoryWriteInProgress =
          false;


        enableInventoryControls();


        resetInventoryAddControls();


        resetForNextCard();

      },
      450
    );


  }catch(error){

    console.error(
      error
    );


    inventoryWriteInProgress =
      false;


    enableInventoryControls();


    /*
      At this stage both attempts failed to
      receive confirmation.

      Do NOT automatically send a third request.
    */

    status.textContent =
      "Could not confirm Sheet update";


    showInventoryToast(
      "⚠ Check Sheet before retrying"
    );


    updateConfirmAddButton();

  }

}



/* =====================================================
   RE-ENABLE CONTROLS
===================================================== */

function enableInventoryControls(){

  document
    .querySelectorAll(
      ".variantButton"
    )
    .forEach(button=>{

      button.disabled =
        false;

    });


  if(inventoryQuantityMinus){

    inventoryQuantityMinus.disabled =
      false;

  }


  if(inventoryQuantityPlus){

    inventoryQuantityPlus.disabled =
      false;

  }


  document
    .querySelectorAll(
      ".quantityQuickButton"
    )
    .forEach(button=>{

      button.disabled =
        false;

    });


  if(inventoryQuantityInput){

    inventoryQuantityInput.disabled =
      false;

  }

}



/* =====================================================
   QUANTITY EVENTS
===================================================== */

if(inventoryQuantityMinus){

  inventoryQuantityMinus
    .addEventListener(
      "click",
      ()=>{

        setInventoryQuantity(
          getInventoryQuantity() - 1
        );

      }
    );

}


if(inventoryQuantityPlus){

  inventoryQuantityPlus
    .addEventListener(
      "click",
      ()=>{

        setInventoryQuantity(
          getInventoryQuantity() + 1
        );

      }
    );

}


document
  .querySelectorAll(
    ".quantityQuickButton"
  )
  .forEach(button=>{

    button.addEventListener(
      "click",
      ()=>{

        const amount =
          Number(
            button.dataset.add
          );


        if(
          Number.isFinite(amount)
        ){

          setInventoryQuantity(
            getInventoryQuantity() +
            amount
          );

        }

      }
    );

  });


if(inventoryQuantityInput){

  inventoryQuantityInput
    .addEventListener(
      "input",
      ()=>{

        updateConfirmAddButton();

      }
    );


  inventoryQuantityInput
    .addEventListener(
      "change",
      ()=>{

        setInventoryQuantity(
          inventoryQuantityInput.value
        );

      }
    );

}


if(inventoryConfirmAddButton){

  inventoryConfirmAddButton
    .addEventListener(
      "click",
      confirmInventoryAdd
    );

}



/* =====================================================
   UNDO
===================================================== */

async function undoLastAdd(){

  if(
    !lastAdd ||
    inventoryWriteInProgress
  ){
    return;
  }


  const itemToUndo =
    lastAdd;


  const undoQuantity =
    Math.max(
      1,
      Number(
        itemToUndo.quantity ??
        1
      )
    );


  const undoTransactionId =
    createTransactionId();


  inventoryWriteInProgress =
    true;


  undoButton.disabled =
    true;


  status.textContent =
    undoQuantity === 1
      ? "Undoing last add..."
      : "Removing " +
        undoQuantity +
        " cards...";


  try{

    await addQuantity(
      itemToUndo.row,
      itemToUndo.variant,
      -undoQuantity,
      undoTransactionId
    );


    lastAdd = null;


    sessionCount =
      Math.max(
        0,
        sessionCount -
        undoQuantity
      );


    sessionCountElement.textContent =
      sessionCount;


    inventoryWriteInProgress =
      false;


    showInventoryToast(
      undoQuantity === 1
        ? "↶ Removed 1 card"
        : "↶ Removed " +
          undoQuantity +
          " cards"
    );


    status.textContent =
      "✓ Last add undone";


    setTimeout(
      ()=>{

        status.textContent =
          "Ready for next card";

      },
      800
    );


  }catch(error){

    console.error(
      error
    );


    inventoryWriteInProgress =
      false;


    undoButton.disabled =
      false;


    status.textContent =
      "Could not confirm undo";


    showInventoryToast(
      "⚠ Check Sheet before retrying"
    );

  }

}



/* =====================================================
   INITIAL QUANTITY STATE
===================================================== */

setInventoryQuantity(
  1
);

updateConfirmAddButton();
