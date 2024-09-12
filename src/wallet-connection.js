import {
  createDataItemSigner,
  dryrun,
  message,
  result,
  spawn,
} from "@permaweb/aoconnect";
import { arGql } from "ar-gql";
import { ArConnect } from "arweavekit/auth";
import * as othent from "@othent/kms";
import { QuickWallet } from "quick-wallet";
import { ArweaveWebWallet } from "arweave-wallet-connector";

// const createDataItemSignerJWK = (wallet) => {
//   const signer = async ({ data, tags, target, anchor }) => {
//     const signer2 = new ArweaveSigner(wallet);
//     const dataItem = createData(data, signer2, { tags, target, anchor });
//     return dataItem.sign(signer2).then(async () => ({
//       id: await dataItem.id,
//       raw: await dataItem.getRaw(),
//     }));
//   };
//   return signer;
// };
// // Initialize Arweave
// const arweave = Arweave.init({});

const argql = arGql();
const PROCESS_ID = "ZtS3h94Orj7jT56m3uP-n7iC5_56Z9LL24Vx21LW03k";

class ArweaveWalletConnection extends HTMLElement {
  constructor() {
    super();
    this.walletAddress = null;
    this.signer = null;
    this.authMethod = null;
    this.isConnecting = false;
    this.attachShadow({ mode: "open" });

    this.sendMessageToArweave = this.sendMessageToArweave.bind(this);
  }

  connectedCallback() {
    this.render();
    this.addEventListeners();
  }

  render() {
    this.isMobile = isMobile();
    this.shadowRoot.innerHTML = this.getTemplate();
  }

  getTemplate() {
    const options = [
      {
        id: "quickWalletOption",
        html: `
          <div id="quickWalletOption" class="connect-option">
            <div class="connect-option-icon" style="background-image: url('https://arweave.net/aw_3Afim3oQU3JkaeWlh8DXQOcS8ZWt3niRpq-rrECA'); background-color: rgb(9, 70, 37);"></div>
            <div class="connect-option-detail">
              <p class="connect-option-name">QuickWallet <span class="recommended">(Recommended)</span></p>
              <p class="connect-option-desc">Creates a new wallet for you, instantly.</p>
            </div>
          </div>
        `,
        disabled: false,
      },
      {
        id: "othentOption",
        html: `
          <div id="othentOption" class="connect-option disabled">
            <div class="connect-option-icon" style="background-image: url('https://arweave.net/33nBIUNlGK4MnWtJZQy9EzkVJaAd7WoydIKfkJoMvDs'); background-color: rgb(35, 117, 239);"></div>
            <div class="connect-option-detail">
              <p class="connect-option-name">Othent</p>
              <p class="connect-option-desc">Web3 Authentication and Key Management</p>
            </div>
          </div>
        `,
        disabled: true,
      },
      {
        id: "arweaveAppOption",
        html: `
          <div id="arweaveAppOption" class="connect-option">
            <div class="connect-option-icon" style="background-image: url('https://arweave.net/qVms-k8Ox-eKFJN5QFvrPQvT9ryqQXaFcYbr-fJbgLY'); background-color: black;"></div>
            <div class="connect-option-detail">
              <p class="connect-option-name">Arweave.app</p>
              <p class="connect-option-desc">Web based wallet software</p>
            </div>
          </div>
        `,
        disabled: false,
      },
      {
        id: "arconnectOption",
        html: `
          <div id="arconnectOption" class="connect-option ${this.isMobile ? "disabled" : ""}">
            <div class="connect-option-icon" style="background-image: url('https://arweave.net/tQUcL4wlNj_NED2VjUGUhfCTJ6pDN9P0e3CbnHo3vUE'); background-color: rgb(171, 154, 255);"></div>
            <div class="connect-option-detail">
              <p class="connect-option-name">ArConnect</p>
              <p class="connect-option-desc">${this.isMobile ? "Limited mobile support... " : ""}Non-custodial Arweave wallet for your favorite browser</p>
            </div>
          </div>
        `,
        disabled: this.isMobile,
      },
    ];

    // Sort options: enabled first, then disabled
    const sortedOptions = options.sort((a, b) => {
      if (a.disabled === b.disabled) return 0;
      return a.disabled ? 1 : -1;
    });

    const optionsHtml = sortedOptions.map((option) => option.html).join("");

    return `
        <style>
          @font-face {
            font-family: 'PPNeueBit';
            src: url('/fonts/PPNeueBit-Bold.woff2') format('woff2');
            font-weight: bold;
            font-style: normal;
          }

          .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
            justify-content: center;
            align-items: center;
          }
          .modal-content {
            background-color: #e4e4e4;
            padding: 20px;
            border: 1px solid #232323;
            width: 90%;
            max-width: 400px;
            text-align: center;
          }
          h3 {
            margin-top: 0;
            font-size: 24px;
            font-family: 'PPNeueBit', monospace;
            color: #232323;
          }
          .connect-option {
            display: flex;
            align-items: center;
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid #232323;
            cursor: pointer;
            transition: background-color 0.3s;
          }
          .connect-option:hover {
            background-color: #d4d4d4;
          }
          .connect-option-icon {
            flex: 0 0 40px;
            height: 40px;
            background-size: 24px 24px;
            background-position: center;
            background-repeat: no-repeat;
            margin-right: 12px;
          }
          .connect-option-detail {
            text-align: left;
          }
          .connect-option-name {
            font-weight: bold;
            margin: 0;
            font-size: 18px;
            font-family: 'PPNeueBit', monospace;
            color: #232323;
          }
          .connect-option-desc {
            margin: 0;
            font-size: 14px;
            color: #454545;
            font-family: 'PPNeueBit', monospace;
          }
          .connect-option.disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .recommended {
            color: #427817;
            font-size: 14px;
            font-family: 'PPNeueBit', monospace;
          }
        </style>
        <pixelated-button text="Connect Wallet"></pixelated-button>
        <div id="walletModal" class="modal">
          <div class="modal-content">
            <h3>Connect Wallet</h3>
            ${optionsHtml}
          </div>
        </div>
      `;
  }

