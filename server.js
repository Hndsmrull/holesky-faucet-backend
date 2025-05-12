const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const { ethers } = require("ethers");
const path = require("path");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Menyajikan file statis

const provider = new ethers.JsonRpcProvider("https://holesky.rpc-url-here");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Endpoint untuk halaman utama
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/request-tokens", async (req, res) => {
  const { address, captchaToken, twitterUsername } = req.body;

  // 1. Verifikasi reCAPTCHA
  const captchaRes = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`,
    { method: "POST" }
  );
  const captchaJson = await captchaRes.json();
  if (!captchaJson.success) return res.status(400).json({ error: "Captcha failed" });

  // 2. Verifikasi follow Twitter
  const twitterRes = await fetch(`https://api.twitter.com/2/users/by/username/${twitterUsername}`, {
    headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER}` }
  });
  const twitterUser = await twitterRes.json();

  const myTwitterId = "123456789012345678"; // Ganti dengan ID akun Twitter kamu

  const followingRes = await fetch(`https://api.twitter.com/2/users/${twitterUser.data.id}/following`, {
    headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER}` }
  });
  const following = await followingRes.json();

  const isFollowing = following.data.some(user => user.id === myTwitterId);
  if (!isFollowing) return res.status(400).json({ error: "You must follow our Twitter first!" });

  // 3. Kirim ETH
  try {
    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther("0.1")
    });
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
