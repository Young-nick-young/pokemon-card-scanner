(function(root){
  "use strict";

  const sets = new Map();

  function requireText(setConfig,key){
    const value = setConfig && setConfig[key];

    if(typeof value !== "string" || !value.trim()){
      throw new Error(
        "Set registration requires a non-empty " +
        key +
        "."
      );
    }

    return value.trim();
  }

  function register(setConfig){
    const id = requireText(setConfig,"id");
    requireText(setConfig,"name");
    requireText(setConfig,"setCode");
    requireText(setConfig,"series");

    if(sets.has(id)){
      throw new Error(
        "Duplicate set registration: " + id
      );
    }

    sets.set(id,setConfig);
    return setConfig;
  }

  function get(setId){
    return sets.get(String(setId || "")) || null;
  }

  function has(setId){
    return sets.has(String(setId || ""));
  }

  function getAll(){
    return Array.from(sets.values());
  }

  root.SetRegistry = Object.freeze({
    register,
    get,
    has,
    getAll
  });
})(typeof window !== "undefined" ? window : globalThis);
