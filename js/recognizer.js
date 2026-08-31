async function checkRecognizer(){

  try{

    const response =
      await fetch(
        RECOGNIZER_URL + "/health",
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

    if(data.library_ready){

      recognizerReady = true;

      status.textContent =
        "Ready to scan";

    }else{

      recognizerReady = false;

      status.textContent =
        "Recognizer waking up...";

    }

  }catch(error){

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

    const timeout =
      setTimeout(
        ()=>{
          controller.abort();
        },
        90000
      );


    const response =
      await fetch(
        RECOGNIZER_URL +
        "/recognize",
        {
          method:"POST",
          body:formData,
          signal:
            controller.signal
        }
      );

    clearTimeout(timeout);


    if(!response.ok){

      throw new Error(
        "Recognition request failed"
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

    console.error(error);

    status.textContent =
      "Scan failed — try again";

  }


  scanning = false;

  updateScanButton();

}
