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

    video.srcObject = stream;

    await video.play();

    cameraReady = true;

    updateScanButton();

  }catch(error){

    status.textContent =
      "Camera unavailable";

    console.error(error);

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

  const videoRatio =
    sourceWidth /
    sourceHeight;

  const displayRatio =
    displayWidth /
    displayHeight;


  let visibleWidth;
  let visibleHeight;
  let offsetX;
  let offsetY;


  if(videoRatio > displayRatio){

    visibleHeight =
      sourceHeight;

    visibleWidth =
      sourceHeight *
      displayRatio;

    offsetX =
      (
        sourceWidth -
        visibleWidth
      ) / 2;

    offsetY = 0;

  }else{

    visibleWidth =
      sourceWidth;

    visibleHeight =
      sourceWidth /
      displayRatio;

    offsetX = 0;

    offsetY =
      (
        sourceHeight -
        visibleHeight
      ) / 2;

  }


  const relativeLeft =
    (
      guideRect.left -
      videoRect.left
    ) /
    displayWidth;

  const relativeTop =
    (
      guideRect.top -
      videoRect.top
    ) /
    displayHeight;

  const relativeWidth =
    guideRect.width /
    displayWidth;

  const relativeHeight =
    guideRect.height /
    displayHeight;


  const sx =
    offsetX +
    relativeLeft *
    visibleWidth;

  const sy =
    offsetY +
    relativeTop *
    visibleHeight;

  const sw =
    relativeWidth *
    visibleWidth;

  const sh =
    relativeHeight *
    visibleHeight;


  captureCanvas.width =
    UPLOAD_WIDTH;

  captureCanvas.height =
    UPLOAD_HEIGHT;


  const context =
    captureCanvas.getContext(
      "2d"
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
