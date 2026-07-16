import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { loadPortfolio } from "../lib/api";

const DataContext = createContext(null);

const EMPTY = { projects: [], schedules: {}, budgets: {}, punchlists: {}, documents: {}, team: [], teamByProject: {}, alerts: [] };

export function DataProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const portfolio = await loadPortfolio();
      setData(portfolio);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <DataContext.Provider value={{ ...data, loading, error, refresh }}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
