interface FrameInfo {
    frameIndex: number;
    framDuration: number;
}
interface ANIInfo {
    KeyFrameContent: string;
    aniURLRegexClassName: string;
    keyframesName: string;
    totalRoundTime: number;
    frameURLs: string[];
    frameInfo: FrameInfo[];
}
export interface CursorController {
    readonly ready: Promise<void>;
    readonly destroyed: boolean;
    destroy(): void;
}
declare class ANIMouse {
    private LoadedANIs;
    private URLPathReg;
    constructor();
    private createController;
    LoadANICursorPromise(aniURL: string, cursorType?: string, width?: number, height?: number, hotspotX?: number, hotspotY?: number): Promise<ANIInfo>;
    setLoadedCursorToElement(elementSelector: string, loadedCursorPromise: Promise<ANIInfo>): Promise<HTMLStyleElement>;
    setANICursor(elementSelector: string, aniURL: string, cursorType?: string, width?: number, height?: number, hotspotX?: number, hotspotY?: number): CursorController;
    setANICursorWithGroupElement(elementSelectorGroup: string[], aniURL: string, cursorType?: string, width?: number, height?: number, hotspotX?: number, hotspotY?: number): CursorController;
}
declare const instance: ANIMouse;
export declare const LoadANICursorPromise: (aniURL: string, cursorType?: string, width?: number, height?: number, hotspotX?: number, hotspotY?: number) => Promise<ANIInfo>, setLoadedCursorToElement: (elementSelector: string, loadedCursorPromise: Promise<ANIInfo>) => Promise<HTMLStyleElement>, setANICursor: (elementSelector: string, aniURL: string, cursorType?: string, width?: number, height?: number, hotspotX?: number, hotspotY?: number) => CursorController, setANICursorWithGroupElement: (elementSelectorGroup: string[], aniURL: string, cursorType?: string, width?: number, height?: number, hotspotX?: number, hotspotY?: number) => CursorController;
export default instance;
