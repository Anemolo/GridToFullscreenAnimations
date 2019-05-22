# Grid to Fullscreen Animations with Three.js

A Demo of the tutorial on "Creating Grid to Fullscreen Animations in Three.js" by Daniel Velasquez.

![Image Title](link)

[Article on Codrops](https://tympanus.net/codrops/?p=)

[Demo](http://tympanus.net/Development//)

## Options

Options used modify the effect and create variations.

```javascript
const options = {
  // Timing of the effect and vertice timing calculation
  timing: {
    // How to calculate the timing of a vertice
    type: "sameEnd", // "sameEnd" | "sections"
    sections: 1, // Number
    latestStart: 0.5, // Normalized number
    // Duration of the effect in seconds
    duration: 1 // Number of seconds
  },
  // Plane transformations
  transformation: {
    type: "none", // "flipX" | "flipY" | etc...
    props: {} // transformation type especific props
  },
  // The plane activation used with timing
  activation: {
    type: "topLeft" // "top" | "left" | "topleft" | etc...
  },
  // General seed for some effects
  seed: 0, // Number
  // Easings for the effects tweens
  easings: {
    toFullscreen: Power0.easeNone, // gsap EasePack easing
    toGrid: Power0.easeNone // gsap EasePack easing
  },
  // Beizer controls for the flip interpolation
  flipBeizerControls: {
    c0: {
      x: 0.5, // Normalized Number
      y: 0.5 // Normalized Number
    },
    c1: {
      x: 0.5, // Normalized Number
      y: 0.5 // Normalized Number
    }
  }
};
```

## Credits

- [three.js](https://threejs.org/) by Ricardo Cabello
- Images from [Unsplash.com](https://unsplash.com/)
- [GSAP](https://greensock.com/) by Jack Doyle

## License

This resource can be used freely if integrated or build upon in personal or commercial projects such as websites, web apps and web templates intended for sale. It is not allowed to take the resource "as-is" and sell it, redistribute, re-publish it, or sell "pluginized" versions of it. Free plugins built using this resource should have a visible mention and link to the original work. Always consider the licenses of all included libraries, scripts and images used.

## Misc

Follow Daniel: [Twitter](https://twitter.com/Anemolito), [Codepen](https://codepen.io/Anemolo/), [CodeSandbox](https://codesandbox.io/u/Anemolo), [GitHub](https://github.com/Anemolo)

Follow Codrops: [Twitter](http://www.twitter.com/codrops), [Facebook](http://www.facebook.com/codrops), [Google+](https://plus.google.com/101095823814290637419), [GitHub](https://github.com/codrops), [Pinterest](http://www.pinterest.com/codrops/), [Instagram](https://www.instagram.com/codropsss/)

[© Codrops 2019](http://www.codrops.com)
