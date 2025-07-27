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
  /**
   * 加载 ANI 光标，返回一个等待挂载的 Promise / Load ANI cursor and return a Promise to wait for mounting
   * @param {string} aniURL ANI 光标的 URL
   * @param {string} cursorType 光标类型，默认为 "auto"
   * @param {number} width 光标宽度，默认为 32
   * @param {number} height 光标高度，默认为 32
   * @return {Promise} 返回一个 Promise，解析为包含光标动画信息的对象
   * @example
   * ```javascript
   * const aniCursor = await LoadANICursorPromise('/path/to/cursor.ani');
   * ```
   */
  LoadANICursorPromise(aniURL, cursorType = "auto", width = 32, height = 32) {
    return new Promise((topResolve) => {
      // 根据 aniURL 生成一个唯一的类名
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
          // 调整一帧光标图片大小的函数，返回一个调整完大小的 Blob URL
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
          // 加载每一帧的光标图片，并调整大小
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
            // 这里推入的是带索引的 Promise，带索引是因为防止由于加载时间原因导致帧数据插入错位
            ResizeIconGroup.push(
              resizeIco(icourl, width, height).then((resizedUrl) => ({
                index: i,
                url: resizedUrl,
              }))
            );
          }
          // 等待所有帧的图片加载完成后，构建 CSS 动画，返回一个包含动画信息的 Promise
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
  /**
   * 将加载的 ANI 光标后返回的 Promise 应用到指定元素上 / Apply the loaded ANI cursor to the specified element using the returned Promise
   * @param {string} elementSelector 要应用光标的元素选择器
   * @param {Promise} loadedCursorPromise 加载的光标 Promise
   * @return {void}
   * @example
   * ```javascript
   * setLoadedCursorToElement('.my-element', LoadANICursorPromise('/path/to/cursor.ani'));
   * ```
   */
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
  /**
   * 该函数仅会将动画设置到根据 ani 文件 URL 生成的类名下，并返回对应类名，不会做其他额外操作，方便实现手动选择元素并挂载返回的类名来实现更加定制化的鼠标动画挂载 / This function only sets the animation under the class name generated based on the ani file URL and returns the corresponding class name, without any other additional operations, making it easy to manually select elements and mount the returned class name for more customized mouse animation mounting.
   * @param {Promise} loadedCursorPromise 加载的光标 Promise
   * @return {string} 返回生成的类名
   * @example
   * ```javascript
   * const defaultClass = setLoadedCursorDefault(LoadANICursorPromise('/path/to/cursor.ani'));
   * ```
   */
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
  /**
   * 组合式 API，快捷设置 ANI 光标到指定元素上 / Quick set ANI cursor to a specified element using a combination API
   * @param {string} elementSelector 要应用光标的元素选择器
   * @param {string} aniURL ANI 光标的 URL
   * @param {string} cursorType 光标类型，默认为 "auto"
   * @param {number} width 光标宽度，默认为 32
   * @param {number} height 光标高度，默认为 32
   * @return {void}
   * @example
   * ```javascript
   * setANICursor('.my-element', '/path/to/cursor.ani');
   * ```
   */
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
  /**
   * 组合式 API，快捷设置 ANI 光标到一组元素上 / Quick set ANI cursor to a group of elements using a combination API
   * @param {Array<string>} elementSelectorGroup 要应用光标的元素选择器数组
   * @param {string} aniURL ANI 光标的 URL
   * @param {string} cursorType 光标类型，默认为 "auto"
   * @param {number} width 光标宽度，默认为 32
   * @param {number} height 光标高度，默认为 32
   * @return {void}
   * @example
   * ```javascript
   * setANICursorWithGroupElement(['.my-element1', '.my-element2'], '/path/to/cursor.ani');
   * ```
   */
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