  async addEventListeners() {
    this.shadowRoot
      .querySelector("pixelated-button")
      .addEventListener("click", async () => await this.openModal());

    if (!this.isMobile) {
      this.shadowRoot
        .getElementById("arconnectOption")
        .addEventListener("click", () => this.connectWallet("ArConnect"));
    }

    this.shadowRoot
      .getElementById("arweaveAppOption")
      .addEventListener("click", () => this.connectWallet("ArweaveApp"));

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

    const arconnectOption = this.shadowRoot.getElementById("arconnectOption");
    if (!this.isMobile) {
      arconnectOption.addEventListener("click", () =>
        this.connectWallet("ArConnect"),
      );
    } else {
      arconnectOption.addEventListener("click", (e) => {
        e.preventDefault();
        alert("ArConnect is not available on mobile devices.");
      });
    }
  }

  async openModal() {
    try {
      await preloadImages();
      this.shadowRoot.getElementById("walletModal").style.display = "flex";
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  }

  closeModal() {
    this.shadowRoot.getElementById("walletModal").style.display = "none";
  }

  async connectWallet(method) {
    if (this.isConnecting || this.walletAddress) return;
    this.isConnecting = true;

    this.closeModal();
    if (this.walletAddress) alert(`Already connected: ${this.walletAddress}`);

    try {
      switch (method) {
        case "ArConnect":
          await this.tryArConnect();
          break;
        case "ArweaveApp":
          await this.tryArweaveApp();
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
        console.log("Auth method:", this.authMethod);

        switch (this.authMethod) {
          case "Othent":
            console.log(othent);
            this.signer = createDataItemSigner(othent);
            break;
          case "ArweaveApp":
            this.signer = createDataItemSigner(this.generatedWallet);
            break;
          case "ArConnect":
            this.signer = createDataItemSigner(window.arweaveWallet);
            break;
          case "QuickWallet":
            this.signer = createDataItemSigner(QuickWallet);
            // this.signer = createDataItemSignerJWK(this.generatedWallet);
            break;
          default:
            throw new Error("Unknown auth method");
        }

        if (!this.signer) {
          throw new Error("Failed to create signer");
        }

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

  async tryArweaveApp() {
    try {
      console.log("Connecting to Arweave.app...");
      const arweaveAppWallet = new ArweaveWebWallet();
      arweaveAppWallet.setUrl("https://arweave.app");
      await arweaveAppWallet.connect();

      this.generatedWallet = arweaveAppWallet;
      // Access the arweaveWallet namespace
      const arweaveWalletNamespace = arweaveAppWallet.namespaces.arweaveWallet;

      // Get the active address
      this.walletAddress = arweaveWalletNamespace.getActiveAddress();
      this.authMethod = "ArweaveApp";
    } catch (error) {
      console.error("Arweave.app connection failed:", error);
      throw error;
    }
  }

  async tryOthent() {
    try {
      console.log("Initializing Othent...");
      const othentInstance = await Othent({});

      console.log("Attempting to log in with Othent...");
      const result = await othentInstance.logIn();
      console.log("Login result:", result);

      if (result && result.address) {
        this.walletAddress = result.address;
        console.log("Connected. Wallet address:", this.walletAddress);
        this.authMethod = "Othent";
      } else {
        throw new Error("Failed to log in with Othent");
      }
    } catch (error) {
      console.error("Othent connection failed:", error);
      throw error;
    }
  }

  async tryQuickWallet() {
    try {
      await QuickWallet.connect();
      this.walletAddress = await QuickWallet.getActiveAddress();
      this.authMethod = "QuickWallet";
    } catch (error) {
      console.warn("Quick wallet connection failed:", error);
      throw error;
    }
  }

  // async tryQuickWallet() {
  //   try {
  //     const key = await arweave.wallets.generate();
  //     const address = await arweave.wallets.jwkToAddress(key);
  //     this.walletAddress = address;
  //     this.generatedWallet = key;
  //     this.authMethod = "QuickWallet";
  //   } catch (error) {
  //     console.warn("Quick wallet connection failed:", error);
  //     throw error;
  //   }
  // }

  async sendMessageToArweave(tags, data = "", processId = PROCESS_ID) {
    if (!this.signer) {
      throw new Error(
        "Signer is not initialized. Please connect wallet first.",
      );
    }

    try {
      console.log("Message sent to Arweave:");
      console.log({ PROCESS_ID: processId, Tags: tags, Signer: this.signer });

      const messageId = await message({
        process: processId,
        tags,
        signer: this.signer,
        data: data,
      });

      console.log("Message ID:", messageId);
      let { Messages, Error } = await result({
        process: processId,
        message: messageId,
        data: data,
      });

      console.log("Messages:", Messages);

      if (Error) console.error("Error in Arweave response:", Error);
      else console.log("Arweave action completed successfully");

      return { Messages, Error };
    } catch (error) {
      console.error("Error sending message to Arweave:", error);
      throw error;
    }
  }

  async dryRunArweave(tags, data = "", processId = PROCESS_ID) {
    if (!this.signer) {
      throw new Error(
        "Signer is not initialized. Please connect wallet first.",
      );
    }

    try {
      const { Messages, Error } = await dryrun({
        process: processId,
        tags: tags,
        data: data,
        signer: this.signer,
      });

      if (Error) {
        console.error("Error in dryRunArweave:", Error);
        throw new Error(Error);
      }

      console.log("Dry run completed successfully");
      return { Messages, Error };
    } catch (error) {
      console.error("Error in dryRunArweave:", error);
      throw error;
    }
  }

  async spawnProcess(module, scheduler, tags, data) {
    if (!this.signer) {
      throw new Error(
        "Signer is not initialized. Please connect wallet first.",
      );
    }

    try {
      const processId = await spawn({
        module,
        scheduler,
        signer: this.signer,
        tags,
        data,
      });

      return processId;
    } catch (error) {
      console.error("Error spawning process:", error);
      throw error;
    }
  }
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

async function preloadImages() {
  const imageSources = [
    "https://arweave.net/aw_3Afim3oQU3JkaeWlh8DXQOcS8ZWt3niRpq-rrECA",
    "https://arweave.net/33nBIUNlGK4MnWtJZQy9EzkVJaAd7WoydIKfkJoMvDs",
    "https://arweave.net/qVms-k8Ox-eKFJN5QFvrPQvT9ryqQXaFcYbr-fJbgLY",
    "https://arweave.net/tQUcL4wlNj_NED2VjUGUhfCTJ6pDN9P0e3CbnHo3vUE",
  ];

  const imagePromises = imageSources.map((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
  });

  return Promise.all(imagePromises);
}

// Check if the custom element has already been defined
if (!customElements.get("arweave-wallet-connection")) {
  customElements.define("arweave-wallet-connection", ArweaveWalletConnection);
}

export { ArweaveWalletConnection, argql };
