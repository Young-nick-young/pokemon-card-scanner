const PITCH_BLACK = Object.freeze({
  id: "pitch-black",
  name: "Pitch Black",
  setCode: "PBL",
  series: "Mega Evolution",
  officialCode: "ME05",
  datasetId: "me5",
  denominator: 84,
  maxCard: 120,
  imageSet: null,
  scriptUrl: "https://script.google.com/a/macros/ikns.edu.bh/s/AKfycbxzaDPrnUX_a8P7UXxAQ-lWCCbJ9RG_kiXzvUfERWk41cCDhdY5yIr8S1PK9CAD10vv/exec",
  inventorySetIdParam: true,
  variants: ["Normal","Reverse Holo","Holo","Other"],
  dynamicVariants: false,
  schemaPackageUrl:
    RECOGNIZER_URL +
    "/api/v1/sets/pitch-black/package"
});

SetRegistry.register(
  PITCH_BLACK
);
