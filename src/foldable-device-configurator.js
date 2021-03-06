import { LitElement, html, css } from "../web_modules/lit-element.js";
import '../web_modules/@material/mwc-slider.js';

class FoldableDeviceConfigurator extends LitElement {
  static styles = css`
    :host {
      z-index: 9999;
      position: absolute;
      width: 300px;
      font-size: 12px;
      background-color: white;
      box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.75);
      top: 16px;
      right: 16px;
      border: 1px solid grey;
      overscroll-behavior: contain;
    }

    #header {
      background-color: #f2f2f2;
      border-bottom: 1px solid #cccccc;
      height: 28px;
      cursor: move;
      display: flex;
      justify-content: center;
      align-items: center;
      user-select: none;
      touch-action: none;
    }

    #content {
      display: grid;
      grid-template-columns: 100px auto;
      grid-template-rows: auto auto auto;
      align-items: center;
      justify-items: start;
    }

    #content > * {
      margin: 12px 12px 0px 12px;
    }

    mwc-slider {
      --mdc-theme-secondary: black;
      width: calc(100% - 32px);
    }

    .close {
      position: absolute;
      right: 5px;
      top: 5px;
      width: 18px;
      height: 18px;
      opacity: 0.5;
      cursor: initial;
    }

    .close:hover {
      opacity: 1;
    }
  `;

  _header;
  _device_type_select;
  _orientation_select;
  _seam_slider;

  _spanning;
  _fold_width;
  _browser_shell_size;
  _foldable_config;

  _position_x;
  _position_y;
  _resizeHandler;

  firstUpdated() {
    this._foldable_config = window["__foldables_env_vars__"];

    this._header = this.shadowRoot.querySelector('#header');
    this._device_type_select = this.shadowRoot.querySelector('#device-select');
    this._orientation_select = this.shadowRoot.querySelector('#orientation-select');
    this._seam_slider = this.shadowRoot.getElementById("seam");

    this._header.onpointerdown = this._startDrag.bind(this);
    this._device_type_select.onchange = this._deviceTypeChanged.bind(this);
    this._orientation_select.onchange = this._orientationChanged.bind(this);
    this._seam_slider.oninput = this._seamValueUpdated.bind(this);

    this._orientation_select.disabled = true;
    this._seam_slider.disabled = true;

    this._browser_shell_size = 0;
    this.spanning = 'none';
    this.foldWidth = 0;

    this._updateConfig();
  }

  _startDrag = async (event) => {
    this._position_x = event.clientX;
    this._position_y = event.clientY;
    this._pointerId = event.pointerId;
    this._header.setPointerCapture(this._pointerId);
    this._header.onpointerup = this._stopDrag;
    this._header.onpointercancel = this._stopDrag;
    this._header.onpointermove = this._pointerMove;
    event.preventDefault();
  }

  _pointerMove = async (event) => {
    let x = this._position_x - event.clientX;
    let y = this._position_y - event.clientY;
    this._position_x = event.clientX;
    this._position_y = event.clientY;
    this.shadowRoot.host.style.top = (this.shadowRoot.host.offsetTop - y) + "px";
    this.shadowRoot.host.style.left = (this.shadowRoot.host.offsetLeft - x) + "px";
    event.preventDefault();
  }

  _stopDrag = async (event) => {
    this._header.onpointerup = null;
    this._header.onpointermove = null;
    this._header.releasePointerCapture(this._pointerId);
  }

  _onResize = async (event) => {
    this._handleAsusSpanning();
  }

  // This is REALLY BAD, it needs to be in the polyfill (so we can support
  // not equally sized split screens). Also this is only working for the demo because
  // it messes with its variables (rather than touching the polyfill variables but
  // these are already rewritten by the time I hit this handler).
  // Hey it's all WIP and research, don't complain.
  _handleAsusSpanning() {
    if (window.innerHeight > 752) {
      this.spanning = 'single-fold-horizontal';
      this.foldWidth = 20;
      this._updateConfig();
      let polyfill = document.styleSheets[document.styleSheets.length - 1];
      let rule = polyfill.rules[0].cssRules[0];
      // This is specific to the demo :(, really bad.
      rule.style.setProperty('--span-1-height', "460px");
      rule.style.setProperty('--span-2-height', "715px");
    } else {
      this.spanning = 'none';
      this.foldWidth = 0;
      this._updateConfig();
    }
  }

