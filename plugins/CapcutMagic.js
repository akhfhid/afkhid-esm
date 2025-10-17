import crypto from "crypto";
import axios from "axios";
import aws4 from "aws4";
import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import  crc32  from "crc-32";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { fileTypeFromBuffer } from "file-type";

const TEMP_DIR = path.join(process.cwd(), "temp");
const MAX_VIDEO_DURATION_SECONDS = 600;
const MAX_VIDEO_WIDTH = 4096;
const MAX_VIDEO_HEIGHT = 2160;
const DEFAULT_POLL_INTERVAL_MS = 2000;
const LONG_POLL_INTERVAL_MS = 10000;
const DEFAULT_POLL_ATTEMPTS = 30;
const LONG_POLL_ATTEMPTS = 120;
const REQUEST_MAX_RETRIES = 2;
const REQUEST_RETRY_DELAY_MS = 1500;

class CapcutMagic {
  constructor(isDebug = false) {
    this.isDebug = isDebug;
    this.config = {
      PF: "7",
      APP_VERSION: "5.8.0",
      SIGN_VERSION: "1",
      USER_AGENT:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      X_TT_ENV: "boe",
      APP_SDK_VERSION: "48.0.0",
      AUTHORITY: "edit-api-sg.capcut.com",
      ORIGIN: "https://www.capcut.com",
      REFERER: "https://www.capcut.com/",
      API_BASE_URL: "https://edit-api-sg.capcut.com",
      SPACE_NAME: "lv-replicate",
      VOD_HOST: "vod-ap-singapore-1.bytevcloudapi.com",
      VOD_REGION: "sg",
      VOD_API_VERSION: "2020-11-19",
      VOD_SERVICE_NAME: "vod",
      DEFAULT_CHUNK_SIZE: 5 * 1024 * 1024,
      SIGN_SALT_1: "9e2c",
      SIGN_SALT_2: "11ac",
      BIZ_WEB_VIDEO: "web_video",
      FILE_TYPE_VIDEO: 0,
      TOOL_TYPE_UPSCALE_VIDEO: 11,
    };
    this.tempId = null;

    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
  }

  log = function (text) {
    if (this.isDebug) return;
    console.log(text);
  };

  debug = function (label, data) {
    if (!this.isDebug) return;
    const timestamp = new Date().toISOString();
    console.log(`\n--- [DEBUG::${label.toUpperCase()}] ${timestamp} ---`);
    try {
      console.dir(data, { depth: null, colors: true });
    } catch (error) {
      console.error("Error during debug logging:", error);
    }
    console.log(`--- [END DEBUG::${label.toUpperCase()}] ---\n`);
  };

