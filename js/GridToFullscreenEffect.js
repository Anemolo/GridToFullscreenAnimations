/**
 * A grid items to fullscreen transition
 * @module GridToFullscreenEffect
 * @author Daniel Velasquez
 * @version 1.0.0
 */

class GridToFullscreenEffect {
  /**
    Initializes instance variables. 
    @param {HTMLDivElement} container - Container of the webGL canvas.
    @param {HTMLDivElement} itemsWrapper - Container of the grid items.
    @param {object} options - A configuration object. 
   */
  constructor(container, itemsWrapper, options = {}) {
    this.container = container;
    this.itemsWrapper = itemsWrapper;

    this.initialised = false;
    this.camera = null;
    this.scene = null;
    this.renderer = null;

    options.scrollContainer = options.scrollContainer || null;

    options.timing = options.timing || {};
    options.timing.type = options.timing.type || "sameEnd";
    options.timing.sections = options.timing.sections || 1;
    options.timing.latestStart = options.timing.latestStart || 0.5;
    options.timing.duration = options.timing.duration || 1;

    options.transformation = options.transformation || {};
    options.transformation.type = options.transformation.type || "none";
    options.transformation.props = options.transformation.props || {};

    options.activation.type = options.activation.type || "topLeft";

    options.seed = options.seed || 0;

    options.easings = options.easings || {};
    options.easings.toFullscreen =
      options.easings.toFullscreen || Power0.easeNone;
    options.easings.toGrid = options.easings.toGrid || Power0.easeNone;

    options.flipBeizerControls = options.flipBeizerControls || {};

    options.flipBeizerControls.c0 = options.flipBeizerControls.c0 || {};
    options.flipBeizerControls.c0.x = options.flipBeizerControls.c0.x || 0.5;
    options.flipBeizerControls.c0.y = options.flipBeizerControls.c0.y || 0.5;

    options.flipBeizerControls.c1 = options.flipBeizerControls.c1 || {};
    options.flipBeizerControls.c1.x = options.flipBeizerControls.c1.x || 0.5;
    options.flipBeizerControls.c1.y = options.flipBeizerControls.c1.y || 0.5;

    this.options = options;

    this.uniforms = {
      uImage: new THREE.Uniform(null),
      uImageRes: new THREE.Uniform(new THREE.Vector2(1, 1)),
      uImageLarge: new THREE.Uniform(null),
      uImageLargeRes: new THREE.Uniform(new THREE.Vector2(1, 1)),

      // Calculated Uniforms
      uProgress: new THREE.Uniform(0),
      uMeshScale: new THREE.Uniform(new THREE.Vector2(1, 1)),
      uPlaneCenter: new THREE.Uniform(new THREE.Vector2(0, 0)),
      uViewSize: new THREE.Uniform(new THREE.Vector2(1, 1)),
      uScaleToViewSize: new THREE.Uniform(new THREE.Vector2(1, 1)),
      uClosestCorner: new THREE.Uniform(0),
      uMouse: new THREE.Uniform(new THREE.Vector2(0, 0)),

      // Option Uniforms
      uSeed: new THREE.Uniform(options.seed),
      uProgressByParts: new THREE.Uniform(options.timing.type === "sections"),
      uActivationParts: new THREE.Uniform(options.timing.sections),
      uSyncLatestStart: new THREE.Uniform(options.timing.latestStart),
      uBeizerControls: new THREE.Uniform(
        new THREE.Vector4(
          options.flipBeizerControls.c0.x,
          options.flipBeizerControls.c0.y,
          options.flipBeizerControls.c1.x,
          options.flipBeizerControls.c1.y
        )
      )
    };

    this.textures = [];

    this.currentImageIndex = -1;
    this.isFullscreen = false;
    this.isAnimating = false;

    this.onResize = this.onResize = this.onResize.bind(this);
  }
  resetUniforms() {
    this.uniforms.uMeshScale.value = new THREE.Vector2(1, 1);
    this.uniforms.uPlaneCenter.value = new THREE.Vector2(0, 0);
    this.uniforms.uScaleToViewSize.value = new THREE.Vector2(1, 1);
    this.uniforms.uClosestCorner.value = 0;
    this.uniforms.uMouse.value = new THREE.Vector2(0, 0);

    this.uniforms.uImage.value = null;
    this.uniforms.uImageRes.value = new THREE.Vector2(1, 1);
    this.uniforms.uImageLarge.value = null;
    this.uniforms.uImageLargeRes.value = new THREE.Vector2(1, 1);

    const mesh = this.mesh;
    mesh.scale.x = 0.00001;
    mesh.scale.y = 0.00001;
    mesh.position.x = 0;
    mesh.position.y = 0;
  }
  /**
    An image 
    @typedef {Object} ImageObject
    @property {HTMLImageElement} element - Html element of image
    @property {Image} image - Image object

    An set of small and large image
    @typedef {Object} ImageSet
    @property {ImageObject} small - Small image element
    @property {ImageObject} small - Large image element
  
   */
  /**
    Creates the textures for the plane and sets them if needed.
    @param {imageSet[]} images - Small and large images of grid items.
   */
  createTextures(images) {
    const textures = [];
    for (let i = 0; i < images.length; i++) {
      const imageSet = images[i];
      const largeTexture = new THREE.Texture(imageSet.large.image);

      // So It doesnt get resized to the power of 2
      largeTexture.generateMipmaps = false;
      largeTexture.wrapS = largeTexture.wrapT = THREE.ClampToEdgeWrapping;
      largeTexture.minFilter = THREE.LinearFilter;
      largeTexture.needsUpdate = true;
      const smallTexture = new THREE.Texture(imageSet.small.image);
      smallTexture.generateMipmaps = false;
      smallTexture.wrapS = smallTexture.wrapT = THREE.ClampToEdgeWrapping;
      smallTexture.minFilter = THREE.LinearFilter;
      smallTexture.needsUpdate = true;
      const textureSet = {
        large: {
          element: imageSet.large.element,
          texture: largeTexture
        },
        small: {
          element: imageSet.small.element,
          texture: smallTexture
        }
      };

      textures.push(textureSet);
    }
    this.textures = textures;
    this.setCurrentTextures();
  }
  /**
    Sets the correct textures to the uniforms. And renders if not in a loop
   */
  setCurrentTextures() {
    if (this.currentImageIndex === -1) return;
    const textureSet = this.textures[this.currentImageIndex];
    this.uniforms.uImage.value = textureSet.small.texture;
    this.uniforms.uImageRes.value.x =
      textureSet.small.texture.image.naturalWidth;
    this.uniforms.uImageRes.value.y =
      textureSet.small.texture.image.naturalHeight;
    this.uniforms.uImageLarge.value = textureSet.large.texture;
    this.uniforms.uImageLargeRes.value.x =
      textureSet.large.texture.image.naturalWidth;
    this.uniforms.uImageLargeRes.value.y =
      textureSet.large.texture.image.naturalHeight;
    if (!this.isAnimating) {
      this.render();
    }
  }
  /**
    Initiates THREEJS objects and adds listeners to the items
   */
  init() {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.z = 50;
    this.camera.lookAt = this.scene.position;

    const viewSize = this.getViewSize();
    this.uniforms.uViewSize.value = new THREE.Vector2(
      viewSize.width,
      viewSize.height
    );

    const segments = 128;
    var geometry = new THREE.PlaneBufferGeometry(1, 1, segments, segments);
    function isFunction(functionToCheck) {
      return (
        functionToCheck &&
        {}.toString.call(functionToCheck) === "[object Function]"
      );
    }
    const transformation = isFunction(this.options.transformation.type)
      ? this.options.transformation.type(this.options.transformation.props)
      : transformations[this.options.transformation.type](
          this.options.transformation.props
        );
    const shaders = generateShaders(
      activations[this.options.activation.type],
      transformation
    );

    var material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: shaders.vertex,
      fragmentShader: shaders.fragment,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    window.addEventListener("resize", this.onResize);
    if (this.options.scrollContainer) {
      this.options.scrollContainer.addEventListener("scroll", ev => {
        this.recalculateUniforms(ev);
      });
    }

    for (let i = 0; i < this.itemsWrapper.children.length; i++) {
      const image = this.itemsWrapper.children[i].children[0];
      image.addEventListener("mousedown", this.createOnMouseDown(i));
    }
  }
  /**
    Creates a listener that sends item to fullscreen when activated. 
    @return {function} Event listener
   */
  createOnMouseDown(itemIndex) {
    return ev => {
      this.toFullscreen(itemIndex, ev);
    };
  }
  /*
    Tweens the plane to grid position if on fullscreen 
  */
  toGrid() {
    if (!this.isFullscreen || this.isAnimating) return;

    this.isAnimating = true;
    if (this.options.onToGridStart)
      this.options.onToGridStart({ index: this.currentImageIndex });
    this.tween = TweenLite.to(
      this.uniforms.uProgress,
      this.options.timing.duration,
      {
        value: 0,
        ease: this.options.easings.toGrid,
        onUpdate: () => {
          this.render();
        },
        onComplete: () => {
          this.isAnimating = false;
          this.isFullscreen = false;
          this.itemsWrapper.style.zIndex = 1;
          this.container.style.zIndex = 0;
          this.resetUniforms();
          this.render();
          if (this.options.onToGridFinish)
            this.options.onToGridFinish({
              index: -1,
              lastIndex: this.currentImageIndex
            });
          this.currentImageIndex = -1;
        }
      }
    );
  }
  recalculateUniforms(ev) {
    if (this.currentImageIndex === -1) return;

    const rect = this.itemsWrapper.children[
      this.currentImageIndex
    ].children[0].getBoundingClientRect();
    const mouseNormalized = {
      x: (ev.clientX - rect.left) / rect.width,
      // Allways invert Y coord
      y: 1 - (ev.clientY - rect.top) / rect.height
    };

    const xIndex = rect.left > window.innerWidth - (rect.left + rect.width);
    const yIndex = rect.top > window.innerHeight - (rect.top + rect.height);

    const closestCorner = xIndex * 2 + yIndex;
    this.uniforms.uClosestCorner.value = closestCorner;
    this.uniforms.uMouse.value = new THREE.Vector2(
      mouseNormalized.x,
      mouseNormalized.y
    );

    const viewSize = this.getViewSize();
    const widthViewUnit = (rect.width * viewSize.width) / window.innerWidth;
    const heightViewUnit = (rect.height * viewSize.height) / window.innerHeight;
    // x and y are based on top left of screen. While ThreeJs is on the center
    const xViewUnit =
      (rect.left * viewSize.width) / window.innerWidth - viewSize.width / 2;
    const yViewUnit =
      (rect.top * viewSize.height) / window.innerHeight - viewSize.height / 2;

    const geometry = this.mesh.geometry;
    const mesh = this.mesh;

    // // The plain's size is initially 1. So the scale is the new size

    mesh.scale.x = widthViewUnit;
    mesh.scale.y = heightViewUnit;

    // // Move the object by its top left corner, not the center
    let x = xViewUnit + widthViewUnit / 2;
    let y = -yViewUnit - heightViewUnit / 2;

    // geometry.translate(x, y, 0);
    mesh.position.x = x;
    mesh.position.y = y;

    // Used to scale the plane from the center
    // divided by scale so when later scaled it looks fine
    this.uniforms.uPlaneCenter.value.x = x / widthViewUnit;
    this.uniforms.uPlaneCenter.value.y = y / heightViewUnit;

    this.uniforms.uMeshScale.value.x = widthViewUnit;
    this.uniforms.uMeshScale.value.y = heightViewUnit;

    this.uniforms.uScaleToViewSize.value.x = viewSize.width / widthViewUnit - 1;
    this.uniforms.uScaleToViewSize.value.y =
      viewSize.height / heightViewUnit - 1;
  }
  toFullscreen(itemIndex, ev) {
    if (this.isFullscreen || this.isAnimating) return;

    this.isAnimating = true;
    this.currentImageIndex = itemIndex;

    this.recalculateUniforms(ev);

    if (this.textures[itemIndex]) {
      const textureSet = this.textures[itemIndex];
      this.uniforms.uImage.value = textureSet.small.texture;
      this.uniforms.uImageRes.value.x =
        textureSet.small.texture.image.naturalWidth;
      this.uniforms.uImageRes.value.y =
        textureSet.small.texture.image.naturalHeight;
      this.uniforms.uImageLarge.value = textureSet.large.texture;
      this.uniforms.uImageLargeRes.value.x =
        textureSet.large.texture.image.naturalWidth;
      this.uniforms.uImageLargeRes.value.y =
        textureSet.large.texture.image.naturalHeight;
    }
    this.itemsWrapper.style.zIndex = 0;
    this.container.style.zIndex = 2;

    if (this.options.onToFullscreenStart)
      this.options.onToFullscreenStart({ index: this.currentImageIndex });

    this.tween = TweenLite.to(
      this.uniforms.uProgress,
      this.options.timing.duration,
      {
        value: 1,
        ease: this.options.easings.toFullscreen,
        onUpdate: () => {
          this.render();
        },
        onComplete: () => {
          this.isAnimating = false;
          this.isFullscreen = true;
          if (this.options.onToFullscreenFinish)
            this.options.onToFullscreenFinish({
              index: this.currentImageIndex
            });
        }
      }
    );
  }
  /**
    Gives the width and height of the current camera's view.
    @typedef {Object} Size
    @property {number} width
    @property {number} height

    @return {Size} The size of the camera's view

   */
  getViewSize() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    const height = Math.abs(
      this.camera.position.z * Math.tan(fovInRadians / 2) * 2
    );

