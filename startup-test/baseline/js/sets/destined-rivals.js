const DESTINED_RIVALS = {
  id: "destined-rivals",
  name: "Destined Rivals",
  setCode: "DRI",
  series: "Scarlet & Violet",

  denominator: 182,
  maxCard: 244,

  imageSet: "sv10",

  scriptUrl:
    "https://script.google.com/a/macros/ikns.edu.bh/s/AKfycbwDF5oxhER534DF16jG94SHwJ9jS2ySAWJXIKgUsOpXjsdy26JKiu1FOIAsQnOqk_6f/exec",

  variants: [
    "Normal",
    "Reverse Holo",
    "Holo",
    "Other"
  ],

  dynamicVariants: false,

  schemaPackageUrl:
    RECOGNIZER_URL +
    "/api/v1/sets/destined-rivals/package"
};

SetRegistry.register(
  DESTINED_RIVALS
);
