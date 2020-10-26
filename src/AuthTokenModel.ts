import { injectable } from "inversify";
import "reflect-metadata";
import { BehaviorSubject, Subscription } from "rxjs";

type SignInQueryInput = {
  username: string;
  password: string;
};

@injectable()
export class AuthTokenModel {
  public static type: string = "AuthTokenModel";
  public authToken: string = "";
  private observable: BehaviorSubject<string> = new BehaviorSubject<string>(
    this.authToken
  );

  subscribe(): Subscription {
    return this.observable.subscribe((token) => {
      console.log(token);
      this.authToken = token;
    });
  }

  useSignInQuery(): {
    execute: (credentials: SignInQueryInput) => Promise<void>;
  } {
    const callServerSignInEndpoint = () =>
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InNlcnZpY2UiOiJkZWZhdWx0QGRlZmF1bHQiLCJyb2xlcyI6WyJhZG1pbiJdfSwiaWF0IjoxNjAzMjUzNzY4LCJleHAiOjE2MDM4NTg1Njh9.zrAFbQGhDfy7IHvM4dhqmL6RsOXaglbUVg93RDDQ9c4";

    return {
      execute: async (credentials) => {
        this.observable.next(await callServerSignInEndpoint());
      },
    };
  }
}
