(function initUI(global) {
  function bindPlayerSlider(trackEl, knobEl, onChange) {
    const bounds = { min: 0, max: 1 };

    function setValue(raw) {
      const value = raw > 0.5 ? 1 : 0;
      knobEl.style.left = value === 1 ? "calc(100% - 28px)" : "0";
      onChange(value === 1 ? 2 : 1);
    }

    function pointerToValue(clientX) {
      const rect = trackEl.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(bounds.min, Math.min(bounds.max, ratio));
    }

    trackEl.addEventListener("pointerdown", (event) => {
      setValue(pointerToValue(event.clientX));
    });

    knobEl.addEventListener("pointerdown", () => {
      function onMove(moveEvent) {
        setValue(pointerToValue(moveEvent.clientX));
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });

    setValue(0);
  }

  global.UIHelpers = {
    bindPlayerSlider
  };
})(window);
