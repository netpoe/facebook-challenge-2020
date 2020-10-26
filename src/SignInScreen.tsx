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
