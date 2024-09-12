// Import the necessary modules
import { ArweaveWalletConnection } from "./wallet-connection.js";

const WORD_STACK_PROCESS = "07JwXyhQrLCOdNbZw0Kqrg3FymVJaEM2-BzD_5-u9Ik";
const PROFILE_REGISTRY = "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY";

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
  await walletConnection.sendMessageToArweave([
    { name: "Action", value: "UpdateMaxScore" },
    { name: "Wallet-Address", value: walletAddress },
    { name: "Score", value: score.toString() },
  ]);

  await importScore(walletConnection, walletAddress, score);
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

export async function checkUserHasBazarProfile(walletConnection, address) {
  const tags = [{ name: "Action", value: "Get-Profiles-By-Delegate" }];
  const data = JSON.stringify({ Address: address });

  try {
    const result = await walletConnection.dryRunArweave(
      tags,
      data,
      PROFILE_REGISTRY,
    );

    if (result.Messages && result.Messages.length > 0) {
      const message = result.Messages[0];
      const status = message.Tags.find((tag) => tag.name === "Status")?.value;
      const action = message.Tags.find((tag) => tag.name === "Action")?.value;

      if (status === "Success" && action === "Profile-Success") {
        return true; // Profile exists
      } else if (status === "Error" && action === "Profile-Error") {
        return false; // Profile does not exist
      }
    }

    console.error("Unexpected response format from dry run");
    return false; // Assume no profile exists in case of unexpected response
  } catch (error) {
    console.error("Error during dry run:", error);
    throw error;
  }
}

export async function importScore(walletConnection, walletAddress, score) {
  try {
    const result = await walletConnection.sendMessageToArweave(
      [
        { name: "Action", value: "ImportData" },
        { name: "Method", value: "merge" },
      ],
      JSON.stringify({ [walletAddress]: score }),
      WORD_STACK_PROCESS,
    );

    console.log("Score successfully imported to Longview Process:", result);
    return result;
  } catch (error) {
    console.error("Error importing score:", error);
    throw error;
  }
}
