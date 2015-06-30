# SelectionMenu

SelectionMenu is a small, self-contained, framework-agnostic JavaScript module that displays a custom context menu when the user selects text on the page.

This menu may offer a search feature, dictionary lookup, post to Facebook or similar.

**[Live Demo](http://idorecall.github.io/selection-menu/)**


## History

The motivation for creating this module was having a sleek contextual selection mechanism in the Chrome extension for [iDoRecall](https://idorecall.com). 

This module is largely my fork of [Mathias Schäfer's work from 2011](https://github.com/molily/selectionmenu), brought up to date with modern browsers (Chrome, Firefox, Safari, Opera, IE9+) and the AMD module pattern. [Xavier Damman](https://github.com/xdamman/)'s [selection-sharer](https://github.com/xdamman/selection-sharer) was another influence (detecting the forward vs. backward selection direction).

The idea and the implementation originally resemble the selection context menu on nytimes.com, but the script is way simpler and easier to integrate. 

The script uses the [W3C DOM Range](http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html), which is [available in modern browsers](https://developer.mozilla.org/en-US/docs/Web/API/Range): IE9+, Chrome, Firefox, Safari, Opera.


## Features and differences from the original

* Display the context menu near where the mouse button was released (the original always displayed the menu at the end of the selection, and selection-sharer displays it [asymmetrically](https://github.com/xdamman/selection-sharer/issues/18) and [always at the top of the selection](https://github.com/xdamman/selection-sharer/issues/17))
* Pass any HTML for the context menu, and style it as you want via its id
* Keyboard events are not handled, so that if the user wants to make fine adjustments to the selection with Shift+arrows, the menu will remain near the mouse cursor
* The menu text is made unselectable (fixes a number of [bugs in the original library](https://github.com/molily/selectionmenu/issues/5))
* Supports minimum and maximum selection length ([selection-sharer #10](https://github.com/xdamman/selection-sharer/issues/13))
* Clicking outside the popover *always* closes the menu (fixes [selection-sharer #11](https://github.com/xdamman/selection-sharer/issues/11))
* `onselect` event
* Dynamic menu depending on the content of the selection
* Selection and menu are preserved when scrolling the document via the scrollbar thumb


## Usage

Create an instance of SelectionMenu by calling `new SelectionMenu`.

Pass an object literal with the following options:

* `container` (DOM element): The element where the copy event is observed. Normally that's the main text container.
* `menuHTML` (string): A string of HTML for the menu e.g. a list of links.
* `handler` (function): A handler function which is called when the user clicks on the menu. Use the passed click event to access the click link and respond to the user's action.
* `minlength` (number, optional): Only display the menu if the selected text has at least this length. Defaults to 5 characters.
* `maxlength` (number, optional): Only display the menu if the selected text is at most this long. Defaults to `Infinity`.
* `id` (string, optional): The ID of the menu element which is inserted. Defaults to `selection-menu`.
* `onselect` (function, optional): Custom event generated when the mouse selection changes. Not generated when the selection is changed via the keyboard. Use it to customize the menu dynamically based on the contents of the selection:

    ```js
    new SelectionMenu({
      ...
      onselect: function (e) {
        this.menuHTML = 'Selection length: ' + this.selectedText.length;
      }
    });
    ```

The menu styling is completely up to you. See the `selection-menu.css` in the demos for an example.


## Example

This observes mouseup events on the element with the ID `article`. It inserts a menu
with two links which both have IDs to recognize them. In the handler function, the
selected text is read. Depending on the clicked link, the selected text is
looked up on Google or Bing.

```js
new SelectionMenu({
  container: document.getElementById('article'),
  menuHTML: '<a id="selection-menu-google">Google it</a><a id="selection-menu-bing">Bing</a>',
  handler: function (e) {
    var target = e.target,
      id = target.id,
      selectedText = this.selectedText,
      query = encodeURI(selectedText.replace(/\s/g, '+')),
      searchURI;
    
    if (id === 'selection-menu-google') {
      searchURI = 'http://www.google.com/search?q=';
    } else if (id === 'selection-menu-bing') {
      searchURI = 'http://www.bing.com/search?q=';
    }
    
    location.href = searchURI + query;
  }
});
```

To define menus more flexibly, use a hidden `<div>` in your HTML, and pass its `innerHTML` to SelectionMenu:

```html
<div id="mymenu" hidden>
  <ul>
    <li>Option one
    <li>Option two
  </ul>  
</div>
```

```js
new SelectionMenu({
  container: document.getElementById('article'),
  menuHTML: document.getElementById('mymenu').innerHTML,
  handler: function (e) {
    ...
  }
});
```


## Known issues

* You have to set the `min-width` of the menu manually for now
* In IE10, double clicking and triple clicking to select a word/paragraph no longer work
* [Triple clicking to select a paragraph](https://github.com/molily/selectionmenu/issues/9) lands the menu below the selection


## Upcoming features

* Automatically align right the menu if created near the right border of the container
* Keep menu on-screen if the selection is made near the very top


## License and copyright

Maintainer: Dan Dascalescu ([@dandv](https://github.com/dandv))

Copyright (C) 2015 [iDoRecall](http://idorecall.com), Inc.

The MIT License (MIT)
