import { Container, IJob, Output, Thumbnail } from "@vencode/core";
import { Client, IEncodeOptions } from "Client";

interface Res {
  id: string;
  format?: Container;
  res: string[];
}

export class JobBuilder {
  private client: Client;
  private inputPath: string;
  private outputs: Output[] = [];
  private notifyUrl: string;
  private format: Container;
  private thumbnails: Thumbnail[] = [];
  private resolutions: Res[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  public withInput(url: string) {
    this.inputPath = url;
    return this;
  }

  public addOutput(output: Output) {
    this.outputs.push(output);
    return this;
  }

  public toFormat(format: Container) {
    this.format = format;
    return this;
  }

  public takeThumbnails(thumbnails: Thumbnail[]) {
    this.thumbnails = thumbnails;
    return this;
  }

  public toResolutions(res: string[], format?: Container) {
    const id = (Math.random() + 1).toString(36).substring(7);
    this.resolutions.push({ id, res, format });
    return this;
  }

  public notify(webhookUrl: string) {
    this.notifyUrl = webhookUrl;
    return this;
  }

  public toJSON(): IEncodeOptions {
    this.resolutions.forEach((entry) => {
      for (let i = 0; i < entry.res.length; i++) {
        const resolution = entry.res[i];
        if (i % 2) continue;
        const key = entry.res[i + 1];

        this.addOutput({
          key,
          encode: {
            format: entry.format || this.format || "mp4",
            res: resolution,
          },
        });
      }
    });

    return {
      input: { path: this.inputPath },
      outputs: this.outputs,
      thumbnails: this.thumbnails,
      ...(this.notifyUrl && { notify: { webhookUrl: this.notifyUrl } }),
    };
  }

  public run(): Promise<IJob> {
    return this.client.encode(this.toJSON());
  }
}
