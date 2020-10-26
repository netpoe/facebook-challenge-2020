- **Title**: Updating a client request's `Authorization` header using Observables
- **Author**: Gustavo Ibarra <@netpoe>
- **Level**: Intermediate-Advanced
- **Keywords**: `useContext`, `setContext`, `BehaviorSubject`, `Subscription`, Dependency Injection, `inversify`, `GraphQL`, `@apollo/client`

## Description

Modern applications that send authenticated requests to a server will likely do it with a JSON Web Token string value in the `Authorization` header of the request:

```typescript
// App.tsx

const client = new HttpClient({
  uri,
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
});

return <ServerProvider client={client}>{children}<ServerProvider>
```

The problem is that the token is not always directly available in the component were we instantiate the client.

For example, your application may have a child `SignInScreen.tsx` component to authenticate the user credentials and the server may return a JWT Token upon success:

```typescript
export const SignInScreen: React.FC = () => {
  const onSubmit = async () => {
    try {
      const authToken = await callTheAuthenticationEndpoint(args);

      // how to pass the authToken to the client instance in App.tsx?
    } catch (error) {
      // handle error
    }
  };

  return (
    <>
      <AnInputComponent />

      <Button onClick={onSubmit}></Button>
    </>
  );
};
```

Once the `authToken` is returned from a successful authentication call, **what is a clean, efficient and re-usable way of passing this value to the Client instance?**

> Short answer: _The Observer Pattern_ and _The Dependency Injection Pattern_.

## Pre-requisites

Clone this application with `git clone git@github.com:netpoe/facebook-challenge-2020.git`

This tutorial assumes that you are familiar with Typescript and the basics of HTTP Request headers.

---

In this tutorial we are going to use `@apollo/client` to exemplify our use case.

`@apollo/client` is a widely-used library in React applications to send requests to GraphQL servers.

> Install `@apollo/client` and `graphql` by running this command:
> `yarn add @apollo/client graphql`

Its initialization commonly looks like this:

```typescript
const authLink = new ApolloLink((operation, forward) => {
  const authToken = // <=== get the authToken somehow

  const authHeaders = Boolean(authToken)
    ? {
        Authorization: `Bearer ${authToken}`,
      }
    : {};

  operation.setContext(({ headers = {} }) => ({
    headers: { ...headers, ...authHeaders },
  }));

  return forward(operation);
});

const client = new ApolloClient({
  link: from([authLink]),
  cache,
});

return <ApolloProvider client={client}>{children}</ApolloProvider>;
```

