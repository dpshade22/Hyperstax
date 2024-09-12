class PixelatedInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.addEventListeners();
  }

  render() {
    const placeholder = this.getAttribute("placeholder") || "Enter text";
    const name = this.getAttribute("name") || "";
    const type = this.getAttribute("type") || "text";

    this.shadowRoot.innerHTML = `
      <style>
        @font-face {
          font-family: 'PPNeueBit';
          src: url('/fonts/PPNeueBit-Bold.woff2') format('woff2');
          font-weight: bold;
          font-style: normal;
        }

        .pixelated-container {
          display: block;
          position: relative;
          width: 100%;
          cursor: text;
        }

        .pixelated-container .box {
          position: relative;
          left: 14px;
          width: calc(100% - 28px);
          background: #e4e4e4;
          font-size: 32px;
          font-weight: 700;
          text-align: center;
          color: #232323;
          padding: 16px 20px;
          border: none;
          z-index: 1;
          box-shadow: inset 0 0 0 2px #232323;
        }

        .pixelated-container .box input {
          width: 100%;
          height: 100%;
          padding: 0;
          text-align: center;
          background: transparent;
          border: none;
          outline: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          color: #232323;
          display: block;
          font-family: 'PPNeueBit', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
          font-size: 32px;
          font-style: normal;
          font-weight: 700;
          line-height: normal;
          letter-spacing: -.32px;
          position: relative;
          z-index: 2;
        }

        .pixelated-container .box input::placeholder {
          color: #888;
        }

        .pixelated-container .front,
        .pixelated-container .back {
          display: block;
          pointer-events: none;
        }

        .pixelated-container .front:before,
        .pixelated-container .back:before {
          content: "";
          position: absolute;
          top: 14px;
          bottom: 14px;
          width: 9px;
          background: #e4e4e4;
          z-index: 3;
        }

        .pixelated-container .front:after,
        .pixelated-container .back:after {
          content: "";
          position: absolute;
          top: 7px;
          bottom: 7px;
          width: 9px;
          background: #e4e4e4;
          z-index: 2;
        }

        .pixelated-container .front:before {
          left: 0;
          box-shadow: inset 0 -2px #232323, inset 0 2px #232323, inset 2px 0 #232323, 2px 0 #e4e4e4;
        }

        .pixelated-container .front:after {
          left: 7px;
          box-shadow: inset 0 -2px #232323, inset 0 2px #232323, inset 2px 0 #232323, 2px 0 #e4e4e4;
        }

        .pixelated-container .back:before {
          right: 0;
          box-shadow: inset 0 -2px #232323, inset 0 2px #232323, inset -2px 0 #232323, -2px 0 #e4e4e4;
        }

        .pixelated-container .back:after {
          right: 7px;
          box-shadow: inset 0 -2px #232323, inset 0 2px #232323, inset -2px 0 #232323, -2px 0 #e4e4e4;
        }
      </style>
      <div class="pixelated-container">
        <div class="front"></div>
        <div class="box">
          <input type="${type}" name="${name}" placeholder="${placeholder}">
        </div>
        <div class="back"></div>
      </div>
    `;
  }

  addEventListeners() {
    const input = this.shadowRoot.querySelector("input");
    const container = this.shadowRoot.querySelector(".pixelated-container");

    input.addEventListener("input", (event) => {
      this.value = event.target.value;
      this.dispatchEvent(new CustomEvent("input", { detail: this.value }));
    });

    input.addEventListener("change", (event) => {
      this.value = event.target.value;
      this.dispatchEvent(new CustomEvent("change", { detail: this.value }));
    });

    container.addEventListener("click", () => {
      input.focus();
    });
  }

  get value() {
    return this.shadowRoot.querySelector("input").value;
  }

  set value(newValue) {
    this.shadowRoot.querySelector("input").value = newValue;
  }
}

customElements.define("pixelated-input", PixelatedInput);
