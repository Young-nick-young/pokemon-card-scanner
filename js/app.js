const SETS = {
  "destined-rivals": DESTINED_RIVALS,
  "ascended-heroes": ASCENDED_HEROES
};


const ACTIVE_SET =
  SETS[ACTIVE_SET_ID] ||
  DESTINED_RIVALS;


let cards = [];
let cardMap = {};

let currentCard = null;
let currentMatches = [];

let sessionCount = 0;
let lastAdd = null;

let cameraReady = false;
let recognizerReady = false;
let sheetReady = false;
let scanning = false;


const video =
  document.getElementById("video");

const guide =
  document.getElementById("cardGuide");

const scanButton =
  document.getElementById("scanButton");

const status =
  document.getElementById("status");

const sheetStatus =
  document.getElementById("sheetStatus");

const resultPanel =
  document.getElementById("resultPanel");

const cardImage =
  document.getElementById("cardImage");

const cardName =
  document.getElementById("cardName");

const cardNumber =
  document.getElementById("cardNumber");

const cardDetails =
  document.getElementById("cardDetails");

const variantGrid =
  document.querySelector(".variantGrid");

const wrongButton =
  document.getElementById("wrongButton");

const candidatePanel =
  document.getElementById("candidatePanel");

const manualArea =
  document.getElementById("manualArea");

const manualNumber =
  document.getElementById("manualNumber");

const manualButton =
  document.getElementById("manualButton");

const addMessage =
  document.getElementById("addMessage");

const sessionCountElement =
  document.getElementById("sessionCount");

const undoButton =
  document.getElementById("undoButton");

const captureCanvas =
  document.getElementById("captureCanvas");


function updateScanButton(){

  if(
    cameraReady &&
    recognizerReady &&
    sheetReady &&
    !scanning
  ){

    scanButton.disabled = false;
    scanButton.textContent = "SCAN CARD";

  }else{

    scanButton.disabled = true;

    if(scanning){

      scanButton.textContent =
        "ANALYZING...";

    }else{

      scanButton.textContent =
        "PLEASE WAIT...";

    }

  }

}


function getCardNumber(card){

  return Number(
    card.number ??
    card.cardNumber ??
    card["Card #"]
  );

}


function getCardName(card){

  return (
    card.name ??
    card.cardName ??
    card["Card Name"] ??
    "Unknown Card"
  );

}


function getCardRarity(card){

  return (
    card.rarity ??
    card.Rarity ??
    ""
  );

}


function getCardType(card){

  return (
    card.type ??
    card.cardType ??
    card["Card Type"] ??
    ""
  );

}


function getCardRow(card){

  return (
    card.row ??
    card.sheetRow ??
    card.Row ??
    null
  );

}


function getCardImageUrl(card){

  if(
    card &&
    card.imageUrl
  ){

    return card.imageUrl;

  }


  const number =
    getCardNumber(card);


  if(
    ACTIVE_SET.imageSet
  ){

    return (
      "https://images.pokemontcg.io/" +
      ACTIVE_SET.imageSet +
      "/" +
      number +
      ".png"
    );

  }


  return "";

}


function getVariantsForCard(card){

  if(
    ACTIVE_SET.dynamicVariants &&
    typeof ACTIVE_SET.getVariants === "function"
  ){

    return ACTIVE_SET.getVariants(card);

  }


  if(
    Array.isArray(ACTIVE_SET.variants)
  ){

    return ACTIVE_SET.variants;

  }


  return [
    {
      key: "Other",
      label: "Other"
    }
  ];

}


function normalizeVariantOption(option){

  if(
    typeof option === "string"
  ){

    return {
      key: option,
      label: option
    };

  }


  if(
    option &&
    typeof option === "object"
  ){

    const key =
      option.key ??
      option.value ??
      option.variant ??
      option.label ??
      "Other";

    const label =
      option.label ??
      option.name ??
      key;

    return {
      key: String(key),
      label: String(label)
    };

  }


  return {
    key: "Other",
    label: "Other"
  };

}


function renderVariantButtons(card){

  const variants =
    getVariantsForCard(card)
      .map(
        normalizeVariantOption
      );


  variantGrid.innerHTML = "";


  variants.forEach(variant=>{

    const button =
      document.createElement(
        "button"
      );

    button.className =
      "variantButton";

    button.dataset.variant =
      variant.key;

    button.textContent =
      variant.label;


    button.addEventListener(
      "click",
      ()=>{

        chooseVariant(
          variant.key
        );

      }
    );


    variantGrid.appendChild(
      button
    );

  });

}


