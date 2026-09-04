const CAMERA_DISPLAY_SCALE = 1.12;


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


    video.style.objectFit =
      "contain";


    video.style.transform =
      "scale(" +
      CAMERA_DISPLAY_SCALE +
      ")";


    video.style.transformOrigin =
      "center center";


    await video.play();


    /*
      Start at minimum camera zoom where supported.
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
          capabilities.zoom
        ){

          const minimumZoom =
            capabilities.zoom.min;


          if(
            Number.isFinite(
              minimumZoom
            )
          ){

            await track.applyConstraints({

              advanced:[
                {
                  zoom:
                    minimumZoom
                }
              ]

            });

          }

        }

      }

    }catch(zoomError){

      console.log(
        "Camera zoom control unavailable:",
        zoomError
      );

    }


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



function captureGuide(){

  const videoRect =
    video.getBoundingClientRect();


  const guideRect =
    guide.getBoundingClientRect();


  const sourceWidth =
    video.videoWidth;


  const sourceHeight =
    video.videoHeight;


  const displayWidth =
    videoRect.width;


  const displayHeight =
    videoRect.height;


  if(
    !sourceWidth ||
    !sourceHeight ||
    !displayWidth ||
    !displayHeight
  ){

    throw new Error(
      "Camera dimensions unavailable."
    );

  }


  const videoRatio =
    sourceWidth /
    sourceHeight;


  const displayRatio =
    displayWidth /
    displayHeight;


  /*
    Base object-fit: contain dimensions.
  */

  let baseRenderedWidth;
  let baseRenderedHeight;


  if(
    videoRatio >
    displayRatio
  ){

    baseRenderedWidth =
      displayWidth;


    baseRenderedHeight =
      displayWidth /
      videoRatio;

  }else{

    baseRenderedHeight =
      displayHeight;


    baseRenderedWidth =
      displayHeight *
      videoRatio;

  }


  /*
    Apply the SAME visual scale used by the preview.
  */

  const renderedWidth =
    baseRenderedWidth *
    CAMERA_DISPLAY_SCALE;


  const renderedHeight =
    baseRenderedHeight *
    CAMERA_DISPLAY_SCALE;


  const renderedLeft =
    (
      displayWidth -
      renderedWidth
    ) / 2;


  const renderedTop =
    (
      displayHeight -
      renderedHeight
    ) / 2;


  /*
    Find guide position inside the scaled camera image.
  */

  const guideLeft =
    guideRect.left -
    videoRect.left -
    renderedLeft;


  const guideTop =
    guideRect.top -
    videoRect.top -
    renderedTop;


  const guideWidth =
    guideRect.width;


  const guideHeight =
    guideRect.height;


  /*
    Convert displayed pixels back into
    original camera pixels.
  */

  const scaleX =
    sourceWidth /
    renderedWidth;


  const scaleY =
    sourceHeight /
    renderedHeight;


  let sx =
    guideLeft *
    scaleX;


  let sy =
    guideTop *
    scaleY;


  let sw =
    guideWidth *
    scaleX;


  let sh =
    guideHeight *
    scaleY;


  /*
    Keep crop inside the camera frame.
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
      sourceWidth -
      sx
    );


  sh =
    Math.min(
      sh,
      sourceHeight -
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
