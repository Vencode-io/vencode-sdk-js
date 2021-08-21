import axios, { AxiosInstance } from "axios";

export interface IAccess {
  apiKey: string;
  userId: string;
}

export interface IClientOptions {
  baseUrl?: string;
  access: IAccess;
  notify?: any;
}

export interface IEncodeOptions {}

export class Client {
  private options: IClientOptions;
  private baseUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(options: IClientOptions) {
    this.options = options;
    this.baseUrl = options.baseUrl || "https://api.vencode.io/api";
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "x-api-key": options.access.apiKey,
        "x-user-id": options.access.userId,
      },
    });
  }

  /**
   * Start an encoding job
   * @param options Encoding options
   */
  async encode(options: IEncodeOptions): Promise<any> {
    return this.axiosInstance.post("/jobs", {
      ...options,
      ...(this.options.notify && { notify: this.options.notify }),
    });
  }

  /**
   * Stop an active encoding job
   * @param jobId Job ID of the job to stop
   */
  async stopJob(jobId: string) {
    return this.axiosInstance.post(`/jobs/${jobId}/cancel`);
  }

  /**
   * Retrieve the metadata of a job
   * @param jobId Job ID
   */
  async getJobMetadata(jobId: string) {
    return this.axiosInstance.get(`/jobs/${jobId}`);
  }
}