function showCard(card){

  currentCard = card;

  const number =
    getCardNumber(card);

  const name =
    getCardName(card);

  const rarity =
    getCardRarity(card);

  const type =
    getCardType(card);


  cardImage.src =
    getCardImageUrl(card);


  cardName.textContent =
    name;


  cardNumber.textContent =
    "#" +
    String(number)
      .padStart(3,"0") +
    "/" +
    ACTIVE_SET.denominator;


  const details = [];

  if(rarity){
    details.push(rarity);
  }

  if(type){
    details.push(type);
  }

  cardDetails.textContent =
    details.join(" • ");


  renderVariantButtons(card);


  resultPanel.style.display =
    "block";

  candidatePanel.style.display =
    "none";

  manualArea.style.display =
    "none";

  addMessage.style.display =
    "none";


  setTimeout(()=>{

    resultPanel.scrollIntoView({
      behavior:"smooth",
      block:"nearest"
    });

  },50);

}


function showCandidates(){

  resultPanel.style.display =
    "block";

  candidatePanel.innerHTML = "";

  candidatePanel.style.display =
    "block";

  manualArea.style.display =
    "block";


  if(
    !currentMatches ||
    currentMatches.length === 0
  ){

    const message =
      document.createElement(
        "div"
      );

    message.textContent =
      "No reliable matches. Enter the card number below.";

    message.style.textAlign =
      "center";

    message.style.color =
      "#666";

    message.style.padding =
      "8px";

    candidatePanel.appendChild(
      message
    );

    return;

  }


  currentMatches
    .slice(0,5)
    .forEach(match=>{

      const number =
        Number(match.number);

      const card =
        cardMap[number];

      if(!card){
        return;
      }


      const button =
        document.createElement(
          "button"
        );

      button.className =
        "candidate";


      const image =
        document.createElement(
          "img"
        );

      image.src =
        getCardImageUrl(card);


      const text =
        document.createElement(
          "div"
        );

      text.className =
        "candidateText";


      const name =
        document.createElement(
          "div"
        );

      name.className =
        "candidateName";

      name.textContent =
        getCardName(card) +
        " #" +
        String(number)
          .padStart(3,"0");


      const stats =
        document.createElement(
          "div"
        );

      stats.className =
        "candidateStats";


      const verified =
        match.inliers ??
        match.good_matches ??
        0;

      const agreement =
        match.inlier_ratio
          ? Math.round(
              match.inlier_ratio *
              100
            )
          : 0;


      stats.textContent =
        verified +
        " verified matches • " +
        agreement +
        "% agreement";


      text.appendChild(name);
      text.appendChild(stats);

      button.appendChild(image);
      button.appendChild(text);


      button.addEventListener(
        "click",
        ()=>{

          showCard(card);

          status.textContent =
            "Card selected";

        }
      );


      candidatePanel.appendChild(
        button
      );

    });

}


function hideResult(){

  currentCard = null;

  resultPanel.style.display =
    "none";

  candidatePanel.style.display =
    "none";

  manualArea.style.display =
    "none";

  addMessage.style.display =
    "none";

}


function resetForNextCard(){

  currentCard = null;
  currentMatches = [];

  resultPanel.style.display =
    "none";

  candidatePanel.innerHTML = "";

  candidatePanel.style.display =
    "none";

  manualArea.style.display =
    "none";

  manualNumber.value = "";

  addMessage.style.display =
    "none";

  status.textContent =
    "Ready for next card";

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}


function manualFind(){

  const number =
    Number(
      manualNumber.value
    );

  if(
    !number ||
    number < 1 ||
    number > ACTIVE_SET.maxCard
  ){
    return;
  }


  const card =
    cardMap[number];


  if(!card){

    status.textContent =
      "Card number not found";

    return;

  }


  showCard(card);

  status.textContent =
    "Card selected manually";

}


scanButton.addEventListener(
  "click",
  scanCard
);


wrongButton.addEventListener(
  "click",
  ()=>{

    currentCard = null;

    showCandidates();

    status.textContent =
      "Choose the correct card";

  }
);


manualButton.addEventListener(
  "click",
  manualFind
);


manualNumber.addEventListener(
  "keydown",
  event=>{

    if(event.key === "Enter"){

      event.preventDefault();

      manualFind();

    }

  }
);


undoButton.addEventListener(
  "click",
  undoLastAdd
);


async function initialize(){

  manualNumber.max =
    ACTIVE_SET.maxCard;


  console.log(
    "Active set:",
    ACTIVE_SET.name
  );


  status.textContent =
    "Starting camera...";

  loadSheetData();

  await startCamera();

  await checkRecognizer();


  if(!recognizerReady){

    setTimeout(
      checkRecognizer,
      5000
    );

  }

}


/*
  PWA SERVICE WORKER
*/

if("serviceWorker" in navigator){

  window.addEventListener(
    "load",
    ()=>{

      navigator.serviceWorker
        .register(
          "./service-worker.js"
        )
        .then(registration=>{

          console.log(
            "Service worker registered:",
            registration.scope
          );

        })
        .catch(error=>{

          console.error(
            "Service worker registration failed:",
            error
          );

        });

    }
  );

}


initialize();
