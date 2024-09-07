import {
  createDataItemSigner,
  dryrun,
  message,
  result,
} from "@permaweb/aoconnect";
import { arGql } from "ar-gql";
import { ArConnect } from "arweavekit/auth";
import * as othent from "@othent/kms";

const argql = arGql();
const PROCESS_ID = "ZtS3h94Orj7jT56m3uP-n7iC5_56Z9LL24Vx21LW03k";

class ArweaveWalletConnection extends HTMLElement {
  constructor() {
    super();
    this.walletAddress = null;
    this.signer = null;
    this.authMethod = null;
    this.attachShadow({ mode: "open" });

    this.sendMessageToArweave = this.sendMessageToArweave.bind(this);
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
        <button id="connectWallet" part="button">Connect Wallet</button>
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

        if (this.authMethod === "Othent") {
          this.signer = createDataItemSigner(othent);
        } else if (this.authMethod === "ArConnect") {
          this.signer = createDataItemSigner(window.arweaveWallet);
        } else {
          throw new Error("Unknown auth method");
        }

        if (!this.signer) {
          throw new Error("Failed to create signer");
        }

        console.log("Signer created:", this.signer);

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
    if (!this.signer) {
      throw new Error(
        "Signer is not initialized. Please connect wallet first.",
      );
    }

    try {
      console.log("PROCESS_ID:", PROCESS_ID);
      console.log("Tags:", tags);
      console.log("Signer:", this.signer);

      const messageId = await message({
        process: PROCESS_ID,
        tags,
        signer: this.signer,
      });

      console.log("Message ID:", messageId);
      let { Messages, Error } = await result({
        process: PROCESS_ID,
        message: messageId,
      });

      console.log("Messages:", Messages);

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

  async dryRunArweave(tags, data = "") {
    if (!this.signer) {
      throw new Error(
        "Signer is not initialized. Please connect wallet first.",
      );
    }

    try {
      const { Messages, Error } = await dryrun({
        process: PROCESS_ID,
        tags: tags,
        data: data,
        signer: this.signer,
      });

      if (Error) {
        console.error("Error in dryRunArweave:", Error);
        throw new Error(Error);
      }

      return { Messages, Error };
    } catch (error) {
      console.error("Error in dryRunArweave:", error);
      throw error;
    }
  }
}

// Check if the custom element has already been defined
if (!customElements.get("arweave-wallet-connection")) {
  customElements.define("arweave-wallet-connection", ArweaveWalletConnection);
}

export { ArweaveWalletConnection, argql };
