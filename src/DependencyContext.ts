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
