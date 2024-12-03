import { Buffer } from "buffer";
import { RIFFFile } from "riff-file";

interface FrameInfo {
  frameIndex: number;
  framDuration: number;
}

interface ANIInfo {
  KeyFrameContent: string;
  aniURLRegexClassName: string;
  keyframesName: string;
  totalRoundTime: number;
}

class ANIMouse {
  private LoadedANIs: ANIInfo[] = [];
  private URLPathReg: RegExp = /[^a-zA-Z0-9-]+/g;

  constructor() {
    this.LoadANICursorPromise = this.LoadANICursorPromise.bind(this);
    this.setLoadedCursorToElement = this.setLoadedCursorToElement.bind(this);
    this.setLoadedCursorDefault = this.setLoadedCursorDefault.bind(this);
    this.setANICursor = this.setANICursor.bind(this);
    this.setANICursorWithGroupElement =
      this.setANICursorWithGroupElement.bind(this);
  }

  public LoadANICursorPromise(
    aniURL: string,
    cursorType: string = "auto",
    width: number = 32,
    height: number = 32
  ): Promise<ANIInfo> {
    return new Promise((topResolve) => {
      const aniURLRegexClassName =
        "cursor-animation-" + aniURL.replace(this.URLPathReg, "-");

      for (const aniInfo of this.LoadedANIs) {
        if (aniInfo.aniURLRegexClassName === aniURLRegexClassName) {
          topResolve(aniInfo);
          return;
        }
      }

      fetch(aniURL)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.arrayBuffer();
        })
        .then((arrayBuffer) => {
          const resizeIco = (
            blobUrl: string,
            newWidth: number,
            newHeight: number
          ): Promise<string> => {
            return new Promise((resolve) => {
              const img = new Image();
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              if (!ctx) {
                throw new Error("Failed to get canvas context");
              }

              img.onload = () => {
                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                canvas.toBlob((blob) => {
                  if (!blob) {
                    throw new Error("Failed to create blob");
                  }
                  const url = URL.createObjectURL(blob);
                  resolve(url);
                }, "image/x-icon");
              };
              img.src = blobUrl;
            });
          };

          const buffer = Buffer.from(arrayBuffer);
          const riff = new RIFFFile();
          riff.setSignature(buffer);

          const startIndex = riff.findChunk("anih").chunkData.start;
          const view = new DataView(arrayBuffer);

          const frameNum = view.getUint32(startIndex + 1 * 4, true);
          const cursorPlayOrderNum = view.getUint32(startIndex + 2 * 4, true);
          const frameDurationInHead = view.getUint32(startIndex + 7 * 4, true);

          const frameInfo: FrameInfo[] = [];
          const frameURLs: string[] = [];

          if (riff.findChunk("seq")) {
            const seqStart = riff.findChunk("seq").chunkData.start;

            if (riff.findChunk("rate")) {
              const rateStart = riff.findChunk("rate").chunkData.start;
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

          const ResizeIconGroup: Promise<{ index: number; url: string }>[] = [];
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

            function generateFrameAnimation(): string {
              let styleContent = "";
              let pos = 0;

              frameInfo.forEach((frame) => {
                totalRoundTime += frame.framDuration;
              });

              frameInfo.forEach((frame) => {
                styleContent += `${pos}% { cursor: url(${
                  frameURLs[frame.frameIndex]
                }),${cursorType};}\n`;
                pos += (frame.framDuration / totalRoundTime) * 100;
              });

              return styleContent;
            }

            const keyframesName = `${aniURLRegexClassName}-keyframes`;
            const KeyFrameContent = `@keyframes ${keyframesName} { ${generateFrameAnimation()} }`;

            const ANIInfo: ANIInfo = {
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

  public setLoadedCursorToElement(
    elementSelector: string,
    loadedCursorPromise: Promise<ANIInfo>
  ): void {
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

  public setLoadedCursorDefault(loadedCursorPromise: Promise<ANIInfo>): string {
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

  public setANICursor(
    elementSelector: string,
    aniURL: string,
    cursorType: string = "auto",
    width: number = 32,
    height: number = 32
  ): void {
    this.setLoadedCursorToElement(
      elementSelector,
      this.LoadANICursorPromise(aniURL, cursorType, width, height)
    );
  }

  public setANICursorWithGroupElement(
    elementSelectorGroup: string[],
    aniURL: string,
    cursorType: string = "auto",
    width: number = 32,
    height: number = 32
  ): void {
    const allElements = elementSelectorGroup.join(",");
    this.setANICursor(allElements, aniURL, cursorType, width, height);
  }
}

const instance = new ANIMouse();

export const {
  LoadANICursorPromise,
  setLoadedCursorToElement,
  setLoadedCursorDefault,
  setANICursor,
  setANICursorWithGroupElement,
} = instance;

export default instance;
