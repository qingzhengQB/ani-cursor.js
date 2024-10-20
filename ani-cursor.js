import { Buffer } from "buffer";
import { RIFFFile } from "riff-file";
class ANIMouse {
  LoadedANIs = [];
  URLPathReg = /[^a-zA-Z0-9-]+/g;
  constructor() {
    this.LoadANICursorPromise = this.LoadANICursorPromise.bind(this);
    this.setLoadedCursorToElement = this.setLoadedCursorToElement.bind(this);
    this.setLoadedCursorDefault = this.setLoadedCursorDefault.bind(this);
    this.setANICursor = this.setANICursor.bind(this);
    this.setANICursorWithGroupElement =
      this.setANICursorWithGroupElement.bind(this);
  }
  LoadANICursorPromise(aniURL, cursorType = "auto", width = 32, height = 32) {
    return new Promise((topResolve) => {
      const aniURLRegexClassName =
        "cursor-animation-" + aniURL.replace(this.URLPathReg, "-");
      this.LoadedANIs.forEach((aniInfo) => {
        if (aniInfo.aniURLRegexClassName === aniURLRegexClassName) {
          topResolve(aniInfo);
        }
      });
      fetch(aniURL)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.arrayBuffer(); // 读取为 ArrayBuffer
        })
        .then((arrayBuffer) => {
          function resizeIco(blobUrl, newWidth, newHeight) {
            return new Promise((resolve) => {
              const img = new Image();
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              img.onload = () => {
                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                canvas.toBlob((blob) => {
                  const url = URL.createObjectURL(blob);
                  resolve(url);
                }, "image/x-icon");
              };
              img.src = blobUrl; // 触发加载
            });
          }
          const buffer = Buffer.from(arrayBuffer);
          let riff = new RIFFFile();
          riff.setSignature(buffer);
          const startIndex = riff.findChunk("anih").chunkData.start;
          const view = new DataView(arrayBuffer);
          const frameNum = view.getUint32(startIndex + 1 * 4, true), // 帧总数
            cursorPlayOrderNum = view.getUint32(startIndex + 2 * 4, true), // 播放帧数
            frameDurationInHead = view.getUint32(startIndex + 7 * 4, true); // 帧间隔
          const frameInfo = [],
            frameURLs = [];
          if (riff.findChunk("seq")) {
            let seqStart = riff.findChunk("seq").chunkData.start;
            if (riff.findChunk("rate")) {
              let rateStart = riff.findChunk("rate").chunkData.start;
              for (let i = 0; i < cursorPlayOrderNum; i++) {
                frameInfo.push({
                  frameIndex: view.getUint32(seqStart + i * 4, true),
                  framDuration:
                    (view.getUint32(rateStart + i * 4, true) * 1000) / 60,
                });
              }
            } else {
              for (let i = 0; i < cursorPlayOrderNum; i++) {
                frameInfo.push({
                  frameIndex: view.getUint32(seqStart + i * 4, true),
                  framDuration: (frameDurationInHead * 1000) / 60,
                });
              }
            }
          } else {
            for (let i = 0; i < frameNum; i++) {
              frameInfo.push({
                frameIndex: i,
                framDuration: (frameDurationInHead * 1000) / 60,
              });
            }
          }
          const ResizeIconGroup = [];
          for (let i = 0; i < cursorPlayOrderNum; i++) {
            const icourl = URL.createObjectURL(
              new Blob(
                [
                  new Uint8Array(
                    arrayBuffer,
                    riff.findChunk("LIST").subChunks[i].chunkData.start,
                    riff.findChunk("LIST").subChunks[i].chunkSize
                  ),
                ],
                { type: "image/x-icon" }
              )
            );
            // 这里推入的是带索引的 Promise，防止因为加载时间原因导致帧数据插入错位
            ResizeIconGroup.push(
              resizeIco(icourl, width, height).then((resizedUrl) => ({
                index: i,
                url: resizedUrl,
              }))
            );
          }
          Promise.all(ResizeIconGroup).then((results) => {
            results.forEach((result) => {
              frameURLs[result.index] = result.url;
            });
            let totalRoundTime = 0;
            function generateFrameAnimation() {
              let styleContent = "",
                pos = 0;
              frameInfo.forEach((frame, index) => {
                totalRoundTime += frame.framDuration;
              });
              frameInfo.forEach((frame, index) => {
                styleContent += `${pos}% { cursor: url(${
                  frameURLs[frame.frameIndex]
                }),${cursorType};}\n`;
                pos += (frame.framDuration / totalRoundTime) * 100;
              });
              return styleContent;
            }
            let keyframesName = aniURLRegexClassName + "-keyframes";
            let KeyFrameContent = `@keyframes ${keyframesName}{ ${generateFrameAnimation()} }`;
            const ANIInfo = {
              KeyFrameContent,
              aniURLRegexClassName,
              keyframesName,
              totalRoundTime,
            };
            this.LoadedANIs.push(ANIInfo);
            topResolve(ANIInfo);
          });
        });
    });
  }
  setLoadedCursorToElement(elementSelector, loadedCursorPromise) {
    loadedCursorPromise.then(
      ({
        KeyFrameContent,
        aniURLRegexClassName,
        keyframesName,
        totalRoundTime,
      }) => {
        const styleContent = `${KeyFrameContent}
          ${elementSelector} { animation: ${keyframesName} ${totalRoundTime}ms step-end infinite; }
          .${aniURLRegexClassName} { animation: ${keyframesName} ${totalRoundTime}ms step-end infinite; }`;
        const style = document.createElement("style");
        style.innerHTML = styleContent;
        document.head.appendChild(style);
      }
    );
  }
  setLoadedCursorDefault(loadedCursorPromise) {
    let defaultClass = "";
    loadedCursorPromise.then(
      ({
        KeyFrameContent,
        aniURLRegexClassName,
        keyframesName,
        totalRoundTime,
      }) => {
        const styleContent = `${KeyFrameContent}
          .${aniURLRegexClassName} { animation: ${keyframesName} ${totalRoundTime}ms step-end infinite; }`;
        const style = document.createElement("style");
        style.innerHTML = styleContent;
        document.head.appendChild(style);
        defaultClass = aniURLRegexClassName;
      }
    );
    return defaultClass;
  }
  setANICursor(
    elementSelector,
    aniURL,
    cursorType = "auto",
    width = 32,
    height = 32
  ) {
    setLoadedCursorToElement(
      elementSelector,
      this.LoadANICursorPromise(aniURL, cursorType, width, height)
    );
  }
  setANICursorWithGroupElement(
    elementSelectorGroup,
    aniURL,
    cursorType = "auto",
    width = 32,
    height = 32
  ) {
    let allElements = elementSelectorGroup.join(",");
    setANICursor(allElements, aniURL, cursorType, width, height);
  }
}

const instance = new ANIMouse();

export const {
  LoadANICursorPromise,
  setLoadedCursorToElement,
  setANICursor,
  setLoadedCursorDefault,
  setANICursorWithGroupElement,
} = instance;

export default instance;
