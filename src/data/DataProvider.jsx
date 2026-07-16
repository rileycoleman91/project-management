import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from "react";
import { loadPortfolio } from "../lib/api";

const DataContext = createContext(null);

const EMPTY = { projects: [], schedules: {}, budgets: {}, punchlists: {}, documents: {}, team: [], teamByProject: {}, alerts: [], rooms: {}, materials: {}, materialsByRoom: {} };

export function DataProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  // Only the very first load should replace the whole screen with a loading
  // state. Every later refresh() call (after any add/edit/delete) updates
  // data in place — flipping `loading` back to true on every save would
  // unmount/remount whatever view is on screen (e.g. ProjectDetail), losing
  // the selected tab and any open modal.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoadedOnce.current) setLoading(true);
    try {
      const portfolio = await loadPortfolio();
      setData(portfolio);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      hasLoadedOnce.current = true;
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
