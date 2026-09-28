"use strict";

const assert = require("assert");
const SchemaV1Adapter = require("../js/schema-v1-adapter.js");

function createFixture(setId,cardId,number,name="Fixture"){
  return SchemaV1Adapter.createAdapter({
    setConfig:{
      id:setId,
      maxCard:1
    },
    packageData:{
      setId,
      displayName:setId,
      variants:[
        {variantId:"normal",label:"Normal",inventoryKey:"normal"},
        {variantId:"reverse-holo",label:"Reverse Holo",inventoryKey:"reverse"},
        {variantId:"holo",label:"Holo",inventoryKey:"holo"},
        {variantId:"other",label:"Other",inventoryKey:"other"}
      ],
      cards:[
        {
          cardId,
          number,
          name,
          referenceImage:"https://example.invalid/card.png",
          variants:["normal","reverse-holo","holo","other"]
        }
      ]
    }
  });
}

const dri = createFixture(
  "destined-rivals",
  "dri-001",
  "001/182",
  "Ethan's Pinsir"
);

const legacyDriCard = {
  cardId:"DRI-001",
  number:"001"
};

assert.strictEqual(
  dri.getCard(legacyDriCard).cardId,
  "dri-001"
);

assert.deepStrictEqual(
  dri.getCanonicalInventoryIdentity(
    legacyDriCard,
    "Normal"
  ),
  {
    setId:"destined-rivals",
    cardId:"dri-001",
    variantId:"normal"
  }
);

assert.strictEqual(dri.getCard("dri-001").cardId,"dri-001");
assert.strictEqual(dri.getCard("001").cardId,"dri-001");
assert.strictEqual(dri.getCard("1").cardId,"dri-001");
assert.strictEqual(dri.getCard("001/182").cardId,"dri-001");
assert.strictEqual(dri.getCard("DRI-001").cardId,"dri-001");
assert.strictEqual(dri.getCard("UNKNOWN-001"),null);
assert.strictEqual(dri.getCard("999"),null);
assert.strictEqual(dri.getCard("001/999"),null);

[
  ["perfect-order","por-001","001/088"],
  ["chaos-rising","cri-001","001/086"],
  ["pitch-black","pbl-001","001/084"]
].forEach(([setId,cardId,number])=>{
  const adapter = createFixture(setId,cardId,number);
  assert.strictEqual(adapter.getCard(cardId).cardId,cardId);
  assert.strictEqual(adapter.getCard(number).cardId,cardId);
  assert.strictEqual(adapter.getCard("1").cardId,cardId);
});

console.log("schema-v1-adapter legacy identity regression: PASS");