> Read more about `ApolloLink` [here](https://www.apollographql.com/docs/link/overview/#context).

So, the key question is: **how do we get the `authToken` value from an instance shared between the app components?**

## Project structure

The files that we are going to work with are:

```
./src
  App.tsx
  AuthTokenModel.ts
  DependencyContext.ts
  GraphQL.tsx
  SignInScreen.tsx
```

### The App.tsx component

Let's look at our `App.tsx` first:

```typescript
// App.tsx

export const App: React.FC = () => {
  return (
    <DependencyContext.Provider value={container}>
      <GraphQL>
        <SignInScreen />
      </GraphQL>
    </DependencyContext.Provider>
  );
};

export default App;
```

The `DependencyContext.Provider` component is responsible for providing shared dependencies across our component chain.

The `GraphQL` component has the GraphQL `client` logic and the `SignInScreen` component is a simple screen that calls a server endpoint and returns a JSON Web Token upon success.

Of course, complex applications may have a navigator component to organize the screen components with routes or screen stacks, but for the simplicity of this tutorial, we only have one child screen.

### The Dependency Context

React has a useful hook: [`useContext`](https://reactjs.org/docs/hooks-reference.html#usecontext) that is used to provide a constant value across the components chain.

This value is passed as a prop in our root component, in this case `container`:

```typescript
// App.tsx
<DependencyContext.Provider value={container}>
```

Whenever we need our constant value `container`, the `useContext` hook can bring some help.

For example, let's look at the whole `GraphQL.tsx` to understand what `container` means and how will we use it:

```typescript
// GraphQL.tsx

import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  from,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import React from "react";
import { AuthTokenModel } from "./AuthTokenModel";
import { DependencyContext } from "./DependencyContext";

export const GraphQL: React.FC = ({ children }) => {
  const container = React.useContext(DependencyContext);
  const authTokenModel = container.get<AuthTokenModel>(AuthTokenModel.type); // HERE, get the shared dependency as a singleton

  const authLink = new ApolloLink((operation, forward) => {
    const authToken = authTokenModel.authToken; // HERE, get the authToken property value, if any

    const authHeaders = Boolean(authToken)
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : {};

    operation.setContext(({ headers = {} }) => ({
      headers: { ...headers, ...authHeaders },
    }));

    return forward(operation);
  });

  const httpLink = new HttpLink({
    uri: "http://localhost:80/a-graphql-server-uri",
  });

  const cache = new InMemoryCache();

  const client = new ApolloClient({
    link: from([authLink, httpLink]),
    cache,
  });

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export default GraphQL;
```

Now let's see how we declare the dependencies `container` with `React.createContext`:

```typescript
// DependencyContext.ts

import { Container } from "inversify";
import React from "react";
import { AuthTokenModel } from "./AuthTokenModel";

export const container = new Container();

container
  .bind<AuthTokenModel>(AuthTokenModel.type)
  .to(AuthTokenModel)
  .inSingletonScope();

export const DependencyContext = React.createContext(container);

export default DependencyContext;
```

> **A note about `inversify`**
>
> _[`inversify`](https://github.com/inversify/InversifyJS) is a powerful and lightweight inversion of control container for JavaScript & Node.js apps powered by TypeScript._
>
> One of its primary functionalities is the creation of `Container`s, which you can think of as wrappers of your dependencies that you can get whenever you need them in your application.
>
> Install `inversify` by running this command:
> `yarn add inversify reflect-metadata`
>
> **IMPORTANT**
> For your app to compile succesfully with `inversify`, you'll need to add these options to your `tsconfig.json` `compilerOptions`:
> `"experimentalDecorators": true,` `"emitDecoratorMetadata": true`

These lines bind the shared `AuthTokenModel` class to the container as a singleton:

```typescript
// DependencyContext.ts

const container = new Container();

container
  .bind<AuthTokenModel>(AuthTokenModel.type)
  .to(AuthTokenModel)
  .inSingletonScope();
```

And having exported the `DependencyContext` allows us to use it as a parent component in `App.tsx`:

```typescript
// App.tsx

import React from "react";
import DependencyContext, { container } from "./DependencyContext";
import { GraphQL } from "./GraphQL";
import { SignInScreen } from "./SignInScreen";

export const App: React.FC = () => {
  return (
    <DependencyContext.Provider value={container}>
      <GraphQL>
        <SignInScreen />
      </GraphQL>
    </DependencyContext.Provider>
  );
};

export default App;
```

### Getting the token and passing it to the GraphQL client headers

All right! Let's call the server endpoint to get the `authToken` needed in `GraphQL.tsx` from the `SignInScreen.tsx` component:

```typescript
// SignInScreen.tsx

import React from "react";
import { AuthTokenModel } from "./AuthTokenModel";
import DependencyContext from "./DependencyContext";

export const SignInScreen: React.FC = ({ children }) => {
  const container = React.useContext(DependencyContext);
  const authTokenModel = container.get<AuthTokenModel>(AuthTokenModel.type);

  const { execute } = authTokenModel.useSignInQuery();

  const onSubmit = async () => {
    try {
      await execute({ username: "username", password: "password" });
    } catch (error) {
      // handle error
    }
  };

  return (
    <div>
      <h1>Sign In Screen</h1>
      <button onClick={onSubmit}>Sign In</button>
    </div>
  );
};
```

As you may have noticed, we abstracted the logic of calling the server endpoint to the `AuthTokenModel`:

```typescript
// SignInScreen.tsx
//...
const { execute } = authTokenModel.useSignInQuery();
```

This abstraction becomes really handy in large applications to avoid having all the business logic inside the component. The `DependencyContext` helped us get the `AuthTokenModel` with a few lines and the component feels very light, isn't it?

So how does `execute` look like inside the `AuthTokenModel` dependency?

```typescript
// AuthTokenModel.ts

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
```

> **A note about `BehaviorSubject`**
> The Observer Pattern is nothing new, it is agnostic to any programming language and as it name implies, it allows parts of your system to "observe" the changes of a certain value.
>
> For this tutorial, we are importing BehaviorSubject from the `rxjs` library. Dive further into its documentation [here](https://www.learnrxjs.io/learn-rxjs/subjects/behaviorsubject).
>
> Install `rxjs` by runnning this command:
> `yarn add rxjs`

Of course, the `useSignInQuery` is a dummy method that should call your server endpoint.

This method returns an object with the `execute` function and assumes that we've got a successful response from the server with the `authToken`.

For the `subscribe` method to work, we need to call `next`, a method of the `observable` instance:

```typescript
// AuthTokenModel.ts
// ..

return {
  execute: async (credentials) => {
    this.observable.next(await callServerSignInEndpoint());
  },
};
```

### Subscribing to `authToken` whenever it changes

Calling `next` will make sure to "notify" the subscription about the value returned from the `callServerSignInEndpoint`:

```typescript
// AuthTokenModel.ts
// ...

subscribe(): Subscription {
    return this.observable.subscribe((token) => {
        console.log(token);
        this.authToken = token;
    });
}
```

`this.observable.subscribe` accepts a function as an argument, this function gets called whenever `next` is called. In this case, we update the value of `this.authToken` with the value from `callServerSignInEndpoint`.

Now, let's call the `subscribe` method from the `App.tsx` component to be aware of the `BehaviorSubject` which holds the `string` value of `this.authToken`:

```typescript
// App.tsx
// ...

export const App: React.FC = () => {
  const authTokenModel = container.get<AuthTokenModel>(AuthTokenModel.type);

  React.useEffect(() => {
    const subscription = authTokenModel.subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <DependencyContext.Provider value={container}>
      <GraphQL>
        <SignInScreen />
      </GraphQL>
    </DependencyContext.Provider>
  );
};

export default App;
```

We are using the `useEffect` hook here with a _cleanup_ function, because subscriptions can cause memory leaks if you forget to unsubscribe from them:

```typescript
// App.tsx
// ...
React.useEffect(() => {
  const subscription = authTokenModel.subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

[According to the docs](https://reactjs.org/docs/hooks-effect.html#example-using-hooks-1), the first argument of `useEffect` which is a function, can return another function that will be called when the component unmounts.

### Conclusion

Whenever you call a new server endpoint that needs an `Authorization` header, you'll have a fresh `authToken` attached to the request.

This pattern works for `GraphQL` clients and any other HTTP clients alike.

If you got this far, you've learned how to:

- ✅ Abstract logic from your components into a helper model object or class
- ✅ Inject dependencies using `inversify` containers and React's `useContext` hook
- ✅ Observe changes of a certain value across multiple dependencies and components
