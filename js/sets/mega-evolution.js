const MEGA_EVOLUTION = Object.freeze({
  id: "mega-evolution",
  name: "Mega Evolution",
  setCode: "MEG",
  series: "Mega Evolution",
  officialCode: "ME01",
  datasetId: "me1",
  denominator: 132,
  maxCard: 188,
  imageSet: null,
  scriptUrl: "https://script.google.com/a/macros/ikns.edu.bh/s/AKfycbxzaDPrnUX_a8P7UXxAQ-lWCCbJ9RG_kiXzvUfERWk41cCDhdY5yIr8S1PK9CAD10vv/exec",
  inventorySetIdParam: true,
  variants: ["Normal","Reverse Holo","Holo","Other"],
  dynamicVariants: false,
  schemaPackageUrl:
    RECOGNIZER_URL +
    "/api/v1/sets/mega-evolution/package"
});

SetRegistry.register(
  MEGA_EVOLUTION
);
