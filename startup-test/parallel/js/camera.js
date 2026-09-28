/*
=========================================================
CAMERA DISPLAY SETTINGS
=========================================================

1.00 = completely zoomed out
1.12 = slight zoom, but still much wider than old "cover"

We can adjust ONLY this number later if needed.
=========================================================
*/

const CAMERA_DISPLAY_ZOOM = 1.12;



/*
=========================================================
START CAMERA
=========================================================
*/

async function startCamera(){

  try{

    const stream =
      await navigator.mediaDevices.getUserMedia({

        video:{

          facingMode:{
            ideal:"environment"
          },

          width:{
            ideal:1920
          },

          height:{
            ideal:1080
          }

        },

        audio:false

      });


    video.srcObject =
      stream;


    /*
      Show the full camera image rather than
      using object-fit:cover, which cropped it.
    */

    video.style.objectFit =
      "contain";

    video.style.transform =
      "scale(" +
      CAMERA_DISPLAY_ZOOM +
      ")";

    video.style.transformOrigin =
      "center center";


    await video.play();



    /*
    =====================================================
    USE MINIMUM CAMERA ZOOM WHEN AVAILABLE
    =====================================================
    */

    try{

      const track =
        stream.getVideoTracks()[0];


      if(
        track &&
        typeof track.getCapabilities ===
          "function"
      ){

        const capabilities =
          track.getCapabilities();


        if(
          capabilities &&
          capabilities.zoom &&
          Number.isFinite(
            capabilities.zoom.min
          )
        ){

          await track.applyConstraints({

            advanced:[
              {
                zoom:
                  capabilities.zoom.min
              }
            ]

          });

        }

      }

    }catch(zoomError){

      /*
        Not all phones expose zoom controls.
        This is optional and must never stop
        the scanner.
      */

      console.log(
        "Camera zoom control unavailable:",
        zoomError
      );

    }



    /*
      Wait one frame so browser dimensions
      are fully updated.
    */

    await new Promise(
      resolve =>
        requestAnimationFrame(
          resolve
        )
    );


    syncCameraGuide();


    cameraReady =
      true;


    updateScanButton();


  }catch(error){

    status.textContent =
      "Camera unavailable";


    console.error(
      error
    );

  }

}



/*
=========================================================
CALCULATE ACTUAL DISPLAYED CAMERA AREA
=========================================================

The video element fills the camera box.

But because we use object-fit:contain, the actual camera
picture may occupy only part of that box.

This function calculates the REAL image rectangle,
including our slight 1.12 display zoom.
=========================================================
*/

function getDisplayedCameraGeometry(){

  const wrapperRect =
    video.getBoundingClientRect();


  const sourceWidth =
    video.videoWidth;


  const sourceHeight =
    video.videoHeight;


  const boxWidth =
    wrapperRect.width;


  const boxHeight =
    wrapperRect.height;


  if(
    !sourceWidth ||
    !sourceHeight ||
    !boxWidth ||
    !boxHeight
  ){

    return null;

  }


  const sourceRatio =
    sourceWidth /
    sourceHeight;


  const boxRatio =
    boxWidth /
    boxHeight;


  let imageWidth;
  let imageHeight;


  /*
    Calculate object-fit:contain size
  */

  if(
    sourceRatio >
    boxRatio
  ){

    imageWidth =
      boxWidth;

    imageHeight =
      boxWidth /
      sourceRatio;

  }else{

    imageHeight =
      boxHeight;

    imageWidth =
      boxHeight *
      sourceRatio;

  }


  /*
    Apply our visual zoom.
  */

  imageWidth *=
    CAMERA_DISPLAY_ZOOM;

  imageHeight *=
    CAMERA_DISPLAY_ZOOM;


  /*
    Image remains centred.
  */

  const left =
    (
      boxWidth -
      imageWidth
    ) / 2;


  const top =
    (
      boxHeight -
      imageHeight
    ) / 2;


  return {

    width:
      imageWidth,

    height:
      imageHeight,

    left:
      left,

    top:
      top,

    boxWidth:
      boxWidth,

    boxHeight:
      boxHeight,

    sourceWidth:
      sourceWidth,

    sourceHeight:
      sourceHeight

  };

}



