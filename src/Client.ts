import {
  Credentials,
  ICostEstimate,
  IJob,
  IJobMetadata,
  Input,
  IUser,
  Notify,
  Output,
  Thumbnail,
} from "@vencode/core";
import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { Document } from "mongoose";
import EventSource from "eventsource";

export interface IAccess {
  /**
   * Your API Key
   */
  apiKey: string;
  /**
   * Your User ID
   */
  userId: string;
}

export interface IClientOptions {
  /**
   * Base API Url
   * @default https://api.vencode.io/api
   */
  baseUrl?: string;
  /**
   * Your access credentials
   */
  access: IAccess;
  /**
   * Notify webhook settings
   */
  notify?: Notify;
  /**
   * Global Cloud Credentials
   */
  credentials?: Credentials;
  /**
   * Debug listener events
   * @default false
   */
  debug?: boolean;
  /**
   * Max retries when the connection to the real-time listener drops
   * @default 15
   */
  maxListenRetry?: number;
}

export interface IEncodeOptions {
  /**
   * Video input settings
   */
  input: Input;
  /**
   * Array of @type {Output}
   */
  outputs: Output[];
  /**
   * Notify webhook settings
   */
  notify?: Notify;
  /**
   * Array of @type {Thumbnail}
   */
  thumbnails: Thumbnail[];
  /**
   * Cloud Credentials
   */
  credentials?: Credentials;
}

export type IListenCallback = (event: any) => void;

const returnPromise = (promise: Promise<any>): Promise<any> => {
  return new Promise((resolve, reject) => {
    promise
      .then((data: AxiosResponse) => resolve(data.data))
      .catch((error: AxiosError) =>
        reject(
          error.response ? error.response.data : { message: error.message }
        )
      );
  });
};

class EventListener {
  private id: string;
  private source: EventSource;

  constructor(id: string, source: EventSource) {
    this.id = id;
    this.source = source;
  }

  getId() {
    return this.id;
  }

  getSource() {
    return this.source;
  }
}

export class Client {
  private options: IClientOptions;
  private baseUrl: string;
  private axiosInstance: AxiosInstance;
  private eventSources: EventListener[] = [];
  private listenRetries = 0;

  constructor(options: IClientOptions) {
    this.options = options;
    this.baseUrl = options.baseUrl || `https://api.vencode.io/api`;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "x-api-key": options.access.apiKey,
        "x-user-id": options.access.userId,
        "User-Agent": `vencode-sdk-js/${process.env.npm_package_version}`,
      },
    });
  }

  debug(msg: string) {
    if (this.options.debug) {
      console.info(`[DEBUG] ${msg}`);
    }
  }

  /**
   * Get the current logged in user account
   */
  async getUserAccount(): Promise<Omit<IUser, keyof Omit<Document, "id">>> {
    return returnPromise(this.axiosInstance.get("/users/me/auth"));
  }

  /**
   * Start an encoding job
   * @param options Encoding options
   */
  async encode(
    options: IEncodeOptions
  ): Promise<Omit<IJob, keyof Omit<Document, "id">>> {
    return returnPromise(
      this.axiosInstance.post("/jobs", {
        ...options,
        ...(this.options.notify && { notify: this.options.notify }),
        ...(this.options.credentials && {
          credentials: this.options.credentials,
        }),
      })
    );
  }

  /**
   * Stop an active encoding job
   * @param jobId Job ID of the job to stop
   */
  async stopJob(jobId: string): Promise<any> {
    return returnPromise(this.axiosInstance.post(`/jobs/${jobId}/cancel`));
  }

  /**
   * Retrieve the metadata of a job
   * @param jobId Job ID
   */
  async getJobMetadata(jobId: string): Promise<IJobMetadata> {
    return returnPromise(this.axiosInstance.get(`/jobs/${jobId}`));
  }

  /**
   * Get the estimated cost for an in-progress or complete job
   * @param jobId Job ID
   */
  async getJobEstimatedCost(jobId: string): Promise<ICostEstimate> {
    return returnPromise(this.axiosInstance.get(`/jobs/${jobId}/cost`));
  }

  /**
   * Listen, in real-time, to progress updates on a job
   * @param jobId Job ID
   * @param callback Callback function
   */
  listen(jobId: string, callback: IListenCallback) {
    this.internalListen(jobId, callback);
  }

  /**
   * Listen, in real-time, to progress updates on all jobs in your account
   * @param callback Callback function
   */
  listenAll(callback: IListenCallback) {
    this.internalListen("ALL", callback);
  }

  /**
   * Stop listening to events by an ID
   * @param id ID of the job or ALL
   */
  stopListening(id: string) {
    const foundListener = this.eventSources.find((list) => list.getId() === id);
    if (foundListener) {
      this.eventSources.splice(
        this.eventSources.findIndex((t) => t.getId() === id)
      );
      foundListener.getSource().close();
    }
  }

  /**
   *
   * @returns @type {boolean}
   */
  private isListeningToAll() {
    return this.eventSources.some(
      (list) => list.getId().toLowerCase() === "all"
    );
  }

  /**
   * Private internal method to listen to events
   * @param id Job ID or "ALL"
   * @param callback Event Callback
   */
  private internalListen(id: string, callback: IListenCallback) {
    if (id.toLowerCase() === "all" && this.isListeningToAll()) return;

    const events = new EventSource(
      `${this.baseUrl}/events?${
        id === "ALL" ? "all=true" : `jid=${id}`
      }&creds=${encodeURIComponent(
        JSON.stringify({
          key: this.options.access.apiKey,
          id: this.options.access.userId,
        })
      )}`
    );

    events.onopen = () => {
      this.listenRetries = 0;
      this.debug(`Listening to events for job '${id}'`);
    };

    events.onerror = (er) => {
      const str = JSON.stringify(er);

      if (str.includes("connect ECONNREFUSED") || str.includes("No Found"))
        this.listenRetries++;

      if (this.listenRetries >= (this.options.maxListenRetry || 15)) {
        events.close();
        this.debug("Retried too many times, closing connection");
        return;
      }

      this.debug(`Error listening to events for job '${id}' - ${str}`);
    };

    events.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        callback(data);
      } catch (err) {
        this.debug(`Error processing message event for '${id}'`);
      }
    };

    this.eventSources.push(new EventListener(id, events));
  }
}
