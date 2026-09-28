(function(root){
  "use strict";

  const adapters = new Map();
  const pendingLoads = new Map();

  function hasSchemaPackage(setConfig){
    return Boolean(
      setConfig &&
      typeof setConfig.schemaPackageUrl === "string" &&
      setConfig.schemaPackageUrl.trim()
    );
  }

  function getAdapter(setId){
    return adapters.get(String(setId || "")) || null;
  }

  function setAdapter(setId,adapter){
    const key = String(setId || "");
    if(!key){
      throw new Error("Schema v1 set ID is required.");
    }
    adapters.set(key,adapter);
    return adapter;
  }

  async function loadAdapter(setConfig){
    if(!setConfig || typeof setConfig.id !== "string"){
      throw new Error("Set configuration is unavailable.");
    }

    const existing = getAdapter(setConfig.id);
    if(existing){
      return existing;
    }

    if(!hasSchemaPackage(setConfig)){
      return null;
    }

    if(
      !root.SchemaV1Adapter ||
      typeof root.SchemaV1Adapter.createAdapter !== "function"
    ){
      throw new Error("Shared Schema v1 adapter is unavailable.");
    }

    if(pendingLoads.has(setConfig.id)){
      return pendingLoads.get(setConfig.id);
    }

    const load = (async()=>{
      const response = await fetch(setConfig.schemaPackageUrl,{
        method:"GET",
        cache:"no-store"
      });

      if(!response.ok){
        throw new Error(
          setConfig.name +
          " public package request failed with status " +
          response.status
        );
      }

      const packageData = await response.json();
      const adapter = root.SchemaV1Adapter.createAdapter({
        setConfig,
        packageData
      });

      return setAdapter(setConfig.id,adapter);
    })();

    pendingLoads.set(setConfig.id,load);

    try{
      return await load;
    }finally{
      pendingLoads.delete(setConfig.id);
    }
  }

  root.SchemaV1SetLoader = Object.freeze({
    hasSchemaPackage,
    getAdapter,
    setAdapter,
    loadAdapter
  });
})(typeof window !== "undefined" ? window : globalThis);
