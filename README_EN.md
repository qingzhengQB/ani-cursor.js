# ani-cursor.js

[简体中文](https://github.com/qingzhengQB/ani-cursor.js/blob/master/README.md) | English

A tool that allows you to use ANI files on websites to create animated mouse cursors. The project already supports TypeScript and provides complete type support.

~~Please give me a star~~

![Picture](https://raw.githubusercontent.com/qingzhengQB/ani-cursor.js/refs/heads/main/ani_cover.gif)

Preview hosted on GitHub: [Preview](https://qingzhengqb.github.io/ani-cursor-preview/)

A blog that uses this library and has a pretty good effect, though availability cannot be guaranteed at all times: [Preview](https://blog.qzqb.cc/)

## Importing the Library

You can install it into your project using npm.

```bash
npm install ani-cursor.js
```

For projects where npm cannot be conveniently used (such as WordPress, pure HTML projects, etc.), consider using a script tag in the document head to load the library.

- Directly download the prebuilt file [dist/ani-cursor.umd.min.js](https://github.com/qingzhengQB/ani-cursor.js/blob/master/dist/ani-cursor.umd.min.js) from the repository and place it in your project, then load it using the following script tag:

```html
<script>
  const script = document.createElement("script");
  script.src = "path/to/ani-cursor.umd.min.js";
  script.onload = () => {
    // Get the functions provided by the AniCursor instance from window
    const { setANICursor, setANICursorWithGroupElement } =
      window.AniCursor || window;

    setANICursor("html", "/ani/main.ani");
  };
  document.head.appendChild(script);
</script>
```

- Via CDN

```html
<script>
  const script = document.createElement("script");
  script.src =
    "https://cdn.jsdelivr.net/npm/ani-cursor.js@1.0.3/dist/ani-cursor.umd.min.js";
  script.onload = () => {
    // Get the functions provided by the AniCursor instance from window
    const { setANICursor, setANICursorWithGroupElement } =
      window.AniCursor || window;

    setANICursor("html", "/ani/main.ani");
  };
  document.head.appendChild(script);
</script>
```

Related issue about update propagation:

https://github.com/qingzhengQB/ani-cursor.js/issues/4

## How to Use

### setANICursor

Using this tool is very simple. You only need to use the `setANICursor` function to apply your ANI file to your webpage. This function only modifies the document head and does not involve any DOM operations on elements inside the document body, so you can use it anywhere without worrying about whether the target element for the animated cursor has already been mounted.

```typescript
function setANICursor(
  elementSelector: string,
  aniURL: string,
  cursorType: string = "auto",
  width: number = 32,
  height: number = 32,
  hotspotX?: number,
  hotspotY?: number
): CursorController {}
```

The first parameter `elementSelector` is the CSS selector of the element to which you want to apply the ANI effect. The second parameter `aniURL` is the URL of your ANI file. The third parameter `cursorType` is the system cursor style you want to use when the ANI effect becomes unavailable. The fourth and fifth parameters `width` and `height` define the width and height of the cursor. The sixth and seventh parameters `hotspotX` and `hotspotY` define the cursor hotspot position (the coordinate offset of the actual click position relative to the cursor image). The hotspot will only take effect when both x and y are assigned.

**Note:** It is not recommended to modify the cursor width and height arbitrarily. Due to browser cursor style policies, when the width or height exceeds 32, the cursor style may fail in some situations. See the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/cursor#icon_size_limits).

> While the specification does not limit the image size, user agents commonly restrict them to avoid potential misuse. For example, on Firefox and Chromium cursor images are restricted to 128x128 pixels by default, but it is recommended to limit the cursor image size to 32x32 pixels. Cursor changes using images that are larger than the user-agent maximum supported size will generally just be ignored.

Here is a usage example:

```typescript
import { setANICursor } from "ani-cursor.js";
setANICursor("body", "/your/ani/file/url.ani");
```

### setANICursorWithGroupElement

Sometimes we want to use the same ANI file on multiple elements. In this case, we can use the `setANICursorWithGroupElement` function to apply the same ANI effect to all specified elements.

```typescript
import { setANICursorWithGroupElement } from "ani-cursor.js";
let textAbleGroup = [
  "input",
  'input[type="text"]',
  "textarea",
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];
setANICursorWithGroupElement(textAbleGroup, "/ani/TextSelect.ani");
```

### CursorController

`setANICursor()` and `setANICursorWithGroupElement()` return a `CursorController`, which is used to manage and control the animated cursor style that was created.

```typescript
interface CursorController {
  readonly ready: Promise<void>;
  readonly destroyed: boolean;
  destroy(): void;
}
```

`ready` indicates whether the cursor animation style has finished loading and has been injected into the page.

```typescript
const controller = setANICursor("body", "/your/ani/file/url.ani");

controller.ready.then(() => {
  console.log("Cursor loaded");
});
```

`destroyed` indicates whether the current controller has been destroyed.

```typescript
const controller = setANICursor("body", "/your/ani/file/url.ani");

console.log(controller.destroyed);
// false

controller.destroy();
console.log(controller.destroyed);
// true
```

`destroy()` removes the animated style created by the current controller. `destroy()` can be called immediately even if the resources have not finished loading yet.

```typescript
const controller = setANICursor("body", "/your/ani/file/url.ani");

controller.destroy();
```

### Vue Usage Example

The preview website is written in Vue. The preview repository contains usage examples in its markdown documentation:

https://github.com/qingzhengQB/ani-cursor-preview

## More APIs

```typescript
function LoadANICursorPromise(
  aniURL: string,
  cursorType: string = "auto",
  width: number = 32,
  height: number = 32,
  hotspotX?: number,
  hotspotY?: number
): Promise<ANIInfo> {}
```

You can use it to load an ANI file. After running this function, it returns a Promise that can be handled with `then`, and the resolved value will be an object containing related loading information. You can also extract detailed information such as the image blob URLs of each frame, frame order, and duration from the returned value.

```typescript
interface ANIInfo {
  KeyFrameContent; // Animation content defined by the loaded ANI file
  aniURLRegexClassName; // A class name generated from the ANI file URL when creating the animation. This class itself contains no content after loading
  keyframesName; // Name of the generated animation
  totalRoundTime; // Time required for one complete animation loop

  frameURLs: string[]; // Parsed blob URLs of each frame, arranged according to the order of data inside the ANI file
  frameInfo: FrameInfo[]; // Duration information and data index for each frame, strictly arranged according to playback order. Playback frame indexes should be taken from here
}
```

The Promise returned by `LoadANICursorPromise` can be processed using the following function:

```typescript
function setLoadedCursorToElement(
  elementSelector: string,
  loadedCursorPromise: Promise<ANIInfo>
): Promise<HTMLStyleElement> {}
```

This function accepts a CSS selector string and the Promise returned by `LoadANICursorPromise`, loads the related content into the document head, and returns a reference to the generated cursor animation style element.
