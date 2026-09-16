const PERFECT_ORDER = {
  id: "perfect-order",
  name: "Perfect Order",
  setCode: "POR",
  officialCode: "ME03",
  datasetId: "me3",
  denominator: 88,
  maxCard: 124,
  imageSet: null,

  // Mega Evolution workbook shared Apps Script deployment.
  // Use the same school-domain URL form as Ascended Heroes because
  // both sets live in this one Apps Script project/deployment.
  scriptUrl:
    "https://script.google.com/a/macros/ikns.edu.bh/s/AKfycbxzaDPrnUX_a8P7UXxAQ-lWCCbJ9RG_kiXzvUfERWk41cCDhdY5yIr8S1PK9CAD10vv/exec",

  // This deployment hosts multiple Mega Evolution sets, so the
  // inventory loader must identify the selected set on card-list reads.
  inventorySetIdParam: true,

  variants: [
    "Normal",
    "Reverse Holo",
    "Holo",
    "Other"
  ],

  dynamicVariants: false,

  schemaPackageUrl:
    RECOGNIZER_URL +
    "/api/v1/sets/perfect-order/package"
};
