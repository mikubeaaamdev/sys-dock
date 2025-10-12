import React, { createContext, useContext, useState } from "react";

type AlertContextType = {
  alert: string | null;
  setAlert: (msg: string | null) => void;
};

export const AlertContext = createContext<AlertContextType>({
  alert: null,
  setAlert: () => {},
});

export const useAlert = () => useContext(AlertContext);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<string | null>(null);
  return (
    <AlertContext.Provider value={{ alert, setAlert }}>
      {children}
    </AlertContext.Provider>
  );
};