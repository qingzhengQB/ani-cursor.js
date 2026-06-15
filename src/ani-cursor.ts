import { Buffer } from "buffer";
import * as riffFile from "riff-file";

interface FrameInfo {
  frameIndex: number;
  framDuration: number;
}

interface ANIInfo {
  KeyFrameContent: string;
  aniURLRegexClassName: string;
  keyframesName: string;
  totalRoundTime: number;

  frameURLs: string[]; // 解析出来的每一帧的blob数据URL，按照ani文件内数据顺序排列
  frameInfo: FrameInfo[]; // 每一帧的持续时间信息和数据索引，严格按照播放顺序排列，应该从这里取播放帧索引
}

export interface CursorController {
  readonly ready: Promise<void>;

  readonly destroyed: boolean;

  destroy(): void;
}

// 原引用的 riff-file 包没有类型定义文件，这里补全类型定义
interface RIFFFileShape {
  setSignature(buffer: Buffer): void;
  findChunk(chunkName: string): RIFFChunk | undefined;
}

interface RIFFFileModule {
  RIFFFile: new () => RIFFFileShape;
}

interface RIFFChunk {
  chunkData?: any;
  chunkSize?: number;
  subChunks?: Array<{
    chunkData: any;
    chunkSize: number;
  }>;
}

const cursorRuleBuilder = (
  url: string,
  hotspotX?: number,
  hotspotY?: number,
  cursorType: string = "auto"
) => {
  if (hotspotX !== undefined && hotspotY !== undefined) {
    return `url(${url}) ${hotspotX} ${hotspotY}, ${cursorType}`;
  }

  return `url(${url}), ${cursorType}`;
};

class ANIMouse {
  private LoadedANIs: ANIInfo[] = [];
  private URLPathReg: RegExp = /[^a-zA-Z0-9-]+/g;

  constructor() {
    this.LoadANICursorPromise = this.LoadANICursorPromise.bind(this);
    this.setLoadedCursorToElement = this.setLoadedCursorToElement.bind(this);
    this.setANICursor = this.setANICursor.bind(this);
    this.setANICursorWithGroupElement =
      this.setANICursorWithGroupElement.bind(this);
  }

  private createController(
    stylePromise: Promise<HTMLStyleElement>
  ): CursorController {
    let styleElement: HTMLStyleElement | null = null;
    let destroyed = false;
    const ready = stylePromise.then((style) => {
      if (destroyed) {
        style.remove();
        return;
      }

      styleElement = style;
    });

    return {
      get destroyed() {
        return destroyed;
      },

      ready,

      destroy() {
        if (destroyed) {
          return;
        }

        destroyed = true;

        if (styleElement) {
          styleElement.remove();
          styleElement = null;
        }
      },
    };
  }

  public LoadANICursorPromise(
    aniURL: string,
    cursorType: string = "auto",
    width: number = 32,
    height: number = 32,
    hotspotX?: number,
    hotspotY?: number
  ): Promise<ANIInfo> {
    return new Promise((topResolve, topReject) => {
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
            return new Promise((resolve, reject) => {
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
              img.onerror = () => {
                reject(new Error("Failed to load icon image"));
              };
              img.src = blobUrl;
            });
          };

          const buffer = Buffer.from(arrayBuffer);
          const { RIFFFile } = riffFile as RIFFFileModule;
          const riff = new RIFFFile();
          riff.setSignature(buffer);
          const anihChunk = riff.findChunk("anih") as RIFFChunk;
          const startIndex = anihChunk.chunkData!.start;
          const view = new DataView(arrayBuffer);

          const frameNum = view.getUint32(startIndex + 1 * 4, true);
          const cursorPlayOrderNum = view.getUint32(startIndex + 2 * 4, true);
          const frameDurationInHead = view.getUint32(startIndex + 7 * 4, true);

          const frameInfo: FrameInfo[] = [];
          const frameURLs: string[] = [];

          const seqChunk = riff.findChunk("seq") as RIFFChunk;
          if (seqChunk) {
            const seqStart = seqChunk.chunkData!.start;

            const rateChunk = riff.findChunk("rate") as RIFFChunk;
            if (rateChunk) {
              const rateStart = rateChunk.chunkData!.start;
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
          const listChunk = riff.findChunk("LIST") as RIFFChunk;
          for (let i = 0; i < cursorPlayOrderNum; i++) {
            const icourl = URL.createObjectURL(
              new Blob(
                [
                  new Uint8Array(
                    arrayBuffer,
                    listChunk.subChunks![i].chunkData.start,
                    listChunk.subChunks![i].chunkSize
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
                styleContent += `${pos}% { cursor: ${cursorRuleBuilder(
                  frameURLs[frame.frameIndex],
                  hotspotX,
                  hotspotY,
                  cursorType
                )}; }\n`;
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

              frameURLs,
              frameInfo,
            };

            this.LoadedANIs.push(ANIInfo);
            topResolve(ANIInfo);
          });
        })
        .catch(topReject);
    });
  }

  public setLoadedCursorToElement(
    elementSelector: string,
    loadedCursorPromise: Promise<ANIInfo>
  ): Promise<HTMLStyleElement> {
    return loadedCursorPromise.then(
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
        return style;
      }
    );
  }

  public setANICursor(
    elementSelector: string,
    aniURL: string,
    cursorType: string = "auto",
    width: number = 32,
    height: number = 32,
    hotspotX?: number,
    hotspotY?: number
  ): CursorController {
    const stylePromise = this.setLoadedCursorToElement(
      elementSelector,
      this.LoadANICursorPromise(
        aniURL,
        cursorType,
        width,
        height,
        hotspotX,
        hotspotY
      )
    );
    return this.createController(stylePromise);
  }

  public setANICursorWithGroupElement(
    elementSelectorGroup: string[],
    aniURL: string,
    cursorType: string = "auto",
    width: number = 32,
    height: number = 32,
    hotspotX?: number,
    hotspotY?: number
  ): CursorController {
    const allElements = elementSelectorGroup.join(",");
    return this.setANICursor(
      allElements,
      aniURL,
      cursorType,
      width,
      height,
      hotspotX,
      hotspotY
    );
  }
}

const instance = new ANIMouse();

export const {
  LoadANICursorPromise,
  setLoadedCursorToElement,
  setANICursor,
  setANICursorWithGroupElement,
} = instance;

export default instance;
