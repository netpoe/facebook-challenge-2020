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
  const authTokenModel = container.get<AuthTokenModel>(AuthTokenModel.type);

  const authLink = new ApolloLink((operation, forward) => {
    const authToken = authTokenModel.authToken;

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
