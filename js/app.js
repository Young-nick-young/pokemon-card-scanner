const ACTIVE_SET =
  SetRegistry.get(ACTIVE_SET_ID) ||
  SetRegistry.get(DEFAULT_SET_ID);

if(!ACTIVE_SET){
  throw new Error(
    "No registered scanner set is available."
  );
}


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


function getActiveSetSchemaAdapter(){

  /*
    Preserve the accepted Destined Rivals display authority.
    New Schema v1 sets use the shared set loader instead.
  */
  if(
    ACTIVE_SET.id === "destined-rivals" &&
    window.DestinedRivalsSchemaV1Display &&
    window.DestinedRivalsSchemaV1Display
      .getDisplayAuthority() === "schema-v1"
  ){

    return window.DestinedRivalsSchemaV1Display;

  }


  if(
    window.SchemaV1SetLoader &&
    typeof window.SchemaV1SetLoader.getAdapter === "function"
  ){

    const adapter =
      window.SchemaV1SetLoader.getAdapter(
        ACTIVE_SET.id
      );

    if(
      adapter &&
      adapter.getDisplayAuthority() === "schema-v1"
    ){

      return adapter;

    }

  }


  return null;

}


async function loadActiveSetSchemaAdapter(){

  if(
    ACTIVE_SET.id === "destined-rivals" ||
    !window.SchemaV1SetLoader ||
    typeof window.SchemaV1SetLoader.loadAdapter !== "function" ||
    !window.SchemaV1SetLoader.hasSchemaPackage(ACTIVE_SET)
  ){

    return getActiveSetSchemaAdapter();

  }


  try{

    return await window.SchemaV1SetLoader.loadAdapter(
      ACTIVE_SET
    );

  }catch(error){

    console.error(
      "Schema v1 package load failed:",
      ACTIVE_SET.id,
      error
    );

    return null;

  }

}


function getActiveSetDisplayName(){

  const display =
    getActiveSetSchemaAdapter();

  if(!display){
    return ACTIVE_SET.name;
  }

  return (
    display.getSetDisplayName(
      ACTIVE_SET.name
    ) ||
    ACTIVE_SET.name
  );

}


function getCardName(card){

  const legacyName = (
    card.name ??
    card.cardName ??
    card["Card Name"] ??
    "Unknown Card"
  );


  const display =
    getActiveSetSchemaAdapter();


  return display
    ? (
        display.getCardDisplayName(
          card,
          legacyName
        ) ||
        legacyName
      )
    : legacyName;

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

  let legacyImage = "";


  if(
    card &&
    card.imageUrl
  ){

    legacyImage =
      card.imageUrl;

  }else if(
    ACTIVE_SET.imageSet
  ){

    legacyImage = (
      "https://images.pokemontcg.io/" +
      ACTIVE_SET.imageSet +
      "/" +
      getCardNumber(card) +
      ".png"
    );

  }


  const display =
    getActiveSetSchemaAdapter();


  return display
    ? (
        display.getCardReferenceImage(
          card,
          legacyImage
        ) ||
        legacyImage
      )
    : legacyImage;

}


function getVariantsForCard(card){

  let legacyVariants;


  if(
    ACTIVE_SET.dynamicVariants &&
    typeof ACTIVE_SET.getVariants === "function"
  ){

    legacyVariants =
      ACTIVE_SET.getVariants(card);

  }else if(
    Array.isArray(ACTIVE_SET.variants)
  ){

    legacyVariants =
      ACTIVE_SET.variants;

  }else{

    legacyVariants = [
      {
        key: "Other",
        label: "Other"
      }
    ];

  }


  const display =
    getActiveSetSchemaAdapter();


  if(!display){
    return legacyVariants;
  }


  const schemaVariants =
    display.getCardVariants(
      card,
      legacyVariants
    );


  return (
    Array.isArray(schemaVariants) &&
    schemaVariants.length > 0
  )
    ? schemaVariants
    : legacyVariants;

}


function getCardCollectorNumber(card){

  const legacyNumber =
    String(
      getCardNumber(card)
    )
      .padStart(3,"0") +
    "/" +
    ACTIVE_SET.denominator;

  const display =
    getActiveSetSchemaAdapter();


  return display
    ? (
        display.getCardCollectorNumber(
          card,
          legacyNumber
        ) ||
        legacyNumber
      )
    : legacyNumber;

}


function getCardShortCollectorNumber(card){

  return getCardCollectorNumber(card)
    .split("/")[0];

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
    getCardCollectorNumber(card);


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
        getCardShortCollectorNumber(
          card
        );


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


  await loadActiveSetSchemaAdapter();


  console.log(
    "Active set:",
    getActiveSetDisplayName()
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