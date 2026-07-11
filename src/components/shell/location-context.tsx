"use client";

import * as React from "react";
import type { LocationFilter } from "@/data";

interface LocationContextValue {
  location: LocationFilter;
  setLocation: (l: LocationFilter) => void;
}

const LocationContext = React.createContext<LocationContextValue>({
  location: "all",
  setLocation: () => {},
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = React.useState<LocationFilter>("all");
  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationFilter() {
  return React.useContext(LocationContext);
}
