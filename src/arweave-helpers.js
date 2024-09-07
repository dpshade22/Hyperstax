// Import the necessary modules
import { ArweaveWalletConnection } from "./wallet-connection.js";

// Helper function to add wallet address
export async function addWalletAddress(walletConnection, walletAddress) {
  return await walletConnection.sendMessageToArweave([
    { name: "Action", value: "AddWalletAddress" },
    { name: "Wallet-Address", value: walletAddress },
  ]);
}

// Helper function to add username
export async function addUsername(walletConnection, walletAddress, username) {
  return await walletConnection.sendMessageToArweave([
    { name: "Action", value: "AddUsername" },
    { name: "Wallet-Address", value: walletAddress },
    { name: "Username", value: username },
  ]);
}

// Helper function to update max score
export async function updateMaxScore(walletConnection, walletAddress, score) {
  return await walletConnection.sendMessageToArweave([
    { name: "Action", value: "UpdateMaxScore" },
    { name: "Wallet-Address", value: walletAddress },
    { name: "Score", value: score.toString() },
  ]);
}

// Helper function to get user data
export async function dryRunGetUserData(walletConnection, walletAddress) {
  return await walletConnection.dryRunArweave([
    { name: "Action", value: "GetUserData" },
    { name: "Wallet-Address", value: walletAddress },
  ]);
}

// Helper function to get leaderboard
export async function getLeaderboard(walletConnection, limit = 10) {
  return await walletConnection.sendMessageToArweave([
    { name: "Action", value: "GetLeaderboard" },
    { name: "Limit", value: limit.toString() },
  ]);
}
