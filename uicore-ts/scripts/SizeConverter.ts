
// https://gist.github.com/wKich/25b4a7b23a1f990f8c7d09fec7585b53

// imported from https://github.com/heygrady/Units


import { NO } from "./UIObject"


let preCalculated = false;
let computedValueBug = false;

const defaultView = document.defaultView;
const getComputedStyle = defaultView && defaultView.getComputedStyle;
const runit = /^(-?[\d+\.\-]+)([a-z]+|%)$/i;
const convert = {
    mm2px: 1/25.4,
    cm2px: 1/2.54,
    pt2px: 1/72,
    pc2px: 1/6,
    in2px: undefined,
    mozmm2px: undefined,
};

// convert a value to pixels
// use width as the default property, or specify your own
export default function toPx(element: HTMLElement, value: string, prop = "width", force: boolean = NO): number {
    if (!preCalculated) {
        preCalculated = true;
        preCalculate();
    }
    
    const rem = /r?em/i;
    const unit = (value.match(runit) || [])[2];
    // @ts-ignore
    let conversion = unit === 'px' ? 1 : convert[`${unit}2px`];
    let result;
    
    if (conversion || rem.test(unit) && !force) {
        // calculate known conversions immediately
        // find the correct element for absolute units or rem or fontSize + em or em
        // @ts-ignore
        element = conversion
            ? element
            : unit === 'rem'
                ? document.documentElement
                : prop === 'fontSize'
                    ? element.parentNode || element
                    : element;
        
        // use the pre-calculated
        // conversion or fontSize of the element for rem and em
        conversion = conversion || parseFloat(curCSS(element, 'fontSize'));
        
        // multiply the value by the conversion
        result = parseFloat(value) * conversion;
    } else {
        // begin "the awesome hack by Dean Edwards"
        // @see http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291
        
        // remember the current style
        const style = element.style;
        // @ts-ignore
        const inlineValue = style[prop];
        
        // set the style on the target element
        try {
            // @ts-ignore
            style[prop] = value;
        } catch (e) {
            // IE 8 and below throw an exception when setting unsupported units
            return 0;
        }
        
        // read the computed value
        // if style is nothing we probably set an unsupported unit
        // @ts-ignore
        result = !style[prop] ? 0 : parseFloat(curCSS(element, prop));
        
        // reset the style back to what it was or blank it out
        // @ts-ignore
        style[prop] = inlineValue !== undefined ? inlineValue : null;
    }
    
    // return a number
    return result;
}

function preCalculate() {
    
    // create a test element
    let testElem: HTMLElement | undefined = document.createElement('test');
    const docElement = document.documentElement;
    
    // add the test element to the dom
    docElement.appendChild(testElem);
    
    // test for the WebKit getComputedStyle bug
    // @see http://bugs.jquery.com/ticket/10639
    if (getComputedStyle) {
        // add a percentage margin and measure it
        testElem.style.marginTop = '1%';
        computedValueBug = getComputedStyle(testElem).marginTop === '1%';
    }
    
    // pre-calculate absolute unit conversions
    
    [
        'mozmm2px',
        'in2px',
        'pc2px',
        'pt2px',
        'cm2px',
        'mm2px',
    ].forEach(
        // @ts-ignore
        (conversion) => convert[conversion] = convert[conversion]
            // @ts-ignore
        ? convert[conversion] * convert.in2px
            // @ts-ignore
        : toPx(testElem, `_${conversion}`)
    );
    
    // remove the test element from the DOM and delete it
    docElement.removeChild(testElem);
    
    testElem = undefined;
}

// return the computed value of a CSS property
function curCSS(elem: Element, prop: string): any {
    // @ts-ignore
    const pixel = elem.style[
        `pixel${prop.charAt(0).toUpperCase()}${prop.slice(1)}`
        ];
    let value;
    
    if (getComputedStyle) {
        // FireFox, Chrome/Safari, Opera and IE9+
        // @ts-ignore
        value = getComputedStyle(elem)[prop];
    } else if (pixel) {
        // IE and Opera support pixel shortcuts for
        // top, bottom, left, right, height, width
        // WebKit supports pixel shortcuts only when an absolute unit is used
        value = pixel + 'px';
    } else if (prop === 'fontSize') {
        // correct IE issues with font-size
        // @see http://bugs.jquery.com/ticket/760
        // @ts-ignore
        value = toPx(elem, '1em', 'left', 1) + 'px';
    } else {
        // IE 8 and below return the specified style
        // @ts-ignore
        value = elem.currentStyle[prop];
    }
    
    // check the unit
    const unit = (value.match(runit)||[])[2];
    if (unit === '%' && computedValueBug) {
        // WebKit won't convert percentages for
        // top, bottom, left, right, margin and text-indent
        if (/^top|bottom/.test(prop)) {
            // Top and bottom require measuring the innerHeight of the parent.
            const parent = elem.parentNode || elem;
            const innerHeight = [
                'borderBottom', 'borderTop', 'paddingBottom', 'paddingTop',
            ].reduce(
                // @ts-ignore
                (height, prop) => height - parseFloat(curCSS(parent, prop)),
                // @ts-ignore
                parent.offsetHeight
            );
            value = parseFloat(value) / 100 * innerHeight + 'px';
        } else {
            // This fixes margin, left, right and text-indent
            // @see https://bugs.webkit.org/show_bug.cgi?id=29084
            // @see http://bugs.jquery.com/ticket/10639
            // @ts-ignore
            value = toPx(elem, value);
        }
    } else if (
        (value === 'auto' || (unit && unit !== 'px'))
        && getComputedStyle
    ) {
        // WebKit and Opera will return auto in some cases
        // Firefox will pass back an unaltered value when
        // it can't be set, like top on a static element
        value = 0;
    } else if (unit && unit !== 'px' && !getComputedStyle) {
        // IE 8 and below won't convert units for us
        // try to convert using a prop that will return pixels
        // this will be accurate for everything
        // (except font-size and some percentages)
        // @ts-ignore
        value = toPx(elem, value) + 'px';
    }
    return value;
}


