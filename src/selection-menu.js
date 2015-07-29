/**!
 * SelectionMenu 3.1.0
 *
 * Displays a context menu when the user selects some text on the page
 * https://github.com/idorecall/selectionmenu
 *
 * @author	[Dan Dascalescu](http://github.com/dandv) for iDoRecall
 * @license MIT
 *
 * Inspired by work by Mathias Schäfer (aka molily) - http://github.com/molily/selectionmenu
 */

// https://github.com/umdjs/umd/blob/master/amdWeb.js
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.SelectionMenu = factory();
    }
}(this, function () {

    /**
     * Add the window scroll position to a rectangle
     * @param rect
     * @returns {{top: number, left: number, bottom: number, right: number, width: number, height: number}}
     */
    function addScroll(rect) {
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset,
            bottom: rect.bottom + window.pageYOffset,
            right: rect.right + window.window.pageXOffset,
            width: rect.width,
            height: rect.height
        }
    }

    /**
     * Get the absolutely-positioned bounding rectangle (top, left, bottom, right, width, height) that contains the
     * selection, even if the selection crosses nodes and its start and end have different parents. Takes scrolling
     * into account.
     * Note that the native window.getSelection().getRangeAt(0).getBoundingClientRect() overshoots towards the end
     * if the selection spans nodes with different parents, e.g. a <p> and the next <h1>.
     * Inspiration: http://stackoverflow.com/questions/6846230/coordinates-of-selected-text-in-browser-page/6847328#6847328
     * See how Selection Range clientRects work at http://codepen.io/dandv/pen/bdxgVj
     * @param sel
     * @param {object} [options] - Return only the height (shortcuts going through all the rectangles that make uo
     * the selection.
     * @returns {object|number} The rectangle or the height
     */
    function getSelectionBoundingRect(sel, options) {
        sel = sel || window.getSelection();
        if (sel.rangeCount) {
            var range = sel.getRangeAt(0);
            if (range.getClientRects) {
                var rectangles = range.getClientRects();  // https://developer.mozilla.org/en-US/docs/Web/API/Element/getClientRects
                if (rectangles.length > 0) {
                    var r0 = rectangles[0], rlast = rectangles[rectangles.length -1];
                    var rect = addScroll({
                        top: r0.top,
                        left: r0.left,
                        right: r0.right,
                        bottom: rlast.bottom
                    });
                    rect.height = rect.bottom - rect.top;
                    if (options.justHeight) return rect.height;
                    // A 3-line selection may start at the last word in the line, continue with a full line, and end
                    // after the first word of the next line. Its width is that of the middle line.
                    for (var i = 1; i < rectangles.length; i++) {
                        var ri = rectangles[i];
                        if (ri.left < rect.left) rect.left = ri.left;
                        if (ri.right > rect.right) rect.right = ri.right;
                    }

                    // Finally, calculate the width and height
                    rect.width = rect.right - rect.left;

                    // Return the first and last rectanges too, if requested
                    var ret = {rect: rect};
                    if (options.first) ret.first = addScroll(r0);
                    if (options.last) ret.last = addScroll(rlast);
                    return ret.first || ret.last ? ret : rect;
                }
            }
        }
    }

    /**
     * Create an absolutely-positioned element
     * @param clientRect
     * @param {boolean} [addScroll=false] Whether to add window.page[XY]Offset
     * @returns {Element}
     */
    function createAbsoluteElement(clientRect, addScroll) {
        var span = document.createElement('span');
        span.style.position = 'absolute';
        span.style.top = clientRect.top + (addScroll ? window.pageYOffset : 0) + 'px';
        span.style.left = clientRect.left + (addScroll ? window.pageXOffset : 0) + 'px';
        span.style.width = clientRect.width + 'px';
        span.style.height = clientRect.height + 'px';
        return span;
    }

    // Main constructor function
    function SelectionMenu(options) {
        var instance = this;

        // Copy members from the options object to the instance
        instance.id = options.id || 'selection-menu';  // TODO check if reused by multiple menus. Or return the menu from the constructor?
        instance.menuHTML = options.menuHTML;
        instance.minlength = options.minlength || 5;
        instance.maxlength = options.maxlength || Infinity;
        instance.container = options.container;
        instance.handler = options.handler;
        instance.onselect = options.onselect;
        instance.debug = options.debug;

        // "Private" instance variables
        instance._span = null;  // a <span> that will roughly cover the selected text, and is destroyed on menu close
        instance._drop = null;  // HubSpot Drop (popover) object that contains the actual menu; attached to the span

        // Initialisation
        instance.setupEvents();
    }

    SelectionMenu.prototype = {

        mouseOnMenu: function (event) {
            // Is the target element the menu, or contained in it?
            return this._drop && (event.target === this._drop.content || this._drop.content.contains(event.target));
        },

        /**
         * Show the menu
         * @param {MouseEvent} event
         */
        show: function (event) {
            var instance = this;

            if (instance._span) return;

            // Abort if the mouse event occurred at the menu itself
            if (instance.mouseOnMenu(event)) return;

            // Get the selected text
            instance.selectedText = window.getSelection().toString();

            // Abort if the selected text is too short or too long
            if (instance.selectedText.length < instance.minlength || instance.selectedText.length > instance.maxlength) {
                return;
            }

            // Call the onselect handler to give it a chance to modify the menu
            instance.onselect && instance.onselect.call(instance, event);

            // Get the start and end nodes of the selection
            var sel = window.getSelection();
            var range = sel.getRangeAt(0);

            // Abort if we got bogus values
            if (!sel.anchorNode) return;

            // From https://github.com/xdamman/selection-sharer/blob/df6fbba6b49b1b59596fe7bfc5851fc7298c68cf/src/selection-sharer.js#L45
            // We can't detect backwards selection within the same node with range.endOffset < rangeStartOffset because they're always sorted
            var rangeTemp = document.createRange();
            rangeTemp.setStart(sel.anchorNode, sel.anchorOffset);
            rangeTemp.setEnd(sel.focusNode, sel.focusOffset);
            instance.selectionDirection = rangeTemp.collapsed ? 'backward' : 'forward';
            if (instance.debug) console.log('Showing menu for', instance.selectionDirection, 'selection');

            var selRects = getSelectionBoundingRect(sel, {first: true, last: true});
            instance._span = createAbsoluteElement(selRects.rect);
            instance._span.style.zIndex = '-99999';
            document.body.appendChild(instance._span);

            if (instance.debug) {
                console.log('Appended the overlay span');
                instance._span.style.backgroundColor = 'yellow';
                var sfirst = createAbsoluteElement(selRects.first);
                sfirst.className = 'selection-menu-debug';
                sfirst.style.backgroundColor = 'green';
                sfirst.style.zIndex = '-99999';
                document.body.appendChild(sfirst);

                var slast = createAbsoluteElement(selRects.last);
                slast.className = 'selection-menu-debug';
                slast.style.backgroundColor = 'red';
                slast.style.zIndex = '-99999';
                document.body.appendChild(slast);

                console.log('Selection.rect:', selRects.rect);
                console.log('Selection.last:', selRects.last);
            }

            // Menu positioning - watch https://github.com/HubSpot/drop/issues/100#issuecomment-122701509 for better options
            // We're mirroring the out-of-bounds CSS classes for the Drop arrows theme for now
            // TODO aligns correctly with the span AFTER the first popup is rendered or after scroll, but the first one is 16px off
            instance._drop = new Drop({
                target: instance._span,
                content: instance.menuHTML,
                classes: 'drop-theme-idr selection-menu',
                position: instance.selectionDirection === 'forward' ? 'bottom center' : 'top center',
                tetherOptions: {
                    targetAttachment: instance.selectionDirection === 'forward' ? 'bottom right' : 'top left',
                    targetOffset: instance.selectionDirection === 'forward'
                      ? '0 ' + (selRects.last.right - selRects.rect.right) + 'px'  // the offset isn't flipped - https://github.com/HubSpot/tether/issues/106
                      : '0 ' + (selRects.first.left - selRects.rect.left) + 'px'
                },
                openOn: 'always'
            });

            // Register the handler for clicks on the menu
            instance._drop.content.addEventListener('click', function (e) {
                instance.handler.call(instance, e);
                return false;
            });
        },

        setupEvents: function () {
            var instance = this;

            // Hide the menu on mouse down *anywhere* (not just on the container) because the browser will
            // clear the selection. This does mean that the library can't support more than one *open* menu
            // at the same time, but it does support multiple menus as long as only one is open at a time.
            // Chrome 43 hides the selection inconsistently on mousedown or mouseup:
            // https://code.google.com/p/chromium/issues/update.do?id=512408
            document.body.addEventListener('mousedown', function (event) {
                // Except, don't hide yet if the click occurs on the menu; the caller will
                if (instance._span && !instance.mouseOnMenu(event)) instance.hide(event);
            });

            // Insert the menu on mouseup given some text is selected
            instance.container.addEventListener('mouseup', function (event) {
                // don't show right on onmouseup because the selection may still be on; wait for things to settle
                window.setTimeout(function () {
                    instance.show(event);
                }, 10);
            });
        },

        hide: function (event) {
            var instance = this;
            if (instance.debug) console.log('Hiding...');

            // Remove the selection span
            if (instance._span) {
                document.body.removeChild(instance._span);
                instance._span = null;
            }

            // Remove the HubSpot Drop menu
            instance._drop && instance._drop.destroy();
            instance._drop = null;
            // Clear the selection just in case (e.g. if the user clicked a link in a menu that opened a new tab)
            window.getSelection().removeAllRanges();
        }

    };

    // Return the constructor function
    return SelectionMenu;

}));
