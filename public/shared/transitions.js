(function initTransitions(global) {
  function play(element) {
    if (!element) return Promise.resolve();
    element.classList.add("active");
    return new Promise((resolve) => {
      setTimeout(() => {
        element.classList.remove("active");
        resolve();
      }, 260);
    });
  }

  global.Transitions = { play };
})(window);