  _seamValueUpdated = async (event) => {
    this.foldWidth = event.target.value;
    this._updateConfig();
  }

  get foldWidth() {
    return this._fold_width;
  }

  set foldWidth(value) {
    this._fold_width = Math.max(0, value);
  }

  _orientationChanged(event) {
    const selectedIndex = this._orientation_select.selectedIndex;
    this.spanning = this._orientation_select[selectedIndex].value
    this._updateConfig();
  }

  get spanning() {
    return this._spanning;
  }

  set spanning(value) {
    switch(value) {
      case "none":
      case "single-fold-vertical":
        this._orientation_select.selectedIndex = 0;
        break;
      case "single-fold-horizontal":
        this._orientation_select.selectedIndex = 1;
        break;
      default:
        value = "none";
        this._orientation_select.selectedIndex = 0;
    }
    this._spanning = value;
  }

  _deviceTypeChanged(event) {
    let selectedIndex = this._device_type_select.selectedIndex;
    let deviceType = this._device_type_select[selectedIndex].value;
    window.removeEventListener('resize', this._resizeHandler);
    this._resizeHandler = null;
    switch(deviceType) {
      case 'custom':
        this._orientation_select.disabled = false;
        this._seam_slider.disabled = false;
        break;
      case 'neo':
        this._orientation_select.disabled = false;
        this._seam_slider.disabled = true;
        this.spanning = 'single-fold-vertical';
        this.foldWidth = 24;
        this._updateConfig();
        break;
      case 'duo':
        this._orientation_select.disabled = false;
        this._seam_slider.disabled = true;
        this.spanning = 'single-fold-vertical';
        this.foldWidth = 28;
        this._updateConfig();
        break;
      case 'asus':
        this._resizeHandler = this._debounce(this._onResize, 200);
        window.addEventListener('resize', this._resizeHandler);
        this._handleAsusSpanning();
        this._orientation_select.disabled = false;
        this._seam_slider.disabled = true;
        break;
      default:
        this._orientation_select.disabled = true;
        this._seam_slider.disabled = true;
        this.spanning = 'none';
        this.foldWidth = 0;
        this._updateConfig();
    }
  }

  _updateConfig() {
    const config = {
      spanning: this.spanning,
      foldSize: this.foldWidth,
      browserShellSize: this._browser_shell_size
    }
    console.table(config);
    this._foldable_config.update(config);
  }

  _debounce(fn, wait) {
    let timeout;
    return function() {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, arguments), wait);
    };
  }

  _closeConfigurator() {
    this.shadowRoot.host.style.visibility = 'hidden';
    this._seam_slider.style.display = 'none';
  }

  render() {
    return html`
    <div id="wrapper">
      <div class="close" @click="${this._closeConfigurator}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
          <path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"/>
        </svg>
      </div>
      <div id="header">Foldable Screen</div>
      <div id="content">
        <div class="category">Dual Screen</div>
        <select id="device-select">
          <option value="standard">Off</option>
          <option value="custom">Custom...</option>
          <optgroup label="Presets">
            <option value="neo">Surface Neo</option>
            <option value="duo">Surface Duo</option>
            <option value="asus">Asus Zenbook Pro Duo</option>
          </optgroup>
        </select>
        <div class="category">Orientation</div>
        <select id="orientation-select" disabled>
          <option value="single-fold-vertical">Vertical</option>
          <option value="single-fold-horizontal">Horizontal</option>
        </select>
        <div class="category">Seam width</div>
        <mwc-slider markers pin step="5" value="30" min="0" max="100" id="seam" disabled></mwc-slider>
      </div>
    </div>`;
  }
}

customElements.define("foldable-device-configurator", FoldableDeviceConfigurator);
