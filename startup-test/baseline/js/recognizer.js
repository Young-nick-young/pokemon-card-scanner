async function checkRecognizer(){

  try{

    /*
      v7.0:
      Check the status of the CURRENT set.

      This does NOT load the large recognition library.
      The library loads only when the first card is scanned.
    */

    const response =
      await fetch(
        RECOGNIZER_URL +
        "/status/" +
        encodeURIComponent(ACTIVE_SET.id),
        {
          cache:"no-store"
        }
      );

    if(!response.ok){

      throw new Error(
        "Recognizer not ready"
      );

    }

    const data =
      await response.json();


    /*
      If the server responds successfully,
      the recognizer service itself is available.

      library_ready may still be false before
      the first scan. That is expected in v7.0.
    */

    recognizerReady = true;

    status.textContent =
      "Ready to scan";


  }catch(error){

    console.error(
      "Recognizer status error:",
      error
    );

    recognizerReady = false;

    status.textContent =
      "Recognizer unavailable";

  }


  updateScanButton();

}



async function scanCard(){

  if(
    scanning ||
    !cameraReady ||
    !recognizerReady
  ){
    return;
  }


  scanning = true;

  hideResult();

  status.textContent =
    "Analyzing card...";

  updateScanButton();


  try{

    const blob =
      await captureGuide();

    const formData =
      new FormData();


    formData.append(
      "file",
      blob,
      "card.jpg"
    );


    const controller =
      new AbortController();


    /*
      Render free instances can sleep.

      The first request may therefore take
      considerably longer than later scans.
    */

    const timeout =
      setTimeout(
        ()=>{
          controller.abort();
        },
        90000
      );


    /*
      v7.0 MULTI-SET ROUTING

      Each set has its own recognition route.

      Examples:

      /recognize/destined-rivals

      /recognize/ascended-heroes
    */

    const recognitionUrl =
      RECOGNIZER_URL +
      "/recognize/" +
      encodeURIComponent(
        ACTIVE_SET.id
      );


    let response;


    try{

      response =
        await fetch(
          recognitionUrl,
          {
            method:"POST",
            body:formData,
            signal:
              controller.signal
          }
        );

    }finally{

      clearTimeout(
        timeout
      );

    }


    if(!response.ok){

      let errorMessage =
        "Recognition request failed";


      try{

        const errorData =
          await response.json();


        if(errorData?.detail){

          if(
            typeof errorData.detail ===
            "string"
          ){

            errorMessage =
              errorData.detail;

          }else if(
            errorData.detail.error
          ){

            errorMessage =
              errorData.detail.error;

          }

        }

      }catch(error){

        // Keep the normal error message.

      }


      throw new Error(
        errorMessage
      );

    }


    const result =
      await response.json();


    currentMatches =
      result.top_matches || [];


    if(
      result.status === "matched" &&
      result.best_match
    ){

      const number =
        Number(
          result.best_match.number
        );


      if(
        result.confident &&
        cardMap[number]
      ){

        showCard(
          cardMap[number]
        );

        status.textContent =
          "Card identified";

      }else{

        status.textContent =
          "Choose the correct card";

        showCandidates();

      }

    }else{

      status.textContent =
        "Card not identified";

      showCandidates();

    }


  }catch(error){

    console.error(
      "Recognition error:",
      error
    );


    if(
      error &&
      error.name ===
        "AbortError"
    ){

      status.textContent =
        "Recognizer timed out — try again";

    }else{

      status.textContent =
        "Scan failed — try again";

    }

  }


  scanning = false;

  updateScanButton();

}
