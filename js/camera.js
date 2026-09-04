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
      IMPORTANT

      Show the FULL camera image instead of
      cropping it to fill the preview.

      "cover" was making the camera appear
      artificially zoomed in.
    */

    video.style.objectFit =
      "contain";


    await video.play();


    /*
      If the device exposes a camera zoom
      control, make sure we start at its
      minimum optical/digital zoom.

      On most phones this will be 1x.
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

      /*
        Zoom control is optional.

        Some phones/browsers don't expose it,
        so failure here must NOT stop scanning.
      */

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
    =====================================================
    OBJECT-FIT: CONTAIN MAPPING

    The previous scanner used object-fit:cover.

    "cover" cropped the sides/top of the camera,
    which made the preview appear zoomed in.

    We now use "contain", so the complete camera
    image is visible.

    These calculations determine exactly where
    that uncropped camera image sits inside the
    preview element.
    =====================================================
  */


  let renderedWidth;
  let renderedHeight;
  let renderedLeft;
  let renderedTop;


  if(
    videoRatio >
    displayRatio
  ){

    /*
      Video is proportionally wider than
      the preview box.

      Full width is shown.
      Empty space may appear above/below.
    */

    renderedWidth =
      displayWidth;


    renderedHeight =
      displayWidth /
      videoRatio;


    renderedLeft =
      0;


    renderedTop =
      (
        displayHeight -
        renderedHeight
      ) / 2;

  }else{

    /*
      Video is proportionally taller than
      the preview box.

      Full height is shown.
      Empty space may appear left/right.
    */

    renderedHeight =
      displayHeight;


    renderedWidth =
      displayHeight *
      videoRatio;


    renderedTop =
      0;


    renderedLeft =
      (
        displayWidth -
        renderedWidth
      ) / 2;

  }


  /*
    Guide coordinates relative to the
    ACTUAL displayed camera image.
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
    Keep the crop safely inside the
    physical camera image.
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
