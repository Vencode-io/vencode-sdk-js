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

export interface IAccess {
  apiKey: string;
  userId: string;
}

export interface IClientOptions {
  baseUrl?: string;
  access: IAccess;
  notify?: Notify;
  credentials?: Credentials;
}

export interface IEncodeOptions {
  input: Input;
  outputs: Output[];
  notify?: Notify;
  thumbnails: Thumbnail[];
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

export class Client {
  private options: IClientOptions;
  private baseUrl: string;
  private axiosInstance: AxiosInstance;

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
  async listen(jobId: string, callback: IListenCallback) {}
}