/*
=========================================================
FIX WHITE CARD GUIDE
=========================================================

Previously the white guide was sized against the entire
camera container.

That caused it to extend into the black areas when the
camera was zoomed out.

Now it is sized against the ACTUAL visible camera image.
=========================================================
*/

function syncCameraGuide(){

  const geometry =
    getDisplayedCameraGeometry();


  if(!geometry){
    return;
  }


  /*
    Start at 73% of actual camera image width.
  */

  let guideWidth =
    geometry.width *
    0.73;


  /*
    Pokémon guide ratio = 73 : 98
  */

  let guideHeight =
    guideWidth *
    (
      98 / 73
    );


  /*
    Make sure guide never extends outside
    the actual camera picture vertically.
  */

  const maximumGuideHeight =
    geometry.height *
    0.92;


  if(
    guideHeight >
    maximumGuideHeight
  ){

    guideHeight =
      maximumGuideHeight;


    guideWidth =
      guideHeight *
      (
        73 / 98
      );

  }


  /*
    Centre guide inside camera.
  */

  guide.style.width =
    guideWidth +
    "px";


  guide.style.height =
    guideHeight +
    "px";


  guide.style.aspectRatio =
    "auto";


  guide.style.left =
    "50%";


  guide.style.top =
    "50%";


  guide.style.transform =
    "translate(-50%, -50%)";

}



/*
=========================================================
CAPTURE EXACTLY WHAT IS INSIDE WHITE GUIDE
=========================================================
*/

function captureGuide(){

  const geometry =
    getDisplayedCameraGeometry();


  if(!geometry){

    throw new Error(
      "Camera dimensions unavailable."
    );

  }


  const videoRect =
    video.getBoundingClientRect();


  const guideRect =
    guide.getBoundingClientRect();



  /*
    Guide position relative to camera wrapper.
  */

  const guideLeft =
    guideRect.left -
    videoRect.left;


  const guideTop =
    guideRect.top -
    videoRect.top;



  /*
    Convert guide coordinates into coordinates
    relative to the ACTUAL displayed camera image.
  */

  const relativeLeft =
    (
      guideLeft -
      geometry.left
    ) /
    geometry.width;


  const relativeTop =
    (
      guideTop -
      geometry.top
    ) /
    geometry.height;


  const relativeWidth =
    guideRect.width /
    geometry.width;


  const relativeHeight =
    guideRect.height /
    geometry.height;



  /*
    Convert displayed coordinates back to
    original camera pixels.
  */

  let sx =
    relativeLeft *
    geometry.sourceWidth;


  let sy =
    relativeTop *
    geometry.sourceHeight;


  let sw =
    relativeWidth *
    geometry.sourceWidth;


  let sh =
    relativeHeight *
    geometry.sourceHeight;



  /*
    Keep crop inside physical camera image.
  */

  sx =
    Math.max(
      0,
      sx
    );


  sy =
    Math.max(
      0,
      sy
    );


  sw =
    Math.min(
      sw,
      geometry.sourceWidth -
      sx
    );


  sh =
    Math.min(
      sh,
      geometry.sourceHeight -
      sy
    );


  if(
    sw <= 0 ||
    sh <= 0
  ){

    throw new Error(
      "Card guide is outside camera image."
    );

  }



  /*
    Recognition image stays exactly the
    same size as before.
  */

  captureCanvas.width =
    UPLOAD_WIDTH;


  captureCanvas.height =
    UPLOAD_HEIGHT;


  const context =
    captureCanvas.getContext(
      "2d"
    );


  context.clearRect(
    0,
    0,
    UPLOAD_WIDTH,
    UPLOAD_HEIGHT
  );


  context.drawImage(

    video,

    sx,
    sy,
    sw,
    sh,

    0,
    0,
    UPLOAD_WIDTH,
    UPLOAD_HEIGHT

  );


  return new Promise(
    resolve=>{

      captureCanvas.toBlob(

        resolve,

        "image/jpeg",

        0.82

      );

    }
  );

}



/*
=========================================================
KEEP GUIDE CORRECT AFTER PHONE ROTATION / RESIZE
=========================================================
*/

window.addEventListener(
  "resize",
  ()=>{

    requestAnimationFrame(
      syncCameraGuide
    );

  }
);


window.addEventListener(
  "orientationchange",
  ()=>{

    setTimeout(
      syncCameraGuide,
      250
    );

  }
);