  _request = async function (method, url, config = {}, retryOptions = {}) {
    const {
      maxRetries = REQUEST_MAX_RETRIES,
      retryDelay = REQUEST_RETRY_DELAY_MS,
    } = retryOptions;

    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        this.debug(
          `Requesting (Attempt ${attempt}/${
            maxRetries + 1
          }) ${method.toUpperCase()} ${url}`,
          { headers: config.headers, data: config.data }
        );

        const response = await axios.request({
          method,
          url,
          ...config,
          validateStatus: (status) => status >= 200 && status < 400,
        });

        this.debug(
          `Response SUCCESS (Attempt ${attempt}) ${method.toUpperCase()} ${url}`,
          { status: response.status, data: response.data }
        );
        return response.data;
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt > maxRetries;
        const attemptMsg = `Attempt ${attempt}/${maxRetries + 1}`;

        let errorDetails = error.message;
        let statusCode = null;
        let responseData = null;
        let responseHeaders = null;

        if (error.response) {
          statusCode = error.response.status;
          responseData = error.response.data;
          responseHeaders = error.response.headers;
          errorDetails = `Status: ${statusCode}, Data: ${JSON.stringify(
            responseData
          )}`;
        } else if (error.request) {
          errorDetails =
            "No response received from server (Network error or timeout).";
        } else {
          errorDetails = `Request setup error: ${error.message}`;
        }

        const fullErrorMessage = `Error in ${method.toUpperCase()} request to ${url} (${attemptMsg}): ${errorDetails}`;

        if (this.isDebug) {
          this.debug(
            `REQUEST FAILED (${attemptMsg}) ${method.toUpperCase()} ${url}`,
            {
              error: error.message,
              status: statusCode,
              responseData: responseData,
              responseHeaders: responseHeaders,
              requestConfig: { headers: config.headers, data: config.data },
              isLastAttempt: isLastAttempt,
            }
          );
        } else if (!isLastAttempt) {
          console.warn(
            `Request failed (${attemptMsg}, Status: ${
              statusCode ?? "N/A"
            }). Retrying in ${retryDelay}ms...`
          );
        }

        if (isLastAttempt) {
          console.error(
            `Request failed permanently after ${
              maxRetries + 1
            } attempts: ${method.toUpperCase()} ${url}. Final error details logged above (if debug enabled) or were: ${errorDetails}`
          );
          const genericError = new Error(
            `The operation failed after multiple attempts. Please check the service status or input data.`
          );
          genericError.cause = lastError;
          throw genericError;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
    throw new Error("Request failed unexpectedly after retry loop.");
  };

  _generateSign = function ({ url, pf, appvr, tdid }) {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const sliceLastChars = (input, length = 7) => input.slice(-length);
    const hashMD5 = (input) =>
      crypto.createHash("md5").update(input).digest("hex");
    const createSignature = (...args) => hashMD5(args.join("|")).toLowerCase();

    const baseString = createSignature(
      this.config.SIGN_SALT_1,
      sliceLastChars(url),
      pf,
      appvr,
      currentTimestamp,
      tdid,
      this.config.SIGN_SALT_2
    );

    return {
      sign: baseString,
      "device-time": currentTimestamp,
    };
  };

  _generateHeaders = function (url, payload, cookie) {
    const signParams = {
      url,
      pf: this.config.PF,
      appvr: this.config.APP_VERSION,
      tdid: "",
    };
    const { sign, "device-time": deviceTime } = this._generateSign(signParams);
    const payloadLength = payload
      ? Buffer.byteLength(JSON.stringify(payload), "utf-8")
      : 0;

    return {
      authority: this.config.AUTHORITY,
      "app-sdk-version": this.config.APP_SDK_VERSION,
      appvr: this.config.APP_VERSION,
      "cache-control": "no-cache",
      "content-length": String(payloadLength),
      "content-type": "application/json",
      cookie: cookie,
      "device-time": String(deviceTime),
      origin: this.config.ORIGIN,
      pf: this.config.PF,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: this.config.REFERER,
      sign: sign,
      "sign-ver": this.config.SIGN_VERSION,
      tdid: "",
      "user-agent": this.config.USER_AGENT,
      "x-tt-env": this.config.X_TT_ENV,
    };
  };

  _generateSHA256Hash = function (payload) {
    return crypto.createHash("sha256").update(payload).digest("hex");
  };

  _getMetaVideo = async function (videoBuffer, tempFileName) {
    return new Promise(async (resolve, reject) => {
      const tempVideoPath = path.join(TEMP_DIR, tempFileName);
      try {
        await fsPromises.writeFile(tempVideoPath, videoBuffer);
        this.log(`Getting metadata for temporary video file: ${tempVideoPath}`);
        const ffmpegProcess = spawn(
          ffmpegPath,
          ["-i", tempVideoPath, "-f", "null", "-"],
          { stdio: ["ignore", "ignore", "pipe"] }
        );

        let stderrData = "";
        ffmpegProcess.stderr.on("data", (data) => {
          stderrData += data.toString();
        });

        ffmpegProcess.on("close", (code) => {
          this.debug("FFmpeg Metadata Process stderr", stderrData);
          console.error(`[CapcutMagic] FFmpeg stderr:\n${stderrData}`);
          if (code !== 0)
            return reject(
              new Error(
                `FFmpeg metadata process exited with code ${code}. ` +
                  `Details: ${stderrData.trim()}`
              )
            );

          const durationMatch = stderrData.match(
            /Duration: (\d{2}):(\d{2}):(\d{2})\.(\d+)/
          );
          if (!durationMatch)
            return reject(new Error("Could not parse video duration."));
          const durationInSeconds =
            parseInt(durationMatch[1], 10) * 3600 +
            parseInt(durationMatch[2], 10) * 60 +
            parseInt(durationMatch[3], 10) +
            parseInt(durationMatch[4], 10) / 1000;
          if (durationInSeconds > MAX_VIDEO_DURATION_SECONDS)
            return reject(
              new Error(
                `Video duration (${durationInSeconds.toFixed(
                  2
                )}s) exceeds limit (${MAX_VIDEO_DURATION_SECONDS}s).`
              )
            );

          const resolutionMatch = stderrData.match(
            /Stream #\d+:\d+.*Video:.*\s(\d{2,5})x(\d{2,5})[\s,]/
          );
          if (!resolutionMatch)
            return reject(new Error("Could not parse video resolution."));
          const width = parseInt(resolutionMatch[1], 10);
          const height = parseInt(resolutionMatch[2], 10);
          if (width > MAX_VIDEO_WIDTH || height > MAX_VIDEO_HEIGHT)
            return reject(
              new Error(
                `Video resolution (${width}x${height}) exceeds limit (${MAX_VIDEO_WIDTH}x${MAX_VIDEO_HEIGHT}).`
              )
            );

          this.log(
            `Video Meta: ${width}x${height}, Duration: ${durationInSeconds.toFixed(
              2
            )}s`
          );
          resolve({ width, height, duration: durationInSeconds });
        });
        ffmpegProcess.on("error", (err) =>
          reject(
            new Error(
              `Failed to start FFmpeg metadata process. Check FFmpeg installation and permissions.`
            )
          )
        );
      } catch (error) {
        reject(error);
      } finally {
        if (fs.existsSync(tempVideoPath)) {
          await fsPromises
            .unlink(tempVideoPath)
            .catch((e) =>
              console.warn(`Failed to delete temp file ${tempVideoPath}:`, e)
            );
        }
      }
    });
  };

  getCookie = async function () {
    this.log("Fetching session cookie...");
    const targetUrl = `${this.config.ORIGIN}/magic-tools/upscale-image`;
    try {
      const response = await axios.get(targetUrl, {
        headers: { "User-Agent": this.config.USER_AGENT },
      });
      const cookies = response.headers["set-cookie"];
      if (!cookies || cookies.length === 0)
        throw new Error("No set-cookie header received.");
      const cookieString = cookies.map((c) => c.split(";")[0]).join("; ");
      this.debug("Fetched Cookie", cookieString);
      return cookieString;
    } catch (error) {
      const axiosErrorDetails = error.isAxiosError
        ? `Status: ${error.response?.status}, URL: ${error.config?.url}`
        : error.message;
      console.error(`Failed to fetch session cookie: ${axiosErrorDetails}`);
      throw new Error(`Could not get session cookie: ${axiosErrorDetails}`);
    }
  };

  getUploadCredentials = async function (cookie, payload) {
    this.log(`Getting upload credentials for biz: ${payload.biz}`);
    const url = `${this.config.API_BASE_URL}/lv/v1/upload_sign`;
    const headers = this._generateHeaders(url, payload, cookie);

    const responseData = await this._request("post", url, {
      headers,
      data: payload,
    });

    if (responseData.ret !== "0") {
      const apiErrorMessage = `API Error Code: ${responseData.ret}, Message: ${
        responseData.msg || responseData.message || "Unknown API error"
      }`;
      console.error(
        `Failed to get upload sign. ${apiErrorMessage}`,
        responseData
      );
      throw new Error(`Failed to obtain upload permissions from the service.`);
    }
    if (
      !responseData.data ||
      !responseData.data.access_key_id ||
      !responseData.data.session_token ||
      !responseData.data.secret_access_key ||
      !responseData.data.space_name
    ) {
      console.error(
        "Invalid response structure for upload credentials.",
        responseData
      );
      throw new Error(
        "Received invalid upload permission data from the service."
      );
    }
    this.debug("Upload Sign Response Data", responseData.data);
    return responseData.data;
  };

  getUploadAddress = async function (credentials, fileSize, params = {}) {
    this.log("Getting AWS VOD upload address...");
    const getParams = {
      Action: "ApplyUploadInner",
      Version: this.config.VOD_API_VERSION,
      SpaceName: credentials.space_name,
      IsInner: "1",
      FileSize: fileSize,
      s: Math.random().toString(36).substring(2),
      ...params,
    };
    const requestOptions = {
      host: this.config.VOD_HOST,
      path: "/?" + new URLSearchParams(getParams).toString(),
      service: this.config.VOD_SERVICE_NAME,
      region: this.config.VOD_REGION,
    };

    let signedRequest;
    try {
      signedRequest = aws4.sign(requestOptions, {
        accessKeyId: credentials.access_key_id,
        secretAccessKey: credentials.secret_access_key,
        sessionToken: credentials.session_token,
      });
      this.debug("Generated AWS Upload Address Sign Request", signedRequest);
    } catch (signError) {
      console.error("Failed to sign AWS VOD request:", signError);
      throw new Error(
        "Internal error during upload preparation (signing failed)."
      );
    }

    const url = `https://${signedRequest.host}${signedRequest.path}`;
    const headers = { ...signedRequest.headers };
    if (!headers["x-amz-security-token"] && credentials.session_token) {
      headers["x-amz-security-token"] = credentials.session_token;
    }

    const responseData = await this._request("get", url, { headers });
    this.debug("AWS Upload Address Response", responseData);

    const uploadAddressData =
      responseData?.Result?.UploadAddress ||
      responseData?.Result?.InnerUploadAddress?.UploadNodes?.[0];
    let uploadInfo;

    if (
      uploadAddressData?.UploadHosts?.[0] &&
      uploadAddressData?.StoreInfos?.[0]?.StoreUri &&
      uploadAddressData?.SessionKey &&
      uploadAddressData?.StoreInfos?.[0]?.Auth
    ) {
      uploadInfo = {
        uploadHost: uploadAddressData.UploadHosts[0],
        uploadUri: uploadAddressData.StoreInfos[0].StoreUri,
        auth: uploadAddressData.StoreInfos[0].Auth,
        sessionKey: uploadAddressData.SessionKey,
      };
    } else if (
      uploadAddressData?.UploadHost &&
      uploadAddressData?.StoreInfos?.[0]?.StoreUri &&
      uploadAddressData?.SessionKey &&
      uploadAddressData?.StoreInfos?.[0]?.Auth
    ) {
      uploadInfo = {
        uploadHost: uploadAddressData.UploadHost,
        uploadUri: uploadAddressData.StoreInfos[0].StoreUri,
        auth: uploadAddressData.StoreInfos[0].Auth,
        sessionKey: uploadAddressData.SessionKey,
      };
    }

    if (!uploadInfo) {
      console.error(
        "Failed to parse valid upload address structure from AWS VOD response.",
        responseData
      );
      throw new Error(
        "Failed to get valid upload destination from the service."
      );
    }

    this.debug("Parsed Upload Address Info", uploadInfo);
    return uploadInfo;
  };

  commitUpload = async function (credentials, sessionKey) {
    this.log("Committing upload on AWS VOD...");
    const commitPayload = { SessionKey: sessionKey, Functions: [] };
    const commitPayloadString = JSON.stringify(commitPayload);
    const sha256Hash = this._generateSHA256Hash(commitPayloadString);
    const commitParams = {
      Action: "CommitUploadInner",
      Version: this.config.VOD_API_VERSION,
      SpaceName: credentials.space_name,
    };
    const requestOptions = {
      method: "POST",
      host: this.config.VOD_HOST,
      path: "/?" + new URLSearchParams(commitParams).toString(),
      headers: {
        "Content-Type": "application/json",
        "x-amz-content-sha256": sha256Hash,
      },
      body: commitPayloadString,
      service: this.config.VOD_SERVICE_NAME,
      region: this.config.VOD_REGION,
    };

    let signedRequest;
    try {
      signedRequest = aws4.sign(requestOptions, {
        accessKeyId: credentials.access_key_id,
        secretAccessKey: credentials.secret_access_key,
        sessionToken: credentials.session_token,
      });
      this.debug("Generated AWS Commit Upload Sign Request", signedRequest);
    } catch (signError) {
      console.error("Failed to sign AWS VOD commit request:", signError);
      throw new Error("Internal error during upload commit (signing failed).");
    }

    const url = `https://${signedRequest.host}${signedRequest.path}`;
    const responseData = await this._request("post", url, {
      headers: signedRequest.headers,
      data: signedRequest.body,
    });
    this.debug("AWS Commit Upload Response", responseData);

    const assetId =
      responseData?.Result?.Results?.[0]?.Uri ||
      responseData?.Result?.Results?.[0]?.Vid;
    if (!assetId) {
      console.error(
        "Failed to commit upload or parse asset ID from response.",
        responseData
      );
      throw new Error(
        "CommitUploadInner failed or returned unexpected structure."
      );
    }
    this.log(`Upload committed successfully. Asset ID: ${assetId}`);
    return assetId;
  };

  uploadFile = async function (
    info,
    tempId,
    fileBuffer,
    chunkSize = this.config.DEFAULT_CHUNK_SIZE
  ) {
    const token = info.auth;
    const totalSize = fileBuffer.length;
    const numChunks = Math.ceil(totalSize / chunkSize);
    const baseUriPath = info.uploadUri.startsWith("/")
      ? info.uploadUri
      : `/${info.uploadUri}`;
    const baseUrl =
      numChunks > 1
        ? `https://${info.uploadHost}/upload/v1${baseUriPath}`
        : `https://${info.uploadHost}${baseUriPath}`;

    try {
      if (numChunks === 1) {
        this.log(
          `File size (${(totalSize / 1024).toFixed(
            1
          )} KB) allows direct upload.`
        );
        await this._uploadNonChunkFile(baseUrl, token, tempId, fileBuffer);
      } else {
        this.log(
          `Starting multipart upload (${(totalSize / 1024 / 1024).toFixed(
            2
          )} MB, ${numChunks} chunks)...`
        );
        const uploadId = await this._initiateMultipartUpload(
          baseUrl,
          token,
          tempId
        );
        const uploadedParts = [];

        for (let partNumber = 1; partNumber <= numChunks; partNumber++) {
          const offset = (partNumber - 1) * chunkSize;
          const chunkEnd = Math.min(offset + chunkSize, totalSize);
          const currentChunkBuffer = fileBuffer.slice(offset, chunkEnd);
          const chunkUrl = `${baseUrl}?uploadid=${uploadId}&part_number=${partNumber}&phase=transfer&part_offset=${offset}`;
          const partInfo = await this._uploadSingleChunk(
            chunkUrl,
            token,
            tempId,
            currentChunkBuffer,
            partNumber,
            numChunks
          );
          uploadedParts.push(partInfo);
        }

        await this._finishMultipartUpload(
          baseUrl,
          token,
          tempId,
          uploadId,
          uploadedParts
        );
        this.log("Multipart upload completed successfully.");
      }
    } catch (uploadError) {
      console.error(`File upload failed: ${uploadError.message}`);
      throw new Error("File upload process failed.");
    }
  };

  _uploadNonChunkFile = async function (url, token, tempId, fileBuffer) {
    this.log(`Uploading file directly (non-chunked) to: ${url}`);
    const fileCrc32Value = crc32(fileBuffer).toString(16).padStart(8, "0");
    const fileLength = fileBuffer.length;
    this.debug(
      `Direct Upload Meta`,
      `Size: ${(fileLength / 1024 / 1024).toFixed(
        2
      )} MB, CRC32: ${fileCrc32Value}`
    );
    const headers = {
      Authorization: token,
      "Content-Type": "application/octet-stream",
      "Content-CRC32": fileCrc32Value,
      "Content-Length": String(fileLength),
      "x-storage-u": tempId,
    };

    try {
      const response = await this._request("post", url, {
        headers,
        data: fileBuffer,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      this.debug(`Direct File Upload Response`, response);

      if (response?.code === 4007 && response?.data?.server_hash) {
        const errMsg = `File integrity check failed. Server CRC32: ${
          response.data.server_hash
        }, Client Sent: ${response.data.client_hash || fileCrc32Value}`;
        console.error(errMsg);
        throw new Error(
          "File upload failed due to data corruption during transfer."
        );
      }
      if (response?.code && response.code !== 2000) {
        const errMsg = `Upload service returned error code ${response.code}: ${
          response.message || "Unknown upload service error"
        }`;
        console.error(errMsg);
        throw new Error("File upload was rejected by the storage service.");
      }

      this.log("Direct file upload successful.");
    } catch (error) {
      console.error(`Failed to upload file directly: ${error.message}`);
      throw error;
    }
  };

  _initiateMultipartUpload = async function (baseUrl, token, tempId) {
    this.log("Initiating multipart upload...");
    const initUrl = `${baseUrl}?uploadmode=part&phase=init`;
    const headers = {
      Authorization: token,
      "x-storage-u": tempId,
      "Content-Length": "0",
    };
    this.debug("Headers for Init Multipart Upload:", headers);

    try {
      const response = await this._request("post", initUrl, {
        headers,
        data: null,
      });
      this.debug("Initiate Multipart Upload Response:", response);

      if (response?.code === 2000 && response?.data?.uploadid) {
        const uploadId = response.data.uploadid;
        this.log(
          `Multipart upload initiated successfully. Upload ID: ${uploadId}`
        );
        return uploadId;
      } else {
        const code = response?.code ?? "N/A";
        const msg = response?.message ?? "Unknown error";
        const data = response?.data ? JSON.stringify(response.data) : "N/A";
        const errMsg = `Failed to initiate multipart upload. Code:${code}, Msg:"${msg}", Data:${data}`;
        console.error(errMsg);
        throw new Error(`Failed to start multipart upload process.`);
      }
    } catch (error) {
      console.error(`Error during multipart initiation: ${error.message}`);
      throw error;
    }
  };

  _uploadSingleChunk = async function (
    chunkUrl,
    token,
    tempId,
    chunkBuffer,
    partNumber,
    totalChunks
  ) {
    const chunkLength = chunkBuffer.length;
    const chunkCrc32 = crc32(chunkBuffer).toString(16).padStart(8, "0");
    this.log(
      `Uploading Chunk ${partNumber}/${totalChunks}... (Size: ${chunkLength} bytes)`
    );
    this.debug(
      `Chunk ${partNumber} Meta`,
      `CRC32: ${chunkCrc32}, URL: ${chunkUrl}`
    );
    const headers = {
      Authorization: token,
      "Content-Type": "application/octet-stream",
      "Content-CRC32": chunkCrc32,
      "Content-Length": String(chunkLength),
      "x-storage-u": tempId,
    };

    try {
      const response = await this._request("post", chunkUrl, {
        headers,
        data: chunkBuffer,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      this.debug(`Chunk ${partNumber} Upload Response`, response);

      if (response?.code && response.code !== 2000) {
        const errMsg = `Chunk ${partNumber} upload failed. Code:${
          response?.code ?? "N/A"
        }, Msg:"${response?.message ?? "Unknown error"}"`;
        console.error(errMsg);
        if (response?.code === 4007 && response?.data?.server_hash) {
          const crcError = `Server CRC32: ${response.data.server_hash}, Client Sent: ${chunkCrc32}`;
          throw new Error(
            `Data corruption detected during chunk ${partNumber} upload. ${crcError}`
          );
        }
        throw new Error(`Failed to upload data chunk ${partNumber}.`);
      }

      this.log(`Chunk ${partNumber}/${totalChunks} uploaded successfully.`);
      return { partNumber: partNumber, crc32: chunkCrc32 };
    } catch (error) {
      console.error(`Error uploading chunk ${partNumber}: ${error.message}`);
      throw new Error(
        `Failed to upload chunk ${partNumber}: ${
          error.message || "Upload service error"
        }`
      );
    }
  };

  _finishMultipartUpload = async function (
    baseUrl,
    token,
    tempId,
    uploadId,
    uploadedParts
  ) {
    this.log("Finalizing multipart upload...");
    const finishUrl = `${baseUrl}?uploadmode=part&phase=finish&uploadid=${uploadId}`;
    const finishPayload = uploadedParts
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((part) => `${part.partNumber}:${part.crc32}`)
      .join(",");
    this.debug("Finish Multipart Payload:", finishPayload);
    const payloadBuffer = Buffer.from(finishPayload, "utf-8");
    const finishHeaders = {
      Authorization: token,
      "Content-Type": "text/plain;charset=UTF-8",
      "Content-Length": String(payloadBuffer.length),
      "x-storage-u": tempId,
    };

    try {
      const response = await this._request("post", finishUrl, {
        headers: finishHeaders,
        data: payloadBuffer,
      });
      this.debug(`Finish Multipart Upload Response`, response);

      if (response?.code !== 2000) {
        const errMsg = `Server failed to finalize multipart upload. Code:${
          response?.code ?? "N/A"
        }, Msg:"${response?.message ?? "Unknown error"}"`;
        console.error(errMsg);
        throw new Error(`Failed to finalize multipart upload.`);
      }

      this.log("Multipart upload finalized successfully.");
    } catch (error) {
      console.error(`Error finalizing multipart upload: ${error.message}`);
      throw error;
    }
  };

  createUploadTask = async function (cookie, assetId, type) {
    this.log("Creating Upload Task...");
    const fileType = ["jpg", "jpeg", "png", "webp"].includes(type.toLowerCase())
      ? this.config.FILE_TYPE_IMAGE
      : this.config.FILE_TYPE_VIDEO;
    const fileName = `${Date.now()}_${crypto
      .randomBytes(4)
      .toString("hex")}.${type}`;

    const uploadPayload = {
      vid: assetId,
      tmp_id: this.tempId,
      file_name: fileName,
      file_type: fileType,
      source_path: fileName,
    };

    const url = `${this.config.API_BASE_URL}/lv/v1/upload/create_upload_task`;
    const headers = this._generateHeaders(url, uploadPayload, cookie);

    const response = await this._request("post", url, {
      headers: headers,
      data: uploadPayload,
    });
    this.debug("Create Upload Task Response", response);

    if (response.ret !== "0" || !response.data?.task_id) {
      const apiErrorMessage = `API Error Code: ${response.ret}, Message: ${
        response.msg || "Unknown API error"
      }`;
      console.error(
        `Failed to create upload task. ${apiErrorMessage}`,
        response
      );
      throw new Error(`Failed to register the uploaded file with the service.`);
    }
    this.log(`Upload task created (ID: ${response.data.task_id})`);
    return response.data.task_id;
  };

  poolForUploadTask = async function (cookie, taskId) {
    this.log(`Polling upload task ${taskId} status...`);
    const pollUrl = `${this.config.API_BASE_URL}/lv/v1/upload/get_upload_task`;
    const pollPayload = {
      tmp_id: this.tempId,
      task_id: taskId,
      is_support_webp: 0,
    };

    let attempts = 0;
    const delay = 3000;

    while (true) {
      attempts++;
      this.log(`Polling upload task status (Attempt ${attempts})...`);
      const headers = this._generateHeaders(pollUrl, pollPayload, cookie);

      try {
        const result = await this._request(
          "post",
          pollUrl,
          { headers: headers, data: pollPayload },
          { maxRetries: 1, retryDelay: 1000 }
        );
        this.debug(`Get Upload Task Response (Attempt ${attempts})`, result);

        if (result.ret === "0") {
          if (result.data?.status === 1) {
            this.log("Upload task completed successfully.");
            if (!result.data.image?.source && !result.data.video?.source) {
              console.warn(
                "Upload task result seems complete but is missing the source asset ID.",
                result.data
              );
              throw new Error(
                "Upload task confirmation incomplete (missing source ID)."
              );
            }
            return result.data;
          } else if (result.data?.status === 2) {
            console.error(
              `Upload task ${taskId} failed according to API status.`,
              result.data
            );
            throw new Error(`File processing failed after upload.`);
          } else {
            this.log(
              `Upload task status is pending (API Status: ${
                result.data?.status ?? "unknown"
              }). Waiting...`
            );
          }
        } else {
          this.log(
            `Polling attempt ${attempts} failed. API Error: ${result.ret} - ${
              result.msg || "Unknown API error"
            }. Retrying...`
          );
        }
      } catch (error) {
        console.error(
          `Error during polling attempt ${attempts}: ${error.message}. Retrying...`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    console.error(
      `Upload task (ID: ${taskId}) did not complete within ${attempts} attempts.`
    );
    throw new Error(`Timeout waiting for file processing after upload.`);
  };

  createIntelegence = async function (cookie, slug, payload) {
    const operationName = slug ? "pipeline" : "intelligence";
    this.log(`Creating ${operationName} task (slug: '${slug || "none"}')...`);
    const slugPath = slug ? `${slug.replace(/_$/, "")}_` : "";
    const createUrl = `${this.config.API_BASE_URL}/lv/v1/intelligence/${slugPath}create`;
    const headers = this._generateHeaders(createUrl, payload, cookie);

    const createResponse = await this._request("post", createUrl, {
      headers: headers,
      data: payload,
    });
    this.debug(`Create ${operationName} Task Response`, createResponse);

    if (createResponse.errmsg !== "success" || !createResponse.data) {
      const apiErrorMessage = `API Error Message: ${
        createResponse.errmsg || JSON.stringify(createResponse)
      }`;
      console.error(
        `Failed to create ${operationName} task. ${apiErrorMessage}`,
        createResponse
      );
      throw new Error(
        `Failed to initiate the ${operationName} operation on the service.`
      );
    }

    const taskId = slug
      ? createResponse.data.pipeline_id
      : createResponse.data.task_id;
    if (!taskId) {
      console.error(
        `Could not extract task ID from ${operationName} creation response.`,
        createResponse.data
      );
      throw new Error(
        `Service did not return a valid ID for the ${operationName} task.`
      );
    }

    this.log(`${operationName} task created (ID: ${taskId})`);
    return taskId;
  };

  pollForResult = async function (
    cookie,
    slug,
    taskId,
    maxAttempts = DEFAULT_POLL_ATTEMPTS
  ) {
    const operationName = slug ? "pipeline" : "intelligence";
    this.log(
      `Polling ${operationName} task ${taskId} (slug: '${
        slug || "none"
      }') status...`
    );
    const slugPath = slug ? `${slug.replace(/_$/, "")}_` : "";
    const queryUrl = `${this.config.API_BASE_URL}/lv/v1/intelligence/${slugPath}query`;
    const taskIdKey = slug ? "pipeline_id" : "task_id";
    const statusKey = slug ? "pipeline_status" : "status";
    const queryPayload = { [taskIdKey]: taskId, workspace_id: "" };
    const delay =
      maxAttempts === LONG_POLL_ATTEMPTS
        ? LONG_POLL_INTERVAL_MS
        : DEFAULT_POLL_INTERVAL_MS;

    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts++;
      this.log(
        `Polling ${operationName} task ${taskId} status (Attempt ${attempts}/${maxAttempts})...`
      );
      const headers = this._generateHeaders(queryUrl, queryPayload, cookie);

      try {
        const queryResponse = await this._request(
          "post",
          queryUrl,
          { headers: headers, data: queryPayload },
          { maxRetries: 1, retryDelay: 1000 }
        );
        this.debug(
          `Query ${operationName} Task Response (Attempt ${attempts})`,
          queryResponse
        );

        if (queryResponse.errmsg === "success" && queryResponse.data) {
          const status = queryResponse.data[statusKey];
          const statusTextMap = {
            1: "pending",
            2: "completed",
            3: "failed",
            4: "processing",
          };
          this.log(
            `Task status: ${statusTextMap[status] || `unknown (${status})`}`
          );

          if (status === 2) {
            this.log(`${operationName} task ${taskId} completed successfully.`);
            const resultData = slug
              ? queryResponse.data.pipeline_result
              : queryResponse.data.task_detail ?? queryResponse.data;
            if (!resultData) {
              console.warn(
                "Task completed but result data is missing or empty.",
                queryResponse.data
              );
              throw new Error(
                "Operation completed but returned no result data."
              );
            }
            return resultData;
          } else if (status === 3) {
            console.error(
              `${operationName} task ${taskId} failed. API Response:`,
              queryResponse.data
            );
            throw new Error(`The ${operationName} operation failed.`);
          }
        } else {
          this.log(
            `Polling attempt ${attempts} reported an issue. API Msg: ${
              queryResponse.errmsg || "Unknown API error"
            }. Retrying...`
          );
        }
      } catch (error) {
        console.error(
          `Error during polling ${operationName} task attempt ${attempts}: ${error.message}. Retrying...`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.log(
      `${operationName} task ${taskId} timed out after ${maxAttempts} attempts.`
    );
    return null;
  };

  _downloadAndDecryptVideo = async function (url, key, decryptedOutputPath) {
    const encryptedFilePath = path.join(
      TEMP_DIR,
      `encrypted_${crypto.randomUUID()}.mp4`
    );
    this.log(`Downloading encrypted video to ${encryptedFilePath}`);
    let writer = null;

    try {
      const response = await axios({
        method: "GET",
        url: url,
        responseType: "stream",
      });
      if (response.status !== 200) {
        throw new Error(
          `Failed download encrypted video. Status: ${response.status}`
        );
      }

      writer = fs.createWriteStream(encryptedFilePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", (err) =>
          reject(new Error(`File write error during download: ${err.message}`))
        );
        response.data.on("error", (err) =>
          reject(
            new Error(`Network error during download stream: ${err.message}`)
          )
        );
      });
      writer = null;

      this.log("Encrypted video downloaded.");
      this.log(`Decrypting ${encryptedFilePath} to ${decryptedOutputPath}`);

      await new Promise((resolve, reject) => {
        const ffmpegArgs = [
          "-v",
          "error",
          "-decryption_key",
          key,
          "-i",
          encryptedFilePath,
          "-c",
          "copy",
          "-movflags",
          "+faststart",
          "-y",
          decryptedOutputPath,
        ];
        this.debug("FFmpeg Decryption Args", ffmpegArgs.join(" "));
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);
        let stderrData = "";
        ffmpegProcess.stderr.on(
          "data",
          (data) => (stderrData += data.toString())
        );

        ffmpegProcess.on("close", (code) => {
          console.error(`[CapcutMagic] FFmpeg stderr:\n${stderrData}`);
          if (code === 0) {
            this.log(`Video successfully decrypted to: ${decryptedOutputPath}`);
            resolve();
          } else {
            console.error(
              `FFmpeg decryption failed (code ${code}). Stderr:\n${stderrData}`
            );
            reject(
              new Error(
                `Video decryption failed. Check logs for FFmpeg errors.`
              )
            );
          }
        });
        ffmpegProcess.on("error", (err) => {
          console.error("Failed start FFmpeg decryption:", err);
          reject(new Error(`Failed to start video decryption tool.`));
        });
      });
    } catch (error) {
      console.error(`Error during video download/decryption: ${error.message}`);
      if (writer && !writer.closed) {
        writer.close();
      }
      throw new Error(`Failed to retrieve and decrypt video content.`);
    } finally {
      if (fs.existsSync(encryptedFilePath)) {
        try {
          await fsPromises.unlink(encryptedFilePath);
          this.debug("Cleaned encrypted temp file:", encryptedFilePath);
        } catch (e) {
          console.warn(`Failed delete temp file ${encryptedFilePath}:`, e);
        }
      }
    }
  };

  processVideo = async function (videoBuffer) {
    this.log(`Processing video upscale for buffer input`);
    let decryptedOutputPath = null;
    try {
      if (!Buffer.isBuffer(videoBuffer)) {
        throw new Error("Input must be a valid Buffer");
      }

      const fileType = await fileTypeFromBuffer(videoBuffer);
      if (
        !fileType ||
        !["mp4", "mov", "avi", "mkv", "webm"].includes(fileType.ext)
      ) {
        this.log(
          `Warning: Input video format (${
            fileType?.ext || "unknown"
          }) may not be fully supported.`
        );
      }
      const fileExtension = fileType?.ext || "mp4";

      const tempFileName = `temp_video_${Date.now()}.mp4`;
      const originalMeta = await this._getMetaVideo(videoBuffer, tempFileName);
      this.log(
        `Input video: ${originalMeta.width}x${
          originalMeta.height
        }, Duration: ${originalMeta.duration.toFixed(2)}s`
      );

      const targetWidth = Math.min(originalMeta.width * 2, MAX_VIDEO_WIDTH);
      const targetHeight = Math.min(originalMeta.height * 2, MAX_VIDEO_HEIGHT);
      this.log(`Target upscale size: ${targetWidth}x${targetHeight}`);
      if (targetWidth > MAX_VIDEO_WIDTH || targetHeight > MAX_VIDEO_HEIGHT) {
        console.warn(
          `Target upscale resolution (${targetWidth}x${targetHeight}) exceeds limits (${MAX_VIDEO_WIDTH}x${MAX_VIDEO_HEIGHT}). Result might be capped.`
        );
      }

      const fileSize = videoBuffer.length;
      this.tempId = crypto.randomBytes(6).toString("base64url");

      const cookie = await this.getCookie();
      const credentials = await this.getUploadCredentials(cookie, {
        key_version: "v5",
        biz: this.config.BIZ_WEB_VIDEO,
      });
      const uploadInfo = await this.getUploadAddress(credentials, fileSize, {
        FileType: "video",
      });
      await this.uploadFile(uploadInfo, this.tempId, videoBuffer);
      const assetId = await this.commitUpload(
        credentials,
        uploadInfo.sessionKey
      );

      const uploadTaskId = await this.createUploadTask(
        cookie,
        assetId,
        fileExtension
      );
      const taskResult = await this.poolForUploadTask(cookie, uploadTaskId);
      const sourceAssetId = taskResult?.video?.source;
      if (!sourceAssetId) {
        console.error(
          "Failed get source asset ID from video upload task.",
          taskResult
        );
        throw new Error(
          "Video file registration failed after upload (missing source ID)."
        );
      }
      this.debug("Source Asset ID for video upscale", sourceAssetId);

      const createPayload = {
        asset_id: sourceAssetId,
        platform: 2,
        resource_idc: "sg1",
        smart_tool_type: this.config.TOOL_TYPE_UPSCALE_VIDEO,
        tmp_id: this.tempId,
        params: JSON.stringify({ width: targetWidth, height: targetHeight }),
      };

      const intelligenceTaskId = await this.createIntelegence(
        cookie,
        "",
        createPayload
      );
      const result = await this.pollForResult(
        cookie,
        "",
        intelligenceTaskId,
        LONG_POLL_ATTEMPTS
      );

      if (result === null) {
        throw new Error("Timeout waiting for video upscale result.");
      }

      this.log(`Video upscaling task completed.`);
      this.debug("Upscale Video Result Data", result);

      const playInfo = result[0]?.video?.play_info;
      if (!playInfo?.url || !playInfo?.key) {
        console.error(
          "Upscaled video URL or decryption key missing in result.",
          result
        );
        throw new Error(
          "Upscaling finished, but result data is incomplete (missing URL/key)."
        );
      }

      decryptedOutputPath = path.join(
        TEMP_DIR,
        `decrypted_upscaled_${Date.now()}.${fileExtension}`
      );
      await this._downloadAndDecryptVideo(
        playInfo.url,
        playInfo.key,
        decryptedOutputPath
      );

      let resultBuffer = null;
      try {
        resultBuffer = await fsPromises.readFile(decryptedOutputPath);
        this.log(
          `Read decrypted upscaled video (${(
            resultBuffer.length /
            1024 /
            1024
          ).toFixed(2)} MB) into buffer.`
        );
      } catch (readError) {
        console.error(`Failed read decrypted video file: ${readError.message}`);
        throw new Error(`Failed to read the final processed video file.`);
      }

      if (!resultBuffer)
        throw new Error(
          "Failed to obtain final video buffer after decryption."
        );

      return resultBuffer;
    } catch (error) {
      console.error(
        `[CapcutMagic] Video upscaling process failed: ${error.message}`
      );
      throw new Error(error.message);
    } finally {
      if (decryptedOutputPath && fs.existsSync(decryptedOutputPath)) {
        await fsPromises
          .unlink(decryptedOutputPath)
          .catch((e) =>
            console.warn(
              `[CapcutMagic] Failed delete temp decrypted file ${decryptedOutputPath}:`,
              e
            )
          );
      }
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const capcut = new CapcutMagic();
      const resp = await capcut.processVideo(fs.readFileSync("./video.mp4"));
      await fs.promises.writeFile("resp.mp4", resp);
      console.log("Selesai, simpan ke resp.mp4");
    } catch (e) {
      console.error(e);
    }
  })();
}
export default CapcutMagic;