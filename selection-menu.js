/**!
 * SelectionMenu 2.0
 *
 * Displays a context menu when the user selects some text on the page
 * https://github.com/idorecall/selectionmenu (fork of http://github.com/molily/selectionmenu)
 *
 * @author	Mathias Schäfer (aka molily) http://molily.de/
 * @license MIT
 *
 * Modernized by [Dan Dascalescu](http://github.com/dandv) for iDoRecall
 */

// https://github.com/umdjs/umd/blob/master/amdWeb.js
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.SelectionMenu = factory();
    }
}(this, function () {

    // The menu element which is inserted when selecting text
    var span = null;

    function mouseOnMenu(e) {
        // Is the target element the menu, or contained in it?
        return e.target == span || span.contains(e.target);
    }

    // Main constructor function
    function SelectionMenu(options) {
        var instance = this;

        // Copy members from the options object to the instance
        instance.id = options.id || 'selection-menu';
        instance.menuHTML = options.menuHTML;
        instance.minlength = options.minlength || 5;
        instance.maxlength = options.maxlength || Infinity;
        instance.container = options.container;
        instance.handler = options.handler;
        instance.onselect = options.onselect;

        // Initialisation
        instance.create();
        instance.setupEvents();
    }

    SelectionMenu.prototype = {

        create: function () {
            var instance = this;

            // Create the menu container if necessary
            if (span) return;

            span = document.createElement('span');
            span.id = instance.id;

            // Prevent selecting the text of the menu
            span.style.webkitUserSelect = span.style.webkitTouchCallout = span.style.mozUserSelect = span.style.msUserSelect = 'none';
            span.setAttribute('unselectable', 'on');  // legacy IE - https://msdn.microsoft.com/en-us/library/hh801966%28v=vs.85%29.aspx

            // Absolute positioning is required
            span.style.position = 'absolute';
            span.style.zIndex = 16777271;
        },

        // Register the handler for clicks on the menu
        setupMenuEvents: function () {
            var instance = this;

            span.addEventListener('click', function (e) {
                instance.handler.call(instance, e);
                return false;
            });
        },

        // From https://github.com/xdamman/selection-sharer/blob/df6fbba6b49b1b59596fe7bfc5851fc7298c68cf/src/selection-sharer.js#L45
        selectionDirection: function (selection) {
            var sel = selection || window.getSelection();
            if (!sel.anchorNode) return null;
            var range = document.createRange();
            range.setStart(sel.anchorNode, sel.anchorOffset);
            range.setEnd(sel.focusNode, sel.focusOffset);
            return range.collapsed ? 'backward' : 'forward';
        },

        insert: function (e) {
            var instance = this;

            // Abort if the mouse event occurred at the menu itself
            if (mouseOnMenu(e)) return;

            // Get the selected text
            instance.selectedText = window.getSelection().toString();

            // Abort if the selected text is too short or too long
            if (instance.selectedText.length < instance.minlength || instance.selectedText.length > instance.maxlength) {
                instance.hide(e);
                return;
            }

            // Call the onselect handler to give it a chance to modify the menu
            instance.onselect && instance.onselect.call(instance, e);

            // Fill the menu span
            var range = window.getSelection().getRangeAt(0);

            // Get the start and end nodes of the selection
            var startNode = range.startContainer;
            var endNode = range.endContainer;

            if (!(startNode && endNode && startNode.compareDocumentPosition)) {
                // Abort if we got bogus values or we can't compare their document position
                return;
            }

            var popoverNode, popoverOffset;
            if (this.selectionDirection() === 'forward') {
                popoverNode = endNode;
                popoverOffset = range.endOffset
            } else {
                popoverNode = startNode;
                popoverOffset = Math.max(range.startOffset - 1, 0);
            }

            // If the end node is an element, use its last text node as the end offset
            if (popoverNode.nodeType == 1) {
                popoverNode = popoverNode.lastChild;
                if (!popoverNode || popoverNode.nodeType != 3) {
                    return;
                }
                popoverOffset = popoverNode.data.length;
            }

            // Create a new empty Range
            var newRange = document.createRange();

            // Move the beginning of the new Range to the end of the selection
            newRange.setStart(popoverNode, popoverOffset);

            // Fill the menu span
            span.innerHTML = instance.menuHTML;

            // Inject the span element into the new Range
            newRange.insertNode(span);

            // Menu positioning
            instance.position();
        },

        setupEvents: function () {
            var instance = this;
            var container = instance.container;

            // Hide the menu on mouse down *anywhere* because the browser will clear the selection
            document.addEventListener('mousedown', function (e) {
                instance.hide(e);
            });

            // Insert the menu on mouseup given some text is selected
            container.addEventListener('mouseup', function (e) {
                instance.insert(e);

                // After a delay, check if the text was deselected. This happens if the user
                // selects with the mouse, extends the selection with the keyboard, then clicks
                window.setTimeout(function () {
                    instance.hideIfNoSelection();
                }, 10);

            });

            instance.setupMenuEvents();
        },

        hide: function (e) {
            // Abort if an event object was passed and the click hit the menu itself
            if (e && mouseOnMenu(e))
                return;

            // Is the element attached to the DOM tree?
            var parent = span.parentNode;
            if (parent) {
                // Remove the element from DOM
                parent.removeChild(span);
                // The element object remains in memory and will be reused later
            }
        },

        hideIfNoSelection: function () {
            var instance = this;
            var selection = window.getSelection();
            if (!selection || !selection.toString().length)
                instance.hide();
        },

        position: function () {
            span.style.marginTop = -(span.offsetHeight + 5) + 'px';
        }
    };

    // Return the constructor function
    return SelectionMenu;

}));