    return { width: height * this.camera.aspect, height };
  }
  /**
    Renders ThreeJS to the canvas.
  */
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  /**
    Resize Event Listener.
    Updates anything that uses the window's size.
    @param {Event} ev resize event 
   */
  onResize(ev) {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.currentImageIndex > -1) {
      this.recalculateUniforms(ev);
      this.render();
    }
  }
}

var activations = {
  corners: `
    float getActivation(vec2 uv){
      float top = (1.-uv.y);
      float right = uv.x;
      float bottom = uv.y;
      float left = 1.- uv.x;

      return top *0.333333 + (right * 0.333333 + (right * bottom)*0.666666 );
  }
  `,
  topLeft: `
    float getActivation(vec2 uv){
        return (+uv.x-uv.y+1.)/2.;
    }
  `,
  sides: `
      float getActivation(vec2 uv){
        return min(uv.x, 1.-uv.x) * 2.;
      }
  `,
  left: `
    float getActivation(vec2 uv){
        return uv.x;
    }
    `,
  top: `
    float getActivation(vec2 uv){
        return 1. - uv.y;
    }
    `,
  bottom: `
    float getActivation(vec2 uv){
        return uv.y;
    }
    `,
  bottomStep: `
    float getActivation(vec2 uv){
        
        
        return uv.y;
    }
    `,
  sinX: `
      float getActivation(vec2 uv){
        return sin(uv.x * 3.14);
      }
    `,
  center: `
      float getActivation(vec2 uv){
        float maxDistance = distance(vec2(0.),vec2(0.5));
        float dist = distance(vec2(0.), uv-0.5);
        return smoothstep(0.,maxDistance,dist);
      }
    `,
  mouse: `
      float getActivation(vec2 uv){
        float maxDistance = distance(uMouse, 1.-floor(uMouse+0.5));
        float dist = smoothstep(0.,maxDistance,distance(uMouse,uv));
        return dist;
      }
    `,
  closestCorner: `
      float getActivation(vec2 uv){

        float y = mod(uClosestCorner,2.) *2. -1.;
        float x = (floor(uClosestCorner /2.)*2.-1.)*-1.;

        float xAct = abs(min(0.,x)) + uv.x * x;
        float yAct = abs(min(0.,y)) + uv.y * y;

        return (xAct+yAct)/2.;
      }
    `,
  closestSide: `
      float getActivation(vec2 uv){

        float y = mod(uClosestCorner,2.) *2. -1.;
        float x = (floor(uClosestCorner /2.)*2.-1.)*-1.;

        float xAct = abs(min(0.,x)) + uv.x * x;
        float yAct = abs(min(0.,y)) + uv.y * y;

        return (xAct+yAct)/2.;
      }
    `
};
function ensureFloat(num) {
  let stringed = num.toString();
  const dotIndex = stringed.indexOf(".");
  if (dotIndex === -1) {
    stringed += ".";
  }
  return stringed;
}
const transformations = {
  none: () => null,
  flipX: () => {
    // Only works with sync ending
    return `
    
        float beizerProgress = cubicBezier(vertexProgress,
        uBeizerControls.x,uBeizerControls.y,
        uBeizerControls.z,uBeizerControls.w);

        float flippedX = -transformedPos.x;
        transformedPos.x = mix (transformedPos.x, flippedX,beizerProgress );
          
          // Flip texture on flipped sections 
        // float activationAtX0 = getActivation(vec2(0.,transformedUV.y));
        // float activationAtX1 = getActivation(vec2(1.,transformedUV.y));
        //   float syncDifference = 
        //     activationAtX1 * uSyncLatestStart - activationAtX0 * uSyncLatestStart;
          float syncDifference =  uSyncLatestStart;
            
            // Flip the controls because who knows why
            // But it works exactly

          // Multiply by aspect ratio to account for mesh scaling
          float aspectRatio = (uMeshScale.x / uMeshScale.y);
          float stepFormula = 0.5 - (syncDifference * uSyncLatestStart * uSyncLatestStart) * aspectRatio;

          transformedUV.x = mix(transformedUV.x,1.-transformedUV.x,
              step(stepFormula,beizerProgress));
      `;
  },
  simplex: props => {
    let seed = ensureFloat(props.seed || 0);
    let amplitudeX = ensureFloat(props.amplitudeX || 0.5);
    let amplitudeY = ensureFloat(props.amplitudeY || 0.5);
    let frequencyX = ensureFloat(props.frequencyX || 1);
    let frequencyY = ensureFloat(props.frequencyY || 0.75);
    let progressLimit = ensureFloat(props.progressLimit || 0.5);
    return `
      float simplexProgress = min(clamp((vertexProgress) / ${progressLimit},0.,1.),clamp((1.-vertexProgress) / (1.-${progressLimit}),0.,1.));
      simplexProgress = smoothstep(0.,1.,simplexProgress);
      float noiseX = snoise(vec2(transformedPos.x +uSeed, transformedPos.y + uSeed + simplexProgress * 1.) * ${frequencyX} ) ;
      float noiseY = snoise(vec2(transformedPos.y +uSeed, transformedPos.x + uSeed + simplexProgress * 1.) * ${frequencyY}) ;
      transformedPos.x += ${amplitudeX} * noiseX * simplexProgress;
      transformedPos.y += ${amplitudeY} * noiseY * simplexProgress;
  `;
  },
  wavy: props => {
    const seed = ensureFloat(props.seed || 0);
    const amplitude = ensureFloat(props.amplitude || 0.5);
    const frequency = ensureFloat(props.frequency || 4);
    return `
      float limit = 0.5;
      float wavyProgress = min(clamp((vertexProgress) / limit,0.,1.),clamp((1.-vertexProgress) / (1.-limit),0.,1.));

      float dist = length(transformedPos.xy);
      
      float angle = atan(transformedPos.x,transformedPos.y);

      float nextDist = dist * (${amplitude} * (sin(angle * ${frequency} + ${seed}) /2.+0.5)+ 1.);

      transformedPos.x = mix(transformedPos.x,sin(angle) * nextDist ,  wavyProgress);
      transformedPos.y = mix(transformedPos.y,cos(angle) * nextDist,  wavyProgress);
    `;
  },
  circle: props => {
    return `
      float limit = 0.5;
      float circleProgress = min(clamp((vertexProgress) / limit,0.,1.),clamp((1.-vertexProgress) / (1.-limit),0.,1.));

      float maxDistance = 0.5;
      float dist = length(transformedPos.xy);
      
      float nextDist = min(maxDistance,dist);
      float overload = step(maxDistance,dist);
      float angle = atan(transformedPos.x,transformedPos.y);
      
      transformedPos.x = mix(transformedPos.x,sin(angle) * nextDist ,  circleProgress );
      transformedPos.y = mix(transformedPos.y,cos(angle) * nextDist,  circleProgress);
      transformedPos.z += -0.5 * overload * circleProgress;
    
  `;
  }
};
var vertexUniforms = `
    uniform float uProgress;
    uniform vec2 uScaleToViewSize;
    uniform vec2 uPlaneCenter;
    uniform vec2 uMeshScale;
    uniform vec2 uMouse;
    uniform vec2 uViewSize;

    uniform float uClosestCorner;

    // Option Uniforms
    uniform float uSeed;
    uniform vec4 uBeizerControls;
    uniform float uSyncLatestStart;
    uniform float uActivationParts;
    uniform bool uProgressByParts;
    varying vec2 vUv;
    varying vec2 scale; 
    varying float vProgress;
`;
function generateShaders(activation, transform) {
  var vertex = `
    ${vertexUniforms}
    ${cubicBeizer}
    ${simplex}

    ${quadraticBezier}
    

    ${activation}
float linearStep(float edge0, float edge1, float val) {
	float x = clamp( (val  - edge0) / (edge1 - edge0),0.,1.);
		return x;
}
    void main(){

      vec3 pos = position.xyz;
      vec2 newUV = uv;

      float activation = getActivation(uv);



      // Everything ends at the same time
      float startAt = activation * uSyncLatestStart;
      float vertexProgress = smoothstep(startAt,1.,uProgress);


      if(uProgressByParts){
        // Vertex end by parts
        float activationPart = 1./uActivationParts;
        float activationPartDuration = 1./(uActivationParts+1.);

        float progressStart = (activation / activationPart) * activationPartDuration;
        float progressEnd = min(progressStart + activationPartDuration,1.);
        vertexProgress = linearStep(progressStart,progressEnd,uProgress);
      }
        vec3 transformedPos = pos;
        vec2 transformedUV = uv;
        ${transform ? transform : ""}
        pos = transformedPos;
        newUV = transformedUV; 

        // Scale
        // uScaleToViewSize
        scale = vec2(
          1. + uScaleToViewSize * vertexProgress
        );
        // Since we are moving the mesh not the geometry the geometry is in the center
        
        vec2 flippedPos = vec2(
          (- pos.x) ,
          (- pos.y ) 
        );


        
        pos.xy *= scale;


        // Move to center
        // Mesh moves it into position. Shader moves it to the center
        pos.y += -uPlaneCenter.y * vertexProgress;
        pos.x += -uPlaneCenter.x * vertexProgress;

        // Move slightly to the front
        pos.z += vertexProgress;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.);
        vProgress = vertexProgress;
      vUv = newUV;
    }
`;

  var fragment = `
    uniform float uProgress;
    uniform sampler2D uImage;
    uniform vec2 uImageRes;
    uniform sampler2D uImageLarge;
    uniform vec2 uImageLargeRes;
    uniform vec2 uMeshScale;
    
    varying vec2 vUv;
    varying float vProgress;
    varying vec2 scale;


    vec2 preserveAspectRatioSlice(vec2 uv, vec2 planeSize, vec2 imageSize ){
      
        vec2 ratio = vec2(
            min((planeSize.x / planeSize.y) / (imageSize.x / imageSize.y), 1.0),
            min((planeSize.y / planeSize.x) / (imageSize.y / imageSize.x), 1.0)
        );
        
        
        vec2 sliceUvs = vec2(
            uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            uv.y * ratio.y + (1.0 - ratio.y) * 0.5
        );

        return sliceUvs;
    }

    void main(){
 
        vec2 uv = vUv;

        vec2 scaledPlane = uMeshScale * scale;

        
        vec2 smallImageUV = preserveAspectRatioSlice(uv, scaledPlane, uImageRes);

        vec3 color = texture2D(uImage,smallImageUV).xyz;

        if(vProgress > 0.){
          vec2 largeImageUV = preserveAspectRatioSlice(uv, scaledPlane, uImageLargeRes);
          color = mix(color,texture2D(uImageLarge,largeImageUV).xyz, vProgress );
        }

        gl_FragColor = vec4(color,1.);
    }
`;
  return { fragment, vertex };
}

