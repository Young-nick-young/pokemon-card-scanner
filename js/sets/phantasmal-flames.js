const PHANTASMAL_FLAMES = Object.freeze({
  id: "phantasmal-flames",
  name: "Phantasmal Flames",
  setCode: "PFL",
  series: "Mega Evolution",
  officialCode: "ME02",
  datasetId: "me2",
  denominator: 94,
  maxCard: 130,
  imageSet: null,
  scriptUrl: "https://script.google.com/a/macros/ikns.edu.bh/s/AKfycbxzaDPrnUX_a8P7UXxAQ-lWCCbJ9RG_kiXzvUfERWk41cCDhdY5yIr8S1PK9CAD10vv/exec",
  inventorySetIdParam: true,
  variants: ["Normal","Reverse Holo","Holo","Other"],
  dynamicVariants: false,
  schemaPackageUrl:
    RECOGNIZER_URL +
    "/api/v1/sets/phantasmal-flames/package"
});

SetRegistry.register(
  PHANTASMAL_FLAMES
);
