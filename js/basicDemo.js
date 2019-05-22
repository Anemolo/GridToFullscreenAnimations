/**
  Basic setup for demos.
  @param {object} options - GridToFullscreenEffect options. Lots of them
  @return {object} GridToFullscreenEffect instance  
 */

function createDemoEffect(options) {
  const transitionEffect = new GridToFullscreenEffect(
    document.getElementById("app"),
    document.getElementById("itemsWrapper"),
    Object.assign(
      {
        scrollContainer: window,
        onToFullscreenStart: ({ index }) => {},
        onToFullscreenFinish: ({ index }) => {},
        onToGridStart: ({ index }) => {},
        onToGridFinish: ({ index, lastIndex }) => {}
      },
      options
    )
  );

  return transitionEffect;
}
