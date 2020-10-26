import React from "react";
import { AuthTokenModel } from "./AuthTokenModel";
import DependencyContext, { container } from "./DependencyContext";
import { GraphQL } from "./GraphQL";
import { SignInScreen } from "./SignInScreen";

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
