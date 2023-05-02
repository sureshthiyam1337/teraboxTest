import { Telegraf, Context } from "telegraf";
import * as React from "react";
import axios from "axios";
import getDownloadUrl from "./api/getDownloadUrl";
import getDetailApi from "./api/getDetail";
import { Update } from 'node-telegram-bot-api';


const BOT_TOKEN = "5679613407:AAHF2jjLdBGu6QF2LiDQ7j46xO2S3iunI8c";
const BASE_API_URL = "https://terabox-beta.vercel.app/";

const bot = new Telegraf(BOT_TOKEN);
interface CustomContext extends Context<Update> {
  session: Session;
}

bot.use((ctx, next) => {
  const { chat } = ctx;
  // initialize session object if it doesn't exist
  if (!ctx.session) ctx.session = {};
  // set the session id to chat id
  ctx.session.id = chat.id;
  next();
});

bot.start((ctx) => {
  const { session } = ctx;
  // retrieve session id from session object
  const sessionId = session.id;
  ctx.reply(`Session ID: ${sessionId}`);
});

bot.start(async (ctx) => {
  try {
    await ctx.reply(
      "Hi there! Please send me the terabox link to download the video."
    );

    ctx.session.state = "AWAITING_TERABOX_LINK";
  } catch (err) {
    console.error(err);
  }
});

bot.on("text", async (ctx) => {
  try {
    if (ctx.session.state === "AWAITING_TERABOX_LINK") {
      const url = ctx.message.text.trim();

      if (!url.startsWith("https://www.terabox.com/")) {
        await ctx.reply(
          "Invalid terabox link. Please send a valid terabox link."
        );
        return;
      }

      const { uk, shareid, sign, timestamp, fid } = await getDetailApi(url);

      const { url: downloadUrl, size: fileSize } = await getDownloadUrl(
        fid,
        shareid,
        sign,
        uk,
        timestamp
      );

      await ctx.reply(`Here's the download link: ${downloadUrl}`);
      // Access the session property
      const session = ctx.session;

      ctx.session.state = undefined;
    } else {
      await ctx.reply(
        "Sorry, I didn't understand that. Please send me the terabox link to download the video."
      );
      ctx.session.state = "AWAITING_TERABOX_LINK";
    }
  } catch (err) {
    console.error(err);
    await ctx.reply(
      "An error occurred while processing your request. Please try again later."
    );
  }
});

bot.launch();

interface DetailResponse {
  name: string;
  size: number;
}

interface DownloadUrlResponse {
  url: string;
}

const getDetail = async (
  fid: string,
  shareid: string,
  sign: string,
  uk: string
) => {
  const response = await axios.post<DetailResponse>(
    `${BASE_API_URL}/api/getDetail`,
    { fid, shareid, sign, uk },
    { headers: { "Content-Type": "application/json" } }
  );

  return response.data;
};

const getDownloadURL = async (
  fid: string,
  shareid: string,
  sign: string,
  uk: string,
  timestamp: string
) => {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
  const axiosClient = axios.create({
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en-US,en;q=0.5",
      Referer:
        "https://www.terabox.com/sharing/link?surl=gfujeeyKv_ZGFd_dAJ3uXw",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    },
    maxRedirects: 0,
  });

  const dpLogId = "59350200172865410009";
  const jsToken =
    "3D1900FFEDE22A36D2E6D36ABAAE9CEB74926E292F0986A22DEF1DA25812774556754CAACE1AD4C44240AB83098E4DDC9DAA210A461D3A837D60301AEBC78DFD";
  const appId = "250528";

  const response = await axiosClient.post(
    `https://www.terabox.com/share/download` +
      `?app_id=${appId}` +
      `&web=1` +
      `&channel=dubox` +
      `&clienttype=0` +
      `&jsToken=${jsToken}` +
      `&dp-logid=${dpLogId}` +
      `&shareid=${shareid}` +
      `&sign=${sign}` +
      `&timestamp=${timestamp}`,
    {
      product: "share",
      nozip: 0,
      fid_list: `[${fid}]`,
      uk: uk,
      primaryid: shareid,
    },
    { headers: { "content-type": "application/x-www-form-urlencoded" } }
  );

  if (response.data.errno != 0) {
    throw new Error(
      `Failed to get url download | Errno: ${response.data.errno}`
    );
  }

  const dlink = response.data.dlink;
  const downloadResponse = await axiosClient.get(dlink, {
    validateStatus: function (status) {
      return status == 302 || (status >= 200 && status < 300);
    },
  });

  if (downloadResponse.status != 302) {
    throw new Error("Failed get url download");
  }

  const urlDownload = downloadResponse.headers.location;
  const detail = await getDetail(fid, shareid, sign, uk);
  const fileSize = detail.size;
  return {
    url: urlDownload,
    size: fileSize,
  };
};

const TelegramBot: React.FC = () => {
  return <div>Hello, Telegram Bot!</div>;
};

export default TelegramBot;
