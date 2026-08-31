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

  script.id = "sheetJsonp";

  script.src =
    SCRIPT_URL +
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


function addQuantity(
  row,
  variant,
  change = 1
){

  return new Promise(
    (resolve,reject)=>{

      const callbackName =
        "sheetWrite_" +
        Date.now() +
        "_" +
        Math.floor(
          Math.random() * 100000
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
                "Google Sheet did not respond."
              )
            );

          },
          15000
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
              "Could not contact Google Sheet."
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

          callback:
            callbackName,

          _:
            String(Date.now())

        });


      script.src =
        SCRIPT_URL +
        "?" +
        parameters.toString();


      document.body.appendChild(
        script
      );

    }
  );

}


async function chooseVariant(
  variant
){

  if(!currentCard){
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


  document
    .querySelectorAll(
      ".variantButton"
    )
    .forEach(button=>{

      button.disabled = true;

    });


  status.textContent =
    "Adding to inventory...";


  try{

    const result =
      await addQuantity(
        row,
        variant,
        1
      );


    lastAdd = {
      row:row,
      variant:variant
    };


    undoButton.disabled =
      false;


    sessionCount++;

    sessionCountElement.textContent =
      sessionCount;


    addMessage.textContent =
      "✓ " +
      variant +
      " added";

    addMessage.style.display =
      "block";


    status.textContent =
      "✓ Added to inventory";


    console.log(
      "Confirmed Sheet update:",
      result
    );


    setTimeout(()=>{

      document
        .querySelectorAll(
          ".variantButton"
        )
        .forEach(button=>{

          button.disabled = false;

        });

      resetForNextCard();

    },350);

  }catch(error){

    console.error(error);

    status.textContent =
      "Google Sheet update failed";

    addMessage.textContent =
      "✕ Not added";

    addMessage.style.display =
      "block";


    document
      .querySelectorAll(
        ".variantButton"
      )
      .forEach(button=>{

        button.disabled = false;

      });

  }

}


async function undoLastAdd(){

  if(!lastAdd){
    return;
  }


  const itemToUndo =
    lastAdd;

  undoButton.disabled =
    true;

  status.textContent =
    "Undoing last add...";


  try{

    await addQuantity(
      itemToUndo.row,
      itemToUndo.variant,
      -1
    );


    lastAdd = null;


    sessionCount =
      Math.max(
        0,
        sessionCount - 1
      );


    sessionCountElement.textContent =
      sessionCount;


    status.textContent =
      "✓ Last add undone";


    setTimeout(()=>{

      status.textContent =
        "Ready for next card";

    },800);

  }catch(error){

    console.error(error);

    undoButton.disabled =
      false;

    status.textContent =
      "Undo failed";

  }

}
