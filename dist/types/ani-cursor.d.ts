interface ANIInfo {
    KeyFrameContent: string;
    aniURLRegexClassName: string;
    keyframesName: string;
    totalRoundTime: number;
}
declare class ANIMouse {
    private LoadedANIs;
    private URLPathReg;
    constructor();
    LoadANICursorPromise(aniURL: string, cursorType?: string, width?: number, height?: number): Promise<ANIInfo>;
    setLoadedCursorToElement(elementSelector: string, loadedCursorPromise: Promise<ANIInfo>): void;
    setLoadedCursorDefault(loadedCursorPromise: Promise<ANIInfo>): string;
    setANICursor(elementSelector: string, aniURL: string, cursorType?: string, width?: number, height?: number): void;
    setANICursorWithGroupElement(elementSelectorGroup: string[], aniURL: string, cursorType?: string, width?: number, height?: number): void;
}
declare const instance: ANIMouse;
export declare const LoadANICursorPromise: (aniURL: string, cursorType?: string, width?: number, height?: number) => Promise<ANIInfo>, setLoadedCursorToElement: (elementSelector: string, loadedCursorPromise: Promise<ANIInfo>) => void, setLoadedCursorDefault: (loadedCursorPromise: Promise<ANIInfo>) => string, setANICursor: (elementSelector: string, aniURL: string, cursorType?: string, width?: number, height?: number) => void, setANICursorWithGroupElement: (elementSelectorGroup: string[], aniURL: string, cursorType?: string, width?: number, height?: number) => void;
export default instance;
