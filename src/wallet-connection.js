import {
  createDataItemSigner,
  dryrun,
  message,
  result,
} from "@permaweb/aoconnect";
import { arGql } from "ar-gql";
import { ArConnect } from "arweavekit/auth";
import * as othent from "@othent/kms";
import { createData, ArweaveSigner } from "warp-arbundles";

const createDataItemSignerJWK = (wallet) => {
  const signer = async ({ data, tags, target, anchor }) => {
    const signer2 = new ArweaveSigner(wallet);
    const dataItem = createData(data, signer2, { tags, target, anchor });
    return dataItem.sign(signer2).then(async () => ({
      id: await dataItem.id,
      raw: await dataItem.getRaw(),
    }));
  };
  return signer;
};
// Initialize Arweave
const arweave = Arweave.init({});

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
      <style>
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          overflow: auto;
          background-color: rgba(0,0,0,0.1);
          justify-content: center;
          align-items: center;
        }
        .modal-content {
          background-color: #fefefe;
          padding: 20px;
          border: 1px solid #CBCBCB;
          width: 90%;
          max-width: 400px;
          text-align: center;
          border-radius: 10px;
          max-height: 90vh;
          overflow-y: auto;
        }
        h3 {
          margin-top: 0;
          font-size: 1.2em;
        }
        .connect-option {
          display: flex;
          align-items: center;
          padding: 10px;
          margin-bottom: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s;
          position: relative;
          overflow: hidden;
        }
        .connect-option:hover {
          background-color: rgba(240, 240, 240, 0.8);
        }
        .connect-option-icon {
          flex: 0 0 40px;
          height: 40px;
          border-radius: 8px;
          background-size: 24px 24px;
          background-position: center;
          background-repeat: no-repeat;
          margin-right: 0.5rem;
        }
        .connect-option-detail {
          text-align: left;
          position: relative;
          z-index: 2;
          flex: 1;
        }
        .connect-option-name {
          font-weight: bold;
          margin: 0;
          font-size: 0.9em;
        }
        .connect-option-desc {
          margin: 0;
          font-size: 0.8em;
          color: #666;
        }
        .recommended {
          color: #4CAF50;
          font-size: 0.7em;
        }
        @media (max-width: 480px) {
          .modal-content {
            padding: 15px;
          }
          h3 {
            font-size: 1em;
          }
          .connect-option {
            padding: 8px;
          }
          .connect-option-icon {
            flex: 0 0 32px;
            height: 32px;
            background-size: 20px 20px;
          }
          .connect-option-name {
            font-size: 0.8em;
          }
          .connect-option-desc {
            font-size: 0.7em;
          }
          .recommended {
            font-size: 0.6em;
          }
        }
      </style>
      <button id="connectWallet" part="button">Connect Wallet</button>
      <div id="walletModal" class="modal">
        <div class="modal-content">
          <h3>Connect Wallet</h3>
          <div id="quickWalletOption" class="connect-option">
            <div class="connect-option-icon" style="background-image: url('https://arweave.net/aw_3Afim3oQU3JkaeWlh8DXQOcS8ZWt3niRpq-rrECA'); background-color: rgb(9, 70, 37);"></div>
            <div class="connect-option-detail">
              <p class="connect-option-name">QuickWallet <span class="recommended">(Recommended)</span></p>
              <p class="connect-option-desc">Creates a new wallet for you, instantly.</p>
            </div>
          </div>
          <div id="arconnectOption" class="connect-option">
            <div class="connect-option-icon" style="background-image: url('https://arweave.net/tQUcL4wlNj_NED2VjUGUhfCTJ6pDN9P0e3CbnHo3vUE'); background-color: rgb(171, 154, 255);"></div>
            <div class="connect-option-detail">
              <p class="connect-option-name">ArConnect</p>
              <p class="connect-option-desc">Non-custodial Arweave wallet for your favorite browser</p>
            </div>
          </div>
          <div id="othentOption" class="connect-option">
            <div class="connect-option-icon" style="background-image: url('https://arweave.net/33nBIUNlGK4MnWtJZQy9EzkVJaAd7WoydIKfkJoMvDs'); background-color: rgb(35, 117, 239);"></div>
            <div class="connect-option-detail">
              <p class="connect-option-name">Othent</p>
              <p class="connect-option-desc">Web3 Authentication and Key Management</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  addEventListeners() {
    this.shadowRoot
      .getElementById("connectWallet")
      .addEventListener("click", () => this.openModal());

    this.shadowRoot
      .getElementById("arconnectOption")
      .addEventListener("click", () => this.connectWallet("ArConnect"));

    this.shadowRoot
      .getElementById("othentOption")
      .addEventListener("click", () => this.connectWallet("Othent"));

    this.shadowRoot
      .getElementById("quickWalletOption")
      .addEventListener("click", () => this.connectWallet("QuickWallet"));

    // Close the modal if clicking outside of it
    this.shadowRoot
      .getElementById("walletModal")
      .addEventListener("click", (event) => {
        if (event.target === this.shadowRoot.getElementById("walletModal")) {
          this.closeModal();
        }
      });
  }

  openModal() {
    this.shadowRoot.getElementById("walletModal").style.display = "flex";
  }

  closeModal() {
    this.shadowRoot.getElementById("walletModal").style.display = "none";
  }

  async connectWallet(method) {
    this.closeModal();
    if (this.walletAddress) {
      alert(`Already connected: ${this.walletAddress}`);
      return;
    }

    try {
      switch (method) {
        case "ArConnect":
          await this.tryArConnect();
          break;
        case "Othent":
          await this.tryOthent();
          break;
        case "QuickWallet":
          await this.tryQuickWallet();
          break;
        default:
          throw new Error("Unknown wallet method");
      }

      if (this.walletAddress) {
        console.log(`Wallet connected successfully: ${this.walletAddress}`);

        switch (this.authMethod) {
          case "Othent":
            console.log(othent);
            this.signer = createDataItemSigner(othent);
            break;
          case "ArConnect":
            console.log(window.arweaveWallet);
            this.signer = createDataItemSigner(window.arweaveWallet);
            break;
          case "QuickWallet":
            console.log(this.generatedWallet);
            this.signer = createDataItemSignerJWK(this.generatedWallet);
            break;
          default:
            throw new Error("Unknown auth method");
        }

        if (!this.signer) {
          throw new Error("Failed to create signer");
        }

        console.log("Signer created:", this.signer);

        this.dispatchEvent(
          new CustomEvent("walletConnected", { detail: this.walletAddress }),
        );
      } else {
        console.error("Failed to obtain wallet address");
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  }

  async tryArConnect() {
    try {
      await ArConnect.connect({
        permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
      });
      this.walletAddress = await window.arweaveWallet.getActiveAddress();
      this.authMethod = "ArConnect";
    } catch (error) {
      console.warn("ArConnect connection failed:", error);
      throw error;
    }
  }

  async tryOthent() {
    try {
      await othent.connect({
        permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
      });
      this.walletAddress = await othent.getActiveAddress();
      this.authMethod = "Othent";
    } catch (error) {
      console.error("Othent connection failed:", error);
      throw error;
    }
  }

  async tryQuickWallet() {
    try {
      const key = await arweave.wallets.generate();
      const address = await arweave.wallets.jwkToAddress(key);
      this.walletAddress = address;
      this.generatedWallet = key;
      this.authMethod = "QuickWallet";
    } catch (error) {
      console.warn("Quick wallet connection failed:", error);
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
