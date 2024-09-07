import { createDataItemSigner, message, result } from "@permaweb/aoconnect";
import { arGql } from "ar-gql";
import { ArConnect } from "arweavekit/auth";
import * as othent from "@othent/kms";

const argql = arGql();

class ArweaveWalletConnection extends HTMLElement {
  constructor() {
    super();
    this.walletAddress = null;
    this.signer = null;
    this.authMethod = null;
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.addEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = this.getTemplate();
  }

  getTemplate() {
    return `
      <style>
        button {
          padding: 10px 20px;
          background-color: #4a90e2;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s;
          width: 100%;
          margin-top: 10px;
        }
        button:hover {
          background-color: #357ab8;
        }
      </style>
      <button id="connectWallet">Connect Wallet</button>
    `;
  }

  addEventListeners() {
    this.shadowRoot
      .getElementById("connectWallet")
      .addEventListener("click", () => this.handleWalletConnection());
  }

  async handleWalletConnection() {
    if (!this.walletAddress) {
      await this.connectWallet();
    } else {
      alert(`Already connected: ${this.walletAddress}`);
    }
  }

  async connectWallet() {
    try {
      (await this.tryArConnect()) || (await this.tryOthent());
      if (this.walletAddress) {
        console.log(`Wallet connected successfully: ${this.walletAddress}`);
        this.signer = createDataItemSigner(
          this.authMethod === "Othent" ? othent : window.arweaveWallet,
        );
        this.dispatchEvent(
          new CustomEvent("walletConnected", { detail: this.walletAddress }),
        );
        return true;
      }
      console.error("Failed to obtain wallet address");
    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect wallet. Please try again.");
    }
    return false;
  }

  async tryArConnect() {
    try {
      await ArConnect.connect({
        permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
      });
      this.walletAddress = await window.arweaveWallet.getActiveAddress();
      this.authMethod = "ArConnect";
      return true;
    } catch (error) {
      console.warn("ArConnect connection failed:", error);
      return false;
    }
  }

  async tryOthent() {
    try {
      await othent.connect({
        permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
      });
      this.walletAddress = await othent.getActiveAddress();
      this.authMethod = "Othent";
      return true;
    } catch (error) {
      console.error("Othent connection failed:", error);
      throw error;
    }
  }

  async sendMessageToArweave(tags) {
    try {
      const messageId = await message({
        process: PROCESS_ID,
        tags,
        signer: this.signer,
      });
      let { Messages, Error } = await result({
        process: PROCESS_ID,
        message: messageId,
      });
      if (Error) console.error(Error);
      else
        console.log(
          `Sent Action: ${tags.find((tag) => tag.name === "Action").value}`,
        );
      return { Messages, Error };
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
}

customElements.define("arweave-wallet-connection", ArweaveWalletConnection);

export { ArweaveWalletConnection, argql };
