import React, { createContext, useContext, useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';

type AlertContextType = {
  alert: string | null;
  setAlert: (msg: string | null) => void;
  enabled: boolean;
  setEnabled: (val: boolean) => void;
};

export const AlertContext = createContext<AlertContextType>({
  alert: null,
  setAlert: () => {},
  enabled: true,
  setEnabled: () => {},
});

export const useAlert = () => useContext(AlertContext);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem("alertsEnabled");
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem("alertsEnabled", String(enabled));
  }, [enabled]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (enabled) {
      interval = setInterval(async () => {
        try {
          const alerts: string[] = await invoke("check_alerts", {
            cpuThreshold: 85,
            ramThreshold: 85,
            diskThreshold: 90,
          });
          setAlert(alerts.length > 0 ? alerts[0] : null);
        } catch {
          setAlert(null);
        }
      }, 5000);
    } else {
      setAlert(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [enabled]);

  return (
    <AlertContext.Provider value={{ alert, setAlert, enabled, setEnabled }}>
      {children}
    </AlertContext.Provider>
  );
};