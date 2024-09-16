class PixelatedButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ["disabled"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "disabled") {
      this.updateDisabledState();
    }
  }

  updateDisabledState() {
    const isDisabled = this.hasAttribute("disabled");
    const button = this.shadowRoot.querySelector(".box");
    button.style.opacity = isDisabled ? "0.5" : "1";
    button.style.cursor = isDisabled ? "not-allowed" : "pointer";
  }

  render() {
    const buttonText = this.getAttribute("text") || "Button";
    const isInverted = this.hasAttribute("inverted");

    const backgroundColor = isInverted ? "#1F2225" : "#ffffff";
    const textColor = isInverted ? "#ffffff" : "#1F2225";

    this.shadowRoot.innerHTML = `
      <style>
        @font-face {
          font-family: 'PPNeueBit';
          src: url('/fonts/PPNeueBit-Bold.woff2') format('woff2');
          font-weight: bold;
          font-style: normal;
        }

        .pixelated-container {
          position: relative;
          width: 100%;
          margin-left: 7px;
          cursor: pointer;
        }

        .pixelated-container .box {
          position: relative;
          font-family: 'PPNeueBit 2', monospace;
          font-size: 32px;
          font-weight: bold;
          color: ${textColor};
          background-color: ${backgroundColor};
          border: none;
          padding: 12px 20px;
          text-align: center;
          width: calc(100% - 68px);
          margin: 0 7px;
          z-index: 1;
        }

        .pixelated-container .front,
        .pixelated-container .back {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 14px;
          z-index: 2;
        }

        .pixelated-container .front {
          left: 0;
        }

        .pixelated-container .back {
          right: 0;
        }

        .pixelated-container .front::before,
        .pixelated-container .front::after,
        .pixelated-container .back::before,
        .pixelated-container .back::after {
          content: '';
          position: absolute;
          background-color: ${backgroundColor};
        }

        .pixelated-container .front::before,
        .pixelated-container .back::before {
          top: 7px;
          bottom: 7px;
          width: 7px;
        }

        .pixelated-container .front::after,
        .pixelated-container .back::after {
          top: 14px;
          bottom: 14px;
          width: 7px;
        }

        .pixelated-container .front::before {
          left: 0;
        }

        .pixelated-container .front::after,
        .pixelated-container .back::before {
          right: 14px;
        }

        .pixelated-container .back::after {
          right: 7px;
        }
      </style>
      <div class="pixelated-container">
        <div class="front"></div>
        <div class="box">${buttonText}</div>
        <div class="back"></div>
      </div>
    `;
  }
}

customElements.define("pixelated-button", PixelatedButton);

export { PixelatedButton };
