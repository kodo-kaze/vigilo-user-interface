"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface Coordinates {
  lat: number;
  lon: number;
  accuracy?: number;
}

export interface StationSectorPreset {
  id: string;
  name: string;
  zone: string;
  coords: Coordinates;
  description: string;
}

export const STATION_SECTOR_PRESETS: StationSectorPreset[] = [
  {
    id: "concourse-main",
    name: "Main Concourse",
    zone: "Station Concourse • Central Hub",
    coords: { lat: 22.883118, lon: 88.762081, accuracy: 5 },
    description: "Main concourse turnstiles & central ticketing hall (ph-1)",
  },
  {
    id: "platform-1-escalator",
    name: "Platform 1 Escalator",
    zone: "Platform 1 • Vertical Transit",
    coords: { lat: 22.883500, lon: 88.762500, accuracy: 4 },
    description: "Escalator mezzanine to Platform 1 boarding",
  },
  {
    id: "platform-2-hall",
    name: "Platform 2 Boarding",
    zone: "Platform Hub • Track Sector 3",
    coords: { lat: 22.884100, lon: 88.763000, accuracy: 6 },
    description: "Track edge sector 3 boarding area",
  },
  {
    id: "sealdah-central",
    name: "Central Terminal Entry",
    zone: "North Terminal • Main Gate",
    coords: { lat: 22.567500, lon: 88.371200, accuracy: 8 },
    description: "Station north pedestrian screening gate",
  },
];

export type LocationPermissionState =
  | "prompt"
  | "requesting"
  | "granted"
  | "denied"
  | "simulated"
  | "unsupported";

export function usePassengerLocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<StationSectorPreset | null>(null);

  const watchIdRef = useRef<number | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setPermissionState("unsupported");
      setError("Geolocation is not supported by your browser");
      return;
    }

    setPermissionState("requesting");
    setError(null);
    setActivePreset(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords: Coordinates = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCoords(newCoords);
        setPermissionState("granted");
        setError(null);

        // Start live watching for movement
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            setCoords({
              lat: watchPos.coords.latitude,
              lon: watchPos.coords.longitude,
              accuracy: watchPos.coords.accuracy,
            });
          },
          (err) => {
            console.warn("[Geolocation Watch]:", err.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000,
          }
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
          setError("Location access denied. Pick a station zone to locate nearest camera.");
        } else {
          setPermissionState("prompt");
          setError(err.message || "Unable to acquire current location");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Check initial browser permission status if supported
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setPermissionState("unsupported");
      return;
    }

    if ("permissions" in navigator && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "granted") {
            setPermissionState("granted");
            requestLocation();
          } else if (result.state === "denied") {
            setPermissionState("denied");
          } else {
            setPermissionState("prompt");
            // Auto-request once on mount so user gets native prompt immediately
            requestLocation();
          }

          result.onchange = () => {
            if (result.state === "granted") {
              setPermissionState("granted");
              requestLocation();
            } else if (result.state === "denied") {
              setPermissionState("denied");
            } else {
              setPermissionState("prompt");
            }
          };
        })
        .catch(() => {
          requestLocation();
        });
    } else {
      requestLocation();
    }

    return () => {
      if (watchIdRef.current !== null && typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestLocation]);

  const selectPreset = useCallback((preset: StationSectorPreset) => {
    if (watchIdRef.current !== null && typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActivePreset(preset);
    setCoords(preset.coords);
    setPermissionState("simulated");
    setError(null);
  }, []);

  const resetLocation = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActivePreset(null);
    setCoords(null);
    setPermissionState("prompt");
    setError(null);
  }, []);

  return {
    coords,
    permissionState,
    error,
    activePreset,
    requestLocation,
    selectPreset,
    resetLocation,
    presets: STATION_SECTOR_PRESETS,
  };
}
