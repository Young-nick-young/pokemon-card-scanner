(function(root){
  "use strict";

  const ACTIVE_STORAGE_KEY =
    "tcgScannerActiveSet";

  const RECENT_STORAGE_KEY =
    "tcgScannerRecentSets";

  const MAX_RECENT_SETS = 5;

  function getRegistry(){
    if(!root.SetRegistry){
      throw new Error("Set registry is unavailable.");
    }

    return root.SetRegistry;
  }

  function getSelectionState(){
    return root.ScannerSetSelection || {};
  }

  function readRecentIds(){
    try{
      const raw =
        localStorage.getItem(
          RECENT_STORAGE_KEY
        );

      if(!raw){
        return [];
      }

      const parsed = JSON.parse(raw);

      if(!Array.isArray(parsed)){
        return [];
      }

      const registry = getRegistry();
      const seen = new Set();

      return parsed
        .map(value=>String(value || ""))
        .filter(id=>{
          if(!id || seen.has(id) || !registry.has(id)){
            return false;
          }

          seen.add(id);
          return true;
        })
        .slice(0,MAX_RECENT_SETS);

    }catch(error){
      console.warn(
        "Recent-set history could not be read:",
        error
      );

      return [];
    }
  }

  function writeRecentIds(ids){
    try{
      localStorage.setItem(
        RECENT_STORAGE_KEY,
        JSON.stringify(ids)
      );
    }catch(error){
      console.warn(
        "Recent-set history could not be saved:",
        error
      );
    }
  }

  function touchRecent(setId){
    const registry = getRegistry();

    if(!registry.has(setId)){
      return [];
    }

    const ids = readRecentIds()
      .filter(id=>id !== setId);

    ids.unshift(setId);

    const next =
      ids.slice(0,MAX_RECENT_SETS);

    writeRecentIds(next);
    return next;
  }

  function resolveActiveSetId(){
    const registry = getRegistry();
    const selection = getSelectionState();
    const requestedId =
      String(selection.activeSetId || "");
    const defaultId =
      String(selection.defaultSetId || "");

    if(registry.has(requestedId)){
      return requestedId;
    }

    const fallbackId =
      registry.has(defaultId)
        ? defaultId
        : (registry.getAll()[0] || {}).id;

    if(!fallbackId){
      throw new Error(
        "No registered sets are available."
      );
    }

    try{
      localStorage.setItem(
        ACTIVE_STORAGE_KEY,
        fallbackId
      );
    }catch(error){
      console.warn(
        "Active set could not be repaired in local storage:",
        error
      );
    }

    return fallbackId;
  }

  function normalizeSearchText(value){
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function matchesSearch(setConfig,query){
    if(!query){
      return true;
    }

    const fields = [
      setConfig.name,
      setConfig.setCode,
      setConfig.officialCode
    ];

    return fields.some(value=>
      normalizeSearchText(value)
        .includes(query)
    );
  }

  function createSetButton(
    setConfig,
    activeSetId,
    selectSet
  ){
    const button =
      document.createElement("button");

    button.type = "button";
    button.className = "setSelectorOption";
    button.dataset.setId = setConfig.id;

    if(setConfig.id === activeSetId){
      button.classList.add("active");
      button.setAttribute("aria-current","true");
    }

    const name =
      document.createElement("span");

    name.className = "setSelectorOptionName";
    name.textContent = setConfig.name;

    const meta =
      document.createElement("span");

    meta.className = "setSelectorOptionCode";
    meta.textContent = setConfig.setCode;

    const marker =
      document.createElement("span");

    marker.className = "setSelectorOptionMarker";
    marker.textContent =
      setConfig.id === activeSetId
        ? "✓"
        : "";

    button.appendChild(marker);
    button.appendChild(name);
    button.appendChild(meta);

    button.addEventListener(
      "click",
      ()=>selectSet(setConfig.id)
    );

    return button;
  }

  function createSectionTitle(text){
    const title =
      document.createElement("div");

    title.className = "setSelectorSectionTitle";
    title.textContent = text;

    return title;
  }

  function renderNormalCatalogue(
    content,
    allSets,
    recentIds,
    activeSetId,
    selectSet
  ){
    content.innerHTML = "";

    if(recentIds.length > 0){
      const recentSection =
        document.createElement("section");

      recentSection.className =
        "setSelectorRecentSection";

      recentSection.appendChild(
        createSectionTitle("Recent Sets")
      );

      const recentList =
        document.createElement("div");

      recentList.className =
        "setSelectorOptionList";

      recentIds.forEach(id=>{
        const setConfig =
          getRegistry().get(id);

        if(setConfig){
          recentList.appendChild(
            createSetButton(
              setConfig,
              activeSetId,
              selectSet
            )
          );
        }
      });

      recentSection.appendChild(recentList);
      content.appendChild(recentSection);
    }

    const bySeries = new Map();

    allSets.forEach(setConfig=>{
      if(!bySeries.has(setConfig.series)){
        bySeries.set(setConfig.series,[]);
      }

      bySeries.get(setConfig.series)
        .push(setConfig);
    });

    Array.from(bySeries.keys())
      .sort((a,b)=>a.localeCompare(b))
      .forEach(series=>{
        const details =
          document.createElement("details");

        details.className =
          "setSelectorSeries";

        if(
          bySeries.get(series)
            .some(setConfig=>
              setConfig.id === activeSetId
            )
        ){
          details.open = true;
        }

        const summary =
          document.createElement("summary");

        summary.textContent = series;
        details.appendChild(summary);

        const list =
          document.createElement("div");

        list.className =
          "setSelectorOptionList";

        bySeries.get(series)
          .slice()
          .sort((a,b)=>
            a.name.localeCompare(b.name)
          )
          .forEach(setConfig=>{
            list.appendChild(
              createSetButton(
                setConfig,
                activeSetId,
                selectSet
              )
            );
          });

        details.appendChild(list);
        content.appendChild(details);
      });
  }

  function renderSearchResults(
    content,
    allSets,
    query,
    activeSetId,
    selectSet
  ){
    content.innerHTML = "";

    content.appendChild(
      createSectionTitle("Search Results")
    );

    const matches = allSets
      .filter(setConfig=>
        matchesSearch(setConfig,query)
      )
      .sort((a,b)=>
        a.name.localeCompare(b.name)
      );

    if(matches.length === 0){
      const empty =
        document.createElement("div");

      empty.className =
        "setSelectorEmpty";

      empty.textContent =
        "No matching sets";

      content.appendChild(empty);
      return;
    }

    const list =
      document.createElement("div");

    list.className =
      "setSelectorOptionList";

    matches.forEach(setConfig=>{
      list.appendChild(
        createSetButton(
          setConfig,
          activeSetId,
          selectSet
        )
      );
    });

    content.appendChild(list);
  }

  function initialize(){
    const mount =
      document.getElementById("setSelector");

    if(!mount){
      return;
    }

    const registry = getRegistry();
    const allSets = registry.getAll();
    const activeSetId = resolveActiveSetId();
    let recentIds = touchRecent(activeSetId);

    const activeSet = registry.get(activeSetId);

    mount.innerHTML = "";

    const trigger =
      document.createElement("button");

    trigger.type = "button";
    trigger.id = "setSelectorButton";
    trigger.className = "setSelectorButton";
    trigger.setAttribute("aria-haspopup","dialog");
    trigger.setAttribute("aria-expanded","false");

    const triggerText =
      document.createElement("span");

    triggerText.className =
      "setSelectorButtonText";

    triggerText.textContent =
      activeSet
        ? activeSet.name
        : "Choose set";

    const chevron =
      document.createElement("span");

    chevron.className =
      "setSelectorChevron";
    chevron.textContent = "▾";

    trigger.appendChild(triggerText);
    trigger.appendChild(chevron);

    const panel =
      document.createElement("div");

    panel.id = "setSelectorPanel";
    panel.className = "setSelectorPanel";
    panel.hidden = true;

    const search =
      document.createElement("input");

    search.type = "search";
    search.id = "setSelectorSearch";
    search.className = "setSelectorSearch";
    search.placeholder = "Search sets...";
    search.autocomplete = "off";
    search.setAttribute(
      "aria-label",
      "Search Pokémon sets"
    );

    const content =
      document.createElement("div");

    content.className =
      "setSelectorContent";

    panel.appendChild(search);
    panel.appendChild(content);

    mount.appendChild(trigger);
    mount.appendChild(panel);

    function closePanel(){
      panel.hidden = true;
      trigger.setAttribute(
        "aria-expanded",
        "false"
      );
    }

    function openPanel(){
      panel.hidden = false;
      trigger.setAttribute(
        "aria-expanded",
        "true"
      );

      search.focus();
    }

    function selectSet(setId){
      if(!registry.has(setId)){
        return;
      }

      recentIds = touchRecent(setId);

      if(setId === activeSetId){
        closePanel();
        return;
      }

      localStorage.setItem(
        ACTIVE_STORAGE_KEY,
        setId
      );

      window.location.reload();
    }

    function render(){
      const query =
        normalizeSearchText(
          search.value
        );

      if(query){
        renderSearchResults(
          content,
          allSets,
          query,
          activeSetId,
          selectSet
        );
        return;
      }

      renderNormalCatalogue(
        content,
        allSets,
        recentIds,
        activeSetId,
        selectSet
      );
    }

    trigger.addEventListener(
      "click",
      ()=>{
        if(panel.hidden){
          openPanel();
        }else{
          closePanel();
        }
      }
    );

    search.addEventListener(
      "input",
      render
    );

    document.addEventListener(
      "click",
      event=>{
        if(!mount.contains(event.target)){
          closePanel();
        }
      }
    );

    document.addEventListener(
      "keydown",
      event=>{
        if(event.key === "Escape"){
          closePanel();
          trigger.focus();
        }
      }
    );

    render();
  }

  if(document.readyState === "loading"){
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  }else{
    initialize();
  }

  root.SetSelector = Object.freeze({
    readRecentIds,
    touchRecent,
    resolveActiveSetId,
    matchesSearch
  });
})(typeof window !== "undefined" ? window : globalThis);
