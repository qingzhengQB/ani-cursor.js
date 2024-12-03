# ani-cursor.js

一个能让你在网站中使用 ani 文件以创建动画鼠标指针的工具 / A tool that allows you to use ani files on your website to create an animated cursor.

~~卑微求 star~~
![Picture](https://raw.githubusercontent.com/qingzhengQB/ani-cursor.js/refs/heads/main/ani_cover.gif)

预览 / Preview: [预览](https://qingzhengqb.github.io/ani-cursor-preview/)

## 引入库 / Getting Started

你可以使用 npm 将其安装到你的项目中 / You can use npm to install it into your project.

```
npm install ani-cursor.js
```

或者在 DOM 头中使用 script 标签来使用该工具 / Or, just use a script tag in the DOM head to use the tool.

```html
<script src="dist/ani-cursor.bundle.js"></script>
```

## 如何使用 / How to Use

使用这个工具非常简单。你只需要使用函数 setANICursor 来将你的 ani 文件应用到你的网页中， 这个函数仅会修改 DOM 头，并不涉及 document 的 body 的 DOM 元素操作，所以你可以在任何位置使用它，不用担心你要设置的动态指针的元素是否已经挂载。/ There are several easy ways to use your ani files. You can use the function setANICursor to apply your ani file, This function only modifies the DOM head and does not involve DOM element manipulation of document's body, so you can use it anywhere.

```javascript
function setANICursor(
  elementSelector,
  aniURL,
  cursorType = "auto",
  width = 32,
  height = 32
) {}
```

第一个参数是你希望应用 ani 文件效果的标签的 CSS 选择器，第二个参数是你的 ani 文件的 URL，第三个参数是你希望在 ani 文件效果失效时的系统鼠标样式，第四、五个参数为鼠标的宽和高。**注意**，由于一些未知的原因，当鼠标的宽和高大于 32 时，如果鼠标仅部分图案而非指针位置移动到指定元素外时，鼠标样式会立即失效，因此不建议修改 / The first parameter is the CSS selector of the element where you want the ani file to take effect. The second parameter is the URL of your ani file. The third parameter is the mouse style you want when the ani file effect is not active. The fourth and fifth parameters are the width and height of the cursor. **Note that**, for some unknown reasons, when the width and height of the cursor exceed 32, the cursor style will immediately become ineffective if only part of the cursor's graphic (not the exactly pointer) moves outside the specified element, so it is not recommended to change it.

这是一个使用示例：/ A usage example:

```javascript
import { setANICursor } from "ani-cursor.js";
setANICursor("body", "/your/ani/file/url.ani");
```

有时我们希望在多个元素中使用 ani 文件，我们可以使用函数 setANICursorWithGroupElement 来使所有指定元素应用同一 ani 文件效果 / Sometimes we want to use the ani file across multiple elements. We can use the function setANICursorWithGroupElement to apply the same ani file effect to all specified elements, and related CSS can be concentrated in a single style block.

```javascript
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

### Vue 使用例

预览网页由 vue 编写，网页仓库的 markdown 有使用例：https://github.com/qingzhengQB/ani-cursor-preview

## 更多 API / More APIs

```javascript
function LoadANICursorPromise(
  aniURL,
  cursorType = "auto",
  width = 32,
  height = 32
) {}
```

你可以使用它来加载一个 ani 文件。运行该函数后，会返回一个等待 then 运行的 Promise，并为 then 中的 resolve 变量赋值为一个包含相关加载信息的对象 / You can use it to load an ani file. After running this function, it will return a Promise that waits for then to be executed, and assigns a value to the resolve variable in then as an object containing relevant loading information。

```
{
  KeyFrameContent, //由加载的ani文件定义的动画的内容 / The content of the animation defined by the loaded ani file
  aniURLRegexClassName, //在生成动画时，会根据ani文件的URL生成一个对应的类名，加载完时这个类名没有任何内容 / When generating animations, a corresponding class name will be generated based on the URL of the ani file, and this class name will have no content when loaded
  keyframesName, // 定义的动画的名称 / The name of the defined animation
  totalRoundTime, // 动画一次循环所需时间 / The time required for one cycle of animation
}
```

返回的 Promise 可以使用以下函数处理：/The returned Promise can be handled using the following functions:

```javascript
function setLoadedCursorToElement(elementSelector, loadedCursorPromise) {}
```

该函数接收一个 CSS 选择器字符串和 LoadANICursorPromise 返回的 Promise，并将相关内容加载到 DOM 头中。除此之外，还有其他函数能够处理返回的 Promise / This function takes a CSS selector string and the Promise returned by LoadANICursorPromise, and loads the relevant content into the DOM head. In addition, there are other functions that can handle the returned Promise:

```javascript
function setLoadedCursorDefault(loadedCursorPromise) {}
```

该函数仅会将动画设置到根据 ani 文件 URL 生成的类名下，不会做其他额外操作 / This function only sets the animation to the class generated based on the ani file URL and does not perform any additional operations.
