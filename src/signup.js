const AO = {
  profileSrc: "_R2XYWDPUXVvQrQKFaQRvDTDcDwnQNbqlTd_qvCRSpQ",
  module: "Pq2Zftrqut0hdisH_MC2pDOT6S4eQFoxGsFUzR6r350",
  scheduler: "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
};

async function checkWalletAssociation(wallet) {
  const res = await fetch("https://content.arweavehub.com/api/wallets/has", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ wallet }),
  });
  if (!res.ok) {
    return false;
  }
  const { exists } = await res.json();
  return exists;
}

async function registerWallet(wallet, email) {
  const res = await fetch("https://content.arweavehub.com/api/wallets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { wallet, email } }),
  });
  if (!res.ok) {
    return false;
  }
  const result = await res.json();
  return result.data.wallet === wallet;
}

async function createBazarProfile(walletConnection, profile) {
  try {
    const processSrcFetch = await fetch(`https://arweave.net/${AO.profileSrc}`);
    if (processSrcFetch.ok) {
      const processSrc = await processSrcFetch.text();
      const dateTime = new Date().getTime().toString();

      const profileTags = [
        { name: "Date-Created", value: dateTime },
        { name: "Action", value: "Create-Profile" },
      ];

      const processId = await walletConnection.spawnProcess(
        AO.module,
        AO.scheduler,
        profileTags,
        JSON.stringify(profile),
      );

      console.log(`Bazar profile process created: ${processId}`);

      let srcUploaded = false;
      let retryCount = 0;
      while (!srcUploaded && retryCount < 30) {
        try {
          await walletConnection.sendMessageToArweave(
            [{ name: "Action", value: "Eval" }],
            processSrc,
            processId,
          );

          srcUploaded = true;
        } catch (e) {
          console.error("Error during profile creation:", e);
          retryCount++;
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (!srcUploaded) {
        throw new Error("Failed to upload profile after multiple attempts");
      }

      await new Promise((r) => setTimeout(r, 1000));

      const updateResult = await walletConnection.sendMessageToArweave(
        [{ name: "Action", value: "Update-Profile" }],
        JSON.stringify(profile),
        processId,
      );

      console.log("Profile update result:", updateResult);

      return profile;
    }
  } catch (error) {
    console.error("Error creating Bazar profile:", error);
    throw error;
  }

  return null;
}

export { checkWalletAssociation, registerWallet, createBazarProfile };