var cubicBeizer = `
// Helper functions:
float slopeFromT (float t, float A, float B, float C){
  float dtdx = 1.0/(3.0*A*t*t + 2.0*B*t + C); 
  return dtdx;
}

float xFromT (float t, float A, float B, float C, float D){
  float x = A*(t*t*t) + B*(t*t) + C*t + D;
  return x;
}

float yFromT (float t, float E, float F, float G, float H){
  float y = E*(t*t*t) + F*(t*t) + G*t + H;
  return y;
}
float cubicBezier (float x, float a, float b, float c, float d){

  float y0a = 0.00; // initial y
  float x0a = 0.00; // initial x 
  float y1a = b;    // 1st influence y   
  float x1a = a;    // 1st influence x 
  float y2a = d;    // 2nd influence y
  float x2a = c;    // 2nd influence x
  float y3a = 1.00; // final y 
  float x3a = 1.00; // final x 

  float A =   x3a - 3.*x2a + 3.*x1a - x0a;
  float B = 3.*x2a - 6.*x1a + 3.*x0a;
  float C = 3.*x1a - 3.*x0a;   
  float D =   x0a;

  float E =   y3a - 3.*y2a + 3.*y1a - y0a;    
  float F = 3.*y2a - 6.*y1a + 3.*y0a;             
  float G = 3.*y1a - 3.*y0a;             
  float H =   y0a;

  // Solve for t given x (using Newton-Raphelson), then solve for y given t.
  // Assume for the first guess that t = x.
  float currentt = x;
  const int nRefinementIterations = 5;
  for (int i=0; i < nRefinementIterations; i++){
    float currentx = xFromT (currentt, A,B,C,D); 
    float currentslope = slopeFromT (currentt, A,B,C);
    currentt -= (currentx - x)*(currentslope);
    currentt = clamp(currentt, 0.,1.);
  } 

  float y = yFromT (currentt,  E,F,G,H);
  return y;
}
`;
var simplex = `
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

var quadraticBezier = `
float quadraticBezier (float x, float a, float b){
  // adapted from BEZMATH.PS (1993)
  // by Don Lancaster, SYNERGETICS Inc. 
  // http://www.tinaja.com/text/bezmath.html

  float epsilon = 0.00001;
  a = max(0., min(1., a)); 
  b = max(0., min(1., b)); 
  if (a == 0.5){
    a += epsilon;
  }
  
  // solve t from x (an inverse operation)
  float om2a = 1. - 2.*a;
  float t = (sqrt(a*a + om2a*x) - a)/om2a;
  float y = (1.-2.*b)*(t*t) + (2.*b)*t;
  return y;
}
`;
